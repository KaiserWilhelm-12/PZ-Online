---
name: setup
description: Dev environment setup and commands. Load when setting up the project for the first time or when environment issues arise.
triggers:
  - "setup"
  - "install"
  - "environment"
  - "getting started"
  - "how do I run"
  - "local development"
edges:
  - target: context/stack.md
    condition: when specific technology versions or library details are needed
  - target: context/architecture.md
    condition: when understanding how components connect during setup
  - target: patterns/debug-connection.md
    condition: when the client does not connect after setup
grounds_to: []
last_updated: 2026-11-25
mex:
  id: mx_01M88NM5F9RS36QYX0CCNTAZEY
  type: guide
  status: promoted
  revision: 4
  title: setup
  relations:
    - type: related_to
      target: mx_01M88NM5FJZYQPPCE2FA3SE2VF
      note: when specific technology versions or library details are needed
    - type: related_to
      target: mx_01M88NM5EH1VCT3WG3WSSD1EFQ
      note: when understanding how components connect during setup
    - type: related_to
      target: mx_01M88T5MCXQE8S9Y57N1EBKHX4
      note: when the client does not connect after setup
---

# Setup

## Prerequisites

- Node.js 22 (`.nvmrc`; `engines.node >= 22` because the server uses
  `process.loadEnvFile`).
- pnpm 9.15.0 — pinned in `packageManager`; run `corepack enable` so the pinned
  version is used.
- Git and a POSIX-compatible shell for the scripts under `scripts/`.

## First-time Setup

1. `pnpm install` — installs all workspace dependencies.
2. `cp .env.example .env` — creates the local environment file at the repository root.
3. Generate a development secret with
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
   and set `DEV_JWT_SECRET` in `.env`; keep `DEV_AUTH_ENABLED=true` locally.
4. `pnpm dev` — starts the client on <http://localhost:5173> and the game server
   on port 8080. The Vite dev server proxies `/api` and `/ws` to
   `127.0.0.1:8080`, so no client URL configuration is needed.
5. `pnpm verify` — runs the full gate suite before making changes.

## Environment Variables

- `DEV_JWT_SECRET` (conditionally required when `DEV_AUTH_ENABLED=true`) —
  HS256 signing key for development tokens; at least 32 characters.
- `SERVER_ID` (required in production, optional in development) — stable UUID
  used in handshake validation; one is generated per boot if absent.
- `SUPABASE_JWT_SECRET` or `SUPABASE_JWKS_URL` (conditionally required in
  production) — verification material for Supabase-issued JWTs.
- `SUPABASE_JWT_ISSUER`, `SUPABASE_JWT_AUDIENCE` (conditional) — expected claims.
- `NODE_ENV`, `HOST`, `PORT`, `LOG_LEVEL` (optional) — server runtime defaults
  are `development`, `0.0.0.0`, `8080`, `info`.
- `HELLO_TIMEOUT_MS`, `HEARTBEAT_INTERVAL_MS`, `DEAD_TIMEOUT_MS`,
  `SWEEP_INTERVAL_MS`, `RECONNECT_GRACE_MS` (optional) — connection lifecycle,
  defaulting to 5000/5000/15000/1000/120000 ms.
- `TICK_RATE_HZ`, `MAX_PAYLOAD_BYTES`, `MAX_PLAYERS`, `ALLOWED_ORIGINS`,
  `METRICS_ENABLED` (optional) — simulation and limit settings.
- `VITE_GAME_SERVER_URL` (required only for a production client build) — public
  base URL for `/auth/dev` and `/ws`; only `VITE_*` values reach the browser.

## Common Commands

- `pnpm dev` — Turborepo runs both apps in parallel with hot reload.
- `pnpm test` — Vitest unit and gateway integration tests.
- `pnpm test:watch` — Vitest watch mode.
- `pnpm lint` — ESLint across the workspace; `.agents/` (vendored agent skills)
  and generated output are excluded.
- `pnpm typecheck` — `tsc --noEmit` in every package.
- `pnpm build` — tsup server bundle plus Vite client production build.
- `pnpm depcruise` — package boundary and cycle checks.
- `pnpm check:bundles` and `pnpm check:secrets` — release gates.
- `pnpm format` / `pnpm format:check` — Prettier write/check;
  `docs/architecture.md` is intentionally excluded.
- `pnpm verify` — all of the above gates in sequence.

## Common Issues

- **PowerShell refuses `pnpm.ps1` / `npm.ps1`:** invoke `pnpm.cmd` / `npm.cmd`
  or use Git Bash. On Windows, the approved toolchain lives under
  `C:\Users\NV24170\AppData\Local\Temp\opencode\lanternfall-tools\`.
- **Client shows "Connection error":** confirm the server is listening on 8080,
  `/healthz` returns ok, and `.env` has a `DEV_JWT_SECRET` of at least 32
  characters. The client only reaches `/auth/dev` through the Vite proxy in dev.
- **Handshake rejected with `4004`:** the client and server protocol versions
  disagree; rebuild both after changing `PROTOCOL_VERSION`.
- **`mex` refuses a compound command:** run exactly one `mex` command per shell
  call — no `&&`, `;`, or pipes.
- **Prettier complains about `docs/architecture.md`:** leave it alone; the
  approved baseline is intentionally excluded from formatting.
