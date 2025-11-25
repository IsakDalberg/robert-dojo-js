const express = require('express');
const os = require('os');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// In-memory player state
const players = new Map();
const teams = {
	blue: { name: 'Blue', flagsCaptured: 0, color: '#0066ff' },
	red: { name: 'Red', flagsCaptured: 0, color: '#ff3333' }
};

// Player numbering starts at 4 as requested
let nextPlayerNumber = 4;

// Track who currently holds the flag (playerId) or null
let flagHolder = null;

// Event log (in-memory)
const events = [];
function logEvent(message) {
	const now = new Date();
	const ts = now.toISOString();
	const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
	const entry = { ts, message, displayTs: dateStr };
	events.push(entry);
	// keep log bounded
	if (events.length > 2000) events.shift();
	console.log(`[EVENT] ${dateStr} - ${message}`);
}

// Get client IP from request
function getClientIP(req) {
	return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
		req.socket.remoteAddress ||
		'unknown';
}

// Auto-assign team (alternating)
function assignTeam() {
	const bluePlayers = Array.from(players.values()).filter(p => p.team === 'blue').length;
	const redPlayers = Array.from(players.values()).filter(p => p.team === 'red').length;
	return bluePlayers <= redPlayers ? 'blue' : 'red';
}

// GET /api/players - list all players and team scores
app.get('/api/players', (req, res) => {
	const clientIp = getClientIP(req);
	const playerList = Array.from(players.values()).map(p => ({
		id: p.id,
		number: p.number,
		name: p.name,
		ip: p.ip,
		team: p.team,
		kills: p.kills,
		health: p.health,
		joinedAt: p.joinedAt
	}));
	// Find player by client IP
	const myPlayer = Array.from(players.values()).find(p => p.ip === clientIp) || null;
	res.json({ players: playerList, teams, flagHolder, myPlayerId: myPlayer?.id || null });
});

// GET /api/events - return event log
app.get('/api/events', (req, res) => {
	res.json({ events });
});

// POST /api/player/join - register a new player or rejoin
app.post('/api/player/join', (req, res) => {
	// Join using a numeric code between 0-99
	const { code } = req.body;
	const ip = getClientIP(req);

	if (typeof code !== 'number' || code < 0 || code > 99 || !Number.isInteger(code)) {
		return res.status(400).json({ error: 'You must join with an integer `code` between 0 and 99' });
	}

	// Ensure code is unique
	const codeExists = Array.from(players.values()).some(p => p.code === code);
	if (codeExists) {
		return res.status(409).json({ error: 'This code is already in use. Pick another code.' });
	}

	// Prevent same IP from joining twice
	const ipExists = Array.from(players.values()).some(p => p.ip === ip);
	if (ipExists) {
		return res.status(409).json({ error: 'A player from this IP is already in the game. Leave first to rejoin.' });
	}

	const team = assignTeam();
	const playerId = `${ip}-${Date.now()}`;
	const player = {
		id: playerId,
		number: nextPlayerNumber++,
		code,
		name: `Player ${code}`,
		ip,
		team,
		kills: 0,
		health: 100,
		joinedAt: new Date().toISOString()
	};

	players.set(playerId, player);
	logEvent(`Join: ${player.name} (code ${player.code}) joined on ${player.team} from ${player.ip}`);
	res.json({ playerId, player });
});

// POST /api/player/update - update a player's stats
app.post('/api/player/update', (req, res) => {
	const { playerId, kills, health } = req.body;
	
	if (!playerId || !players.has(playerId)) {
		return res.status(404).json({ error: 'Player not found' });
	}
	
	const player = players.get(playerId);
	if (typeof kills === 'number') player.kills = Math.max(0, kills);
	if (typeof health === 'number') player.health = Math.max(0, Math.min(100, health));
	
	res.json({ player });
});

// DELETE /api/player/:id - remove a player
app.delete('/api/player/:id', (req, res) => {
	const { id } = req.params;
	
	if (!players.has(id)) {
		return res.status(404).json({ error: 'Player not found' });
	}
	// if the player held the flag, clear it
	const p = players.get(id);
	if (flagHolder === id) flagHolder = null;
	players.delete(id);
	logEvent(`Leave: ${p.name} (code ${p.code}) removed from the game`);
	res.json({ message: 'Player removed' });
});

// POST /api/team/flag - increment team flag captures
// POST /api/flag/capture - capture flag by player
app.post('/api/flag/capture', (req, res) => {
	const { playerId } = req.body;
	if (!playerId || !players.has(playerId)) {
		return res.status(404).json({ error: 'Player not found' });
	}
	const player = players.get(playerId);
	const teamKey = player.team;
	if (!teams[teamKey]) return res.status(400).json({ error: 'Player has invalid team' });
	// Only allow capture if the player currently holds the flag
	if (flagHolder !== playerId) {
		return res.status(400).json({ error: 'Player does not currently hold the flag' });
	}

	teams[teamKey].flagsCaptured++;
	// Clear flag holder once captured (delivered)
	flagHolder = null;
	logEvent(`Capture: ${player.name} (code ${player.code}) captured the flag for ${teams[teamKey].name}`);
	res.json({ team: teamKey, flagsCaptured: teams[teamKey].flagsCaptured, flagHolder });
});

// POST /api/flag/obtain - player obtains (picks up or steals) the flag
app.post('/api/flag/obtain', (req, res) => {
	const { playerId } = req.body;
	if (!playerId || !players.has(playerId)) {
		return res.status(404).json({ error: 'Player not found' });
	}

	const previousHolder = flagHolder;
	flagHolder = playerId;
	const p = players.get(playerId);
	logEvent(`Obtain: ${p.name} (code ${p.code}) obtained the flag (previous: ${previousHolder || 'none'})`);
	res.json({ obtainedBy: playerId, previousHolder, flagHolder });
});

// POST /api/player/attack - attacker attacks a target
app.post('/api/player/attack', (req, res) => {
	const { attackerId, targetId, damage } = req.body;
	const dmg = typeof damage === 'number' ? Math.max(0, damage) : 10;

	if (!attackerId || !players.has(attackerId)) return res.status(404).json({ error: 'Attacker not found' });
	if (!targetId || !players.has(targetId)) return res.status(404).json({ error: 'Target not found' });

	// Prevent self-attack
	if (attackerId === targetId) return res.status(400).json({ error: 'Cannot attack yourself' });

	const attacker = players.get(attackerId);
	const target = players.get(targetId);

	// Can't attack same team (optional rule) — allow for now, but could be checked
	target.health = Math.max(0, target.health - dmg);
	let killed = false;
	if (target.health === 0) {
		// attacker gets a kill
		attacker.kills = (attacker.kills || 0) + 1;
		killed = true;
		// if target had the flag, drop it
		if (flagHolder === targetId) flagHolder = null;
		// respawn: reset target health to full
		target.health = 100;
		logEvent(`Respawn: ${target.name} (code ${target.code}) respawned with full health`);
	}
	// Log event
	logEvent(`Attack: ${attacker.name} (code ${attacker.code}) attacked ${target.name} (code ${target.code}) for ${dmg} damage${killed ? ' and killed them' : ''}`);
	if (killed) logEvent(`Kill: ${attacker.name} (code ${attacker.code}) killed ${target.name} (code ${target.code})`);

	res.json({ attacker, target, killed, flagHolder });
	});

	// POST /api/player/heal - heal a target (amount optional)
	app.post('/api/player/heal', (req, res) => {
		const { healerId, targetId, amount } = req.body;
		const amt = typeof amount === 'number' ? Math.max(0, amount) : 20;

		if (!targetId || !players.has(targetId)) return res.status(404).json({ error: 'Target not found' });
		if (healerId && !players.has(healerId)) return res.status(404).json({ error: 'Healer not found' });

		const target = players.get(targetId);
		target.health = Math.max(0, Math.min(100, target.health + amt));
		logEvent(`Heal: ${healerId ? players.get(healerId).name : 'System'} healed ${target.name} (code ${target.code}) by ${amt}`);
		res.json({ target });
	});

	// POST /api/player/changeTeam - change a player's team
	app.post('/api/player/changeTeam', (req, res) => {
		const { playerId, team } = req.body;
		if (!playerId || !players.has(playerId)) return res.status(404).json({ error: 'Player not found' });
		if (!team || !teams[team]) return res.status(400).json({ error: 'Invalid team' });

		const p = players.get(playerId);
		p.team = team;
		logEvent(`TeamChange: ${p.name} (code ${p.code}) moved to ${teams[team].name}`);
		res.json({ player: p });
	});

// POST /api/player/leave - remove a player (legacy endpoint)
app.post('/api/player/leave', (req, res) => {
	const { playerId } = req.body;
	
	if (!playerId || !players.has(playerId)) {
		return res.status(404).json({ error: 'Player not found' });
	}
	
	players.delete(playerId);
	res.json({ message: 'Player removed' });
});

app.get('/status', (req, res) => {
	res.json({ ok: true, hostname: os.hostname() });
});

// POST /api/restart - clear all players, teams, flags, events
app.post('/api/restart', (req, res) => {
	players.clear();
	teams.blue.flagsCaptured = 0;
	teams.red.flagsCaptured = 0;
	flagHolder = null;
	events.length = 0;
	nextPlayerNumber = 4;
	logEvent('Match restarted');
	res.json({ message: 'Match restarted successfully', players: [], teams, flagHolder: null });
});

function getLocalIPs() {
	const nets = os.networkInterfaces();
	const results = [];
	for (const name of Object.keys(nets)) {
		for (const net of nets[name]) {
			// skip over non-ipv4 and internal (i.e. 127.0.0.1) addresses
			if (net.family === 'IPv4' && !net.internal) {
				results.push(net.address);
			}
		}
	}
	return results;
}

app.listen(port, '0.0.0.0', () => {
	const ips = getLocalIPs();
	console.log(`Server listening on http://0.0.0.0:${port}`);
	if (ips.length) {
		console.log('You can open the site from another device on the same network at:');
		ips.forEach(ip => console.log(`  http://${ip}:${port}`));
	} else {
		console.log('No non-local IP found. If you want to access from other devices, ensure this machine is on the network.');
	}
});
