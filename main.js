const express = require('express');
const os = require('os');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/status', (req, res) => {
	res.json({ ok: true, hostname: os.hostname() });
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
