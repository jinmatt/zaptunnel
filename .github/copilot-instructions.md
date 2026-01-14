# ZapTunnel - Copilot Instructions

## Project Overview

ZapTunnel is a CLI tool that instantly shares files by generating temporary public URLs using Cloudflare Tunnel. The tool creates a local HTTP server, establishes a Cloudflare tunnel, and provides a shareable HTTPS URL for file downloads with features like password protection, download limits, and auto-expiration.

## Technology Stack

- **Language**: TypeScript (target: ES2020)
- **Runtime**: Node.js >= 18.0.0
- **Framework**: Express.js for HTTP server
- **CLI Framework**: Commander.js
- **External Dependency**: Cloudflared (required in PATH)
- **Key Libraries**:
  - bcrypt - password hashing
  - chalk - terminal colors
  - ora - loading spinners
  - cli-progress - progress bars
  - qrcode-terminal - QR code generation

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
├── dist/               # Compiled JavaScript (auto-generated, do not edit)
├── package.json
├── tsconfig.json
└── README.md
```

## Build and Development Commands

### Building
```bash
npm run build          # Compile TypeScript to dist/
npm run dev           # Watch mode - auto-rebuild on changes
```

### Running
```bash
npm start share <file>           # Run the CLI tool
node dist/cli.js share <file>   # Direct execution
```

### Testing
Currently, this project does not have automated tests. For manual testing, see the "Common Tasks" section below.

## Code Style and Conventions

### TypeScript
- **Strict mode enabled** - All TypeScript strict checks are enforced
- **ES Module Interop** - Use ESModuleInterop for compatibility
- **Target**: ES2020 with commonjs modules
- **No `any` types** - Avoid using `any`; use proper types or `unknown`
- **Type declarations** - Generate declaration files (.d.ts)

### File Organization
- Source files go in `src/` directory
- Compiled output goes to `dist/` (auto-generated, do not commit)
- Templates for HTML/static content go in `templates/` directory
- Keep utility functions in `utils.ts`

### Naming Conventions
- **Files**: camelCase (e.g., `fileServer.ts`, `cli.ts`)
- **Classes**: PascalCase
- **Functions/Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE for true constants

### Error Handling
- Use proper error types, not generic Error when possible
- Provide meaningful error messages for CLI users
- Handle external dependency failures gracefully (e.g., cloudflared not found)

### CLI Output
- Use chalk for colored terminal output
- Use ora for loading spinners
- Use cli-progress for download progress bars
- Keep output user-friendly and informative

## Security Considerations

- **Password Protection**: Use bcrypt for password hashing (never store plain text)
- **File Access**: Validate file paths to prevent directory traversal
- **Input Validation**: Validate all CLI inputs (file paths, download limits, expiration times)
- **Temporary Tunnels**: Ensure tunnels are properly shut down after use
- **No File Storage**: Files are served directly from local machine, never uploaded

## Dependencies

### Adding New Dependencies
- Prefer well-maintained, popular packages
- Add dev dependencies with `npm install --save-dev <package>`
- Add runtime dependencies with `npm install <package>`
- Update package.json with appropriate version constraints

### External Requirements
- **Cloudflared** must be installed on the system and available in PATH
- Node.js version >= 18.0.0 is required

## Common Tasks

### Adding a New CLI Command
1. Update `src/cli.ts` with new Commander.js command
2. Create handler function in appropriate module (or new file in `src/`)
3. Update README.md with new command documentation

### Modifying Server Behavior
- Edit `src/server.ts` for HTTP server logic
- Edit `src/fileServer.ts` for file serving orchestration
- Edit `templates/preview.html` for download page UI

### Tunnel Management
- All Cloudflare tunnel logic is in `src/tunnel.ts`
- Tunnel process management must ensure cleanup on shutdown

## Manual Testing

Since this project does not have automated tests yet, manual testing should be done by:
1. Building the project: `npm run build`
2. Running the CLI tool: `npm start share <test-file>` or `node dist/cli.js share <test-file>`
3. Verifying the file sharing functionality works end-to-end:
   - Check that the server starts
   - Verify the Cloudflare tunnel URL is generated
   - Test the download works through the URL
   - Confirm password protection works (if enabled)
   - Verify auto-shutdown works after max downloads or expiration

When adding tests, use a testing framework consistent with TypeScript (e.g., Jest, Mocha).

## Important Notes

- **Do not edit files in `dist/`** - They are auto-generated
- **Cloudflared dependency** - The tool requires cloudflared to be installed separately
- **MIT License** - Contributions must be compatible with MIT license
