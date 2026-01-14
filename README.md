# ZapTunnel ⚡

[![CI](https://github.com/jinmatt/zaptunnel/actions/workflows/ci.yml/badge.svg)](https://github.com/jinmatt/zaptunnel/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/jinmatt/zaptunnel/branch/main/graph/badge.svg)](https://codecov.io/gh/jinmatt/zaptunnel)

A CLI tool that instantly shares files by generating temporary public URLs using Cloudflare Tunnel.

## Features

- 🚀 **Instant Sharing** - Share files without uploading to cloud services
- 🔒 **Password Protection** - Optional password protection for sensitive files
- 📊 **Progress Tracking** - Real-time download progress with visual progress bars
- ⏱️ **Auto-Expiration** - Automatically shutdown after time limit or download count
- 🌐 **Public URLs** - Generate shareable HTTPS URLs via Cloudflare Tunnel
- 💻 **CLI-First** - Simple command-line interface for quick sharing

## Prerequisites

- Node.js 18 or higher
- [Cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) installed and available in PATH

### Installing Cloudflared

**macOS:**
```bash
brew install cloudflared
```

**Linux:**
```bash
# Debian/Ubuntu
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Or use the universal binary
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
sudo chmod +x /usr/local/bin/cloudflared
```

**Windows:**
```powershell
# Using Chocolatey
choco install cloudflared

# Or download from: https://github.com/cloudflare/cloudflared/releases
```

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/zaptunnel.git
cd zaptunnel

# Install dependencies
npm install

# Build the project
npm run build

# Link globally (optional)
npm link
```

## Usage

### Basic File Sharing

Share a file with default settings (1 download, 60 minute expiration):

```bash
zaptunnel share ./document.pdf
```

### With Options

```bash
# Allow 3 downloads before shutdown
zaptunnel share ./report.pdf --max-downloads 3

# Set custom expiration time (30 minutes)
zaptunnel share ./image.png --expire 30

# Password protect the file
zaptunnel share ./secret.zip --password mypassword

# Combine options
zaptunnel share ./file.tar.gz -m 5 -e 120 -p secretpass
```

### Command Options

- `-m, --max-downloads <number>` - Maximum number of downloads before shutdown (default: 1)
- `-e, --expire <minutes>` - Auto-shutdown timer in minutes (default: 60)
- `-p, --password <password>` - Password protect the file

## How It Works

1. **Validates** the file exists and is readable
2. **Starts** a local HTTP server on your machine
3. **Creates** a Cloudflare quick tunnel (no account needed)
4. **Generates** a public HTTPS URL
5. **Tracks** download progress in real-time
6. **Auto-shuts down** after max downloads or expiration time

## Example Output

```
🔍 Validating file...
✓ File found: document.pdf (2.4 MB)
✓ Server started
✓ Tunnel created

✓ Ready!

📎 https://brave-mountain-1234.trycloudflare.com

⚙️  Max downloads: 1 | Expires: 60min

⏳ Waiting for download...
   Press Ctrl+C to shutdown

📥 Download started...
████████████████████░░ 80% | 1.9 MB/2.4 MB
✓ Download complete! (1/1)

Maximum downloads reached. Shutting down...
👋 Shutdown complete
```

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode (auto-rebuild on changes)
npm run dev

# Run directly
npm start share ./test-file.txt
```

## Testing

The project includes comprehensive unit and integration tests:

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Coverage

- **utils.ts**: 96.77% - Core utilities (file validation, formatting, parsing)
- **server.ts**: 89.85% - Express server and file serving logic
- **Overall**: 95+ passing tests with 49% coverage

**Note**: Some tests require `cloudflared` to be installed and will be skipped if not available. Core functionality is thoroughly tested regardless.

## Project Structure

```
zaptunnel/
├── src/
│   ├── cli.ts          # CLI entry point with Commander.js
│   ├── server.ts       # Express server for file serving
│   ├── tunnel.ts       # Cloudflare tunnel manager
│   ├── fileServer.ts   # Main orchestrator
│   └── utils.ts        # Helper utilities
├── templates/
│   └── preview.html    # Download page template
├── dist/               # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## Technical Stack

- **TypeScript** - Type-safe development
- **Node.js** - Runtime environment
- **Express.js** - HTTP server
- **Commander.js** - CLI framework
- **Cloudflared** - Tunnel creation
- **chalk** - Terminal colors
- **ora** - Spinners
- **cli-progress** - Progress bars
- **bcrypt** - Password hashing

## Security Notes

- Files are served directly from your machine (not uploaded anywhere)
- Cloudflare quick tunnels are temporary and random
- Password protection uses bcrypt hashing
- The tunnel automatically shuts down after expiration or max downloads
- No permanent storage or logging of files

## Troubleshooting

### "cloudflared not found" error

Make sure cloudflared is installed and available in your PATH:
```bash
cloudflared --version
```

### Port already in use

The server will automatically try the next available port if 3000 is taken.

### Tunnel creation timeout

This may happen due to network issues. Try again or check your internet connection.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
