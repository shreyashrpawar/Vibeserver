# Vibeserver - VPS Management Dashboard

Vibeserver is a modern, privacy-focused VPS management dashboard that runs locally on your machine. It provides a beautiful interface to manage your servers, files, terminals, and monitoring, all without relying on third-party cloud services for data storage.

## Features
- **Server Management**: Connect to multiple VPS instances via SSH.
- **File Manager**: Browse, upload, download, and edit files on your server.
- **Web Terminal**: Full-featured terminal emulator in your browser.
- **Live Monitoring**: Real-time server resource usage (CPU, RAM, Disk).
- **Self-Hosted / Local**: Your data stays on your machine.

## Tech Stack
- **Frontend**: Next.js 15, React 19, TailwindCSS 4
- **Backend**: Go (Golang)
- **Database**: SQLite (local `auth.db`)
- **UI Components**: Lucide Icons, Recharts, Monaco Editor

## Getting Started

### Prerequisites
- Node.js 20+
- Go 1.23+

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/shreyashrpawar/Vibeserver.git
   cd Vibeserver
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Run the development server (Frontend + Backend):
   > Note: You may need to run the Go backend separately or ensure the `dev` script handles it.
   
   ```bash
   npm run dev
   ```

## Building
To build the standalone application:
```bash
go build -o vibeserver main.go
```

## Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
