
# R.O.B.E.R.T Dojo - NODE JS fork
Welcome to the **R.O.B.E.R.T Dojo**!  
The Dojo is a training ground for tackling various challenges and games, guided by **R.O.B.E.R.T.** (Robotic Overlord Bent on Enslaving and Ruling Technology). Test your skills, compete in challenges, and explore new ways to interact with R.O.B.E.R.T.

---

## Overview
R.O.B.E.R.T Dojo is a modular server project designed to host different games and challenges. Currently, the only server available is the **Tank Game**, a form of FPS game where we use the USB camera of the Raspberry Pi to aim and shoot, and the BuildHAT’s LEGO motors to move.

**Future Plans:**  
As more game servers are added, we may refactor the project to include a Central Controller API. This controller would unify the servers under a single entry point, simplifying user interactions and enabling shared functionality like session management and progress tracking.

---

## Structure

### Current Folder Structure

```
/robert-dojo/
│
├── /servers/               # All game servers organized by name
│   ├── /tank-game/         # Folder for the Tank Game server
│   │   ├── app.py          # Main Flask app for Tank Game
│   │   ├── requirements.txt # Dependencies for Tank Game
│   │   └── README.md       # Specific documentation for this server
│
├── /common/                # Shared resources across all servers (optional for now)
│   ├── utils.py            # Utility functions
│   └── config.py           # Global configuration
│
├── README.md               # Main project README
├── LICENSE                 # GPL License file
└── requirements.txt        # Global dependencies (optional)
```

---

## Built With

### Backend
- **Python** – Core language for the Tank Game server.
- **Flask** – API framework used for building the Tank Game server.
- **SQLite/MySQL** – Database for storing game-specific data if needed.

### Frontend
- **HTML/CSS/JavaScript** – For any web-based interfaces that interact with the Tank Game server.

---

## Setup

### Prerequisites
- Raspberry Pi with Raspberry Pi OS (if running on Pi)
- USB camera and BuildHAT with LEGO motors
- Python 3.x and required packages (see `requirements.txt` in the Tank Game server folder)

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/r-/robert-dojo.git
   cd robert-dojo
   ```

2. **Install Dependencies**:
   Navigate to the `tank-game` server folder and install Python dependencies:
   ```bash
   cd servers/tank-game
   pip install -r requirements.txt
   ```

3. **Run the Server**:
   Start the Flask app for the Tank Game:
   ```bash
   python app.py
   ```
   By default, Flask servers run on `localhost:5000`. Configure it to run on a specific port if needed. The Tank game run on port 5001

---

## Usage

1. Access the Tank Game server directly by navigating to its URL (e.g., `http://localhost:5000` or your configured port like 5001 etc.).

2. Follow the game instructions in the Tank Game README (`servers/tank-game/README.md`).

---

## Contributing
Contributions are welcome! To add a new game server, create a new folder under `/servers/` and follow the Flask API template. Submit a pull request when ready.

## Related Projects
- [R.O.B.E.R.T Control Dashboard](https://github.com/r-/robert-control) – A PHP-based interface for monitoring and controlling R.O.B.E.R.T.

## License
This project is licensed under the GNU General Public License (GPL). See the `LICENSE` file for more details.

---

## Node.js Quickstart (Serve a site on your LAN)

 - **Install dependencies:**

    ```powershell
    npm install
    ```

 - **Start the server:**

    ```powershell
    npm start
    ```

    The server binds to `0.0.0.0` so other devices on your local network can reach it.

 - **Access from another device:** find this machine's local IP via `ipconfig` and open `http://<IP>:3000` in a browser. You can change the port by setting the `PORT` environment variable, for example in PowerShell:

    ```powershell
    $env:PORT = 8080; npm start
    ```

 - **Developer mode (auto-reload):**

    ```powershell
    npm run dev
    ```

This quickstart creates a minimal Express server (`main.js`) and a simple page in `public/index.html`.
