# Milestone 1 Checklist

Status: **complete and locally verified** (2026-11-24).

Milestone 1 delivers the repository scaffold, enforced package boundaries, the
`shared` and `protocol` packages, the authoritative game-server handshake and
heartbeat, and the iPad-first client shell with a Pixi canvas and diagnostics.
It does not deliver movement, world simulation, persistence, or production auth.

## Verification environment

| Item          | Value                                                       |
| ------------- | ----------------------------------------------------------- |
| Host          | Windows 11, PowerShell                                      |
| Node          | 22.12.0 (portable toolchain in the approved temp directory) |
| pnpm          | 9.15.0                                                      |
| Browser check | Desktop Chromium through the in-app browser                 |
| CI            | Workflow committed; not yet executed on GitHub              |

Local Node.js was not installed on `PATH`, so a portable Node 22 + pnpm 9.15.0
toolchain was used. This does not change the repository: `.nvmrc`, CI, and the
package manager pin all specify Node 22 and pnpm 9.15.0.

## Command gates

All commands were run from the repository root.

| Gate          | Command              | Result                                                          |
| ------------- | -------------------- | --------------------------------------------------------------- |
| Install       | `pnpm install`       | Pass; lockfile generated                                        |
| Lint          | `pnpm lint`          | Pass                                                            |
| Typecheck     | `pnpm typecheck`     | Pass (5 packages)                                               |
| Tests         | `pnpm test`          | Pass (4 files, 47 tests)                                        |
| Boundaries    | `pnpm depcruise`     | Pass (40 modules, 54 dependencies, 0 violations)                |
| Build         | `pnpm build`         | Pass; server bundle 32.52 KB, client bundle gzip 250.8 KB total |
| Bundle budget | `pnpm check:bundles` | Pass; 250,969 B gzipped against 6,291,456 B budget              |
| Secret scan   | `pnpm check:secrets` | Pass                                                            |

`pnpm lint` excludes `dist/`, generated output and `.agents/` (vendored agent
skills installed by MEX); those scripts are not Lanternfall source. Prettier is
not part of `pnpm verify` but `pnpm format:check` passes on authored files.

## Acceptance tests (architecture section 15)

| #   | Requirement                                                                                                           | Status                       | Evidence                                                                                                                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Install, lint, typecheck, test, build pass from a clean clone in CI                                                   | Locally verified; CI pending | Every command above passed locally. `.github/workflows/ci.yml` runs the same sequence with `--frozen-lockfile`; GitHub Actions has not run yet.                                                                                  |
| 2   | Every `ClientMessage` variant has valid and invalid fixtures; unknown type, oversized payload, wrong version rejected | Pass                         | `packages/protocol/src/client.test.ts`: valid fixtures for hello, input, inv.move, interact.begin, interact.cancel, chat, ping; invalid fixtures for every variant plus unknown type, oversized chat/token and version mismatch. |
| 3   | No hello within 5 s closes; invalid JWT closes; second session for the same character closes the first                | Pass                         | `apps/game-server/src/gateway.test.ts` covers hello timeout, invalid JWT, duplicate-session takeover. Tests use a 100 ms hello timeout to stay fast; the production default is `HELLO_TIMEOUT_MS=5000`.                          |
| 4   | 100 inputs in 1 s drop the excess and increment a counter                                                             | Pass                         | Gateway test sends 100 inputs: 30 accepted, 70 dropped, `rateLimitDrops` counter asserted.                                                                                                                                       |
| 5   | Silent client dropped by 15 s; reconnect token succeeds once then rotates                                             | Pass                         | Heartbeat test uses a 150 ms dead timeout for speed; default is `DEAD_TIMEOUT_MS=15000`. Reconnect test asserts single use, rotation, and rejection of a replayed token.                                                         |
| 6   | Physical iPad touch-only movement                                                                                     | Deferred to Milestone 2      | Movement and joystick are out of Milestone 1 scope.                                                                                                                                                                              |
| 7   | Background 60 s, auto-reconnect, audio resume                                                                         | Partial                      | The client closes its socket on `pagehide`/hidden, stops retry churn, and reconnects once on `pageshow`/visible using the grace token. The 60 s background test on an iPad and audio are deferred.                               |
| 8   | Diagnostics show FPS, frame time, draw calls, visible sprites, latency, traffic, heap estimate                        | Pass in Chromium             | Live run: 60 FPS, 16.7 ms frame, 5 draw calls, 7 sprites, 4 ms latency, traffic in/out, 1 chunk, 15.4 MB heap. Physical iPad verification deferred.                                                                              |
| 9   | 30-minute soak with no heap growth trend                                                                              | Deferred to Milestone 3      | Not measured.                                                                                                                                                                                                                    |
| 10  | Offline behavior honest and usable                                                                                    | Deferred                     | Service worker caches the shell; no offline UI yet.                                                                                                                                                                              |

## Live verification performed

1. Built and started `@lanternfall/game-server` with development auth.
2. Confirmed the repository-root `.env` is loaded with no shell environment
   variables set (`process.loadEnvFile`), while platform variables would win.
3. `GET /healthz` returned `status: ok`, protocol version 1, and a server ID.
4. `POST /auth/dev` returned a signed token, player ID, character ID, and server ID.
5. A real WebSocket client completed `hello` → `welcome` and `ping` → `pong`.
6. Started the Vite client, opened it in Chromium, and confirmed:
   - header status chip shows **Connected**;
   - one 32×32-tile bootstrap chunk renders with a survivor marker and road;
   - diagnostics show FPS, frame time, draw calls, sprites, latency, traffic,
     chunks, and heap;
   - no console errors.

## Scope guardrails

- No gameplay simulation, inventory, persistence, chat delivery, or zombie AI is claimed.
- `inv.move`, `interact.*`, and `chat` are validated and answered with a
  non-fatal `NOT_IMPLEMENTED` error until their milestones land.
- Production Supabase JWT verification is implemented but has not been exercised
  against a real Supabase project. Development auth is blocked when
  `NODE_ENV=production`.

## Next milestone

Milestone 2: movement in `packages/simulation`, touch joystick, one hand-authored
chunk, local prediction against the server, and acceptance tests 6 and 7 on a
physical iPad.
