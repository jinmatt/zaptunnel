# AGENTS.md

## Cursor Cloud specific instructions

### Overview

ZapTunnel is a single-package Node.js/TypeScript CLI tool that shares files via temporary Cloudflare Tunnel URLs. See `README.md` for full usage and project structure.

### Key commands

All standard commands are in `package.json` scripts:

- **Install & build:** `npm install` (the `prepare` hook auto-runs `npm run build`)
- **Type check (lint):** `npx tsc --noEmit` (no ESLint configured)
- **Tests:** `npm test` (unit + integration via Vitest)
- **Dev watch mode:** `npm run dev` (TypeScript recompilation on changes)

### Non-obvious notes

- `cloudflared` binary is **optional** for development. Unit and integration tests run without it; tests that need it are auto-skipped. Full E2E tunnel creation requires `cloudflared` in PATH.
- There is one **pre-existing test failure** in `tests/unit/server.test.ts` (`should track download count`). This is a known issue in the repository and is unrelated to environment setup.
- `npm install` triggers `tsc` build via the `prepare` script, so a separate `npm run build` is not needed after install.
- The server auto-selects the next available port if port 3000 is in use.
- `bcrypt` requires native compilation; `npm install` handles this automatically with the Node.js version on this VM (v22).
