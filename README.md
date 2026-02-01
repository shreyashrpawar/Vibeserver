# Vibeserver

**Vibeserver** is a modern, lightweight, privacy-focused VPS management dashboard. It provides a beautiful web interface to manage your Linux server's files, terminal, system resources, and services—all running locally on your machine.

**No Cloud. No SaaS. 100% Self-Hosted.**

![Vibeserver Banner](https://vibeserver.netlify.app/og-image.png)

## Features

- **🧠 Server Genius (AI)**: Integrated AI assistant that analyzes your server's logs and metrics to provide instant context-aware help.
- **💻 Web Terminal**: Full-featured xterm.js terminal with zsh/bash support, resizing, and copy/paste.
- **📂 File Manager**: VS Code-powered editor (Monaco) with drag-and-drop uploads, file editing, and management.
- **📊 Live Monitoring**: Real-time telemetry for CPU, Memory, Disk, and Network usage (1s updates).
- **🔒 Secure Access**: JWT-based authentication with local SQLite database.
- **⚡ Single Binary**: One executable contains the entire frontend and backend. Zero dependencies.

## Repository Structure

- `app/`: Main application frontend (Next.js).
- `website/`: Marketing landing page (Next.js).
- `main.go`: Go backend entry point.
- `app_backend/`: Shared backend libraries.

## Quick Install

install Vibeserver on your generic linux server with a single command:

```bash
wget -O install.sh https://raw.githubusercontent.com/shreyashrpawar/Vibeserver/main/install.sh && chmod +x install.sh && sudo ./install.sh
```

This script will:
1. Download the latest binary.
2. Install it to `/usr/local/bin/vibeserver`.
3. Set up a `systemd` service.
4. Start the server on port `8080`.

## Building from Source

Vibeserver consists of a **Next.js frontend** and a **Go backend**. The frontend is compiled into static files and embedded directly into the Go binary.

### Prerequisites
- **Go** 1.23+
- **Node.js** 20+

### 1. Build Frontend (Application)
First, compile the main application into static assets.

```bash
# Navigate to the project root
npm install
npm run build
```
*This command generates an `out` directory containing the static UI.*

> **Note**: To build the landing page (documentation site), go to the `website` directory and run `npm install && npm run build`.

### 2. Build Backend
Next, compile the Go binary. It will automatically embed the `out` directory created in the previous step.

```bash
go build -o vibeserver main.go
```

You now have a standalone `vibeserver` executable!

## Usage

### Running Locally
```bash
./vibeserver
```
Access the dashboard at `http://localhost:8080`.

### Managing the Service (Systemd)
If you installed via the script, Vibeserver runs as a system service.

```bash
# Check status
sudo systemctl status vibeserver

# Restart
sudo systemctl restart vibeserver

# View logs
journalctl -u vibeserver -f
```

### Initial Setup
1. Open your browser to `http://<your-server-ip>:8080`.
2. Logging in for the first time? The default admin credentials are printed in the log output (or set during the install script process).
3. **Important**: Change your password immediately in Settings.

## Architecture

Vibeserver is designed for simplicity and performance.

- **Frontend**: Next.js 16 (React 19), TailwindCSS 4, Lucide Icons.
- **Backend**: Go (Fiber v2), GORM (SQLite), gopsutil.
- **Protocol**: REST API + WebSockets (for real-time terminal/monitor).
- **Database**: `auth.db` (SQLite file stored locally).

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
