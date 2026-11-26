# Changelog

All notable changes to Lanternfall are recorded here. The project follows
[Semantic Versioning](https://semver.org/) once public releases begin.

## [0.1.0] — 2026-11-24

### Added

- pnpm workspace monorepo with Turborepo, strict TypeScript presets, ESLint,
  Prettier, dependency-cruiser boundaries, Vitest, and Node 22 / pnpm 9 pins.
- `@lanternfall/shared`: branded ID helpers, domain constants, clamped math, and
  a deterministic seeded PRNG with tests.
- `@lanternfall/protocol`: Zod schemas for every client and server message,
  versioned envelopes, close codes, protocol error codes, and fixtures covering
  valid, invalid, oversized, and wrong-version messages.
- `@lanternfall/game-server`: Fastify HTTP surface (`/healthz`, `/readyz`,
  `/metrics`, development-only `/auth/dev`), WebSocket gateway with a 5 s hello
  deadline, JWT verification (Supabase secret/JWKS or development HS256),
  per-message token-bucket rate limits, monotonic client sequence checks,
  heartbeat eviction, one-session-per-character takeover, and single-use rotating
  reconnect tokens with a 120 s grace window.
- `@lanternfall/client`: Vite + React 19 + PixiJS 8 PWA shell, installable
  manifest, service worker, generated 32×32 bootstrap chunk, responsive
  iPad-first HUD, resilient WebSocket connection with exponential backoff and
  jitter, dev sign-in bootstrap, and a diagnostics overlay with FPS, frame time,
  draw calls, sprites, latency, traffic, chunk count, and heap estimate.
- Verification scripts for bundle size and committed-secret scanning.
- GitHub Actions CI running install, lint, typecheck, tests, boundaries, build,
  bundle budget, and secret scan.
- Deployment blueprint for a single Render web service and a documented
  environment template.
- Project documentation: architecture baseline, checklist, changelog, technical
  debt, originality log, and asset register.

### Verified

- `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (47 tests),
  `pnpm depcruise`, `pnpm build`, `pnpm check:bundles`, and
  `pnpm check:secrets` pass on Windows 11 with Node 22.12.0 and pnpm 9.15.0.
- Live HTTP and WebSocket handshake against the built server.
- Client shell renders and connects in desktop Chromium with no console errors.

### Not yet implemented

- Movement, touch joystick, collision, world streaming, zombies, inventory,
  persistence, production authentication flow, audio, offline gameplay, and
  30-minute soak testing. See `docs/tech-debt.md`.
