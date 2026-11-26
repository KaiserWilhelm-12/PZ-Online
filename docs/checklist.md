# Milestone 1 Checklist

Status: **Milestone 1 complete; playable-foundation work in progress**.

Milestone 1 delivers the repository scaffold, enforced package boundaries, the
`shared` and `protocol` packages, the authoritative game-server handshake and
heartbeat, and the iPad-first client shell with diagnostics. It does not
deliver a full simulation, persistence, or production auth.

The follow-up foundation now includes Phaser 4.2.1 rendering an original
geometric isometric neighborhood, shared isometric transforms, a touch joystick,
and fixed-tick server-authoritative movement. At 20 Hz the server advances
movement, expires stale input, and replicates 1/16-tile positions and all active
entities to connected clients. This is not yet a full game loop: collision,
local prediction/reconciliation, interpolation, and PostgreSQL persistence
remain planned.

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

| Gate          | Command              | Result                                           |
| ------------- | -------------------- | ------------------------------------------------ |
| Install       | `pnpm install`       | Pass; lockfile generated                         |
| Lint          | `pnpm lint`          | Pass                                             |
| Typecheck     | `pnpm typecheck`     | Pass (5 packages)                                |
| Tests         | `pnpm test`          | Pass (4 files, 52 tests)                         |
| Boundaries    | `pnpm depcruise`     | Pass (39 modules, 54 dependencies, 0 violations) |
| Build         | `pnpm build`         | Pass; server bundle 33.96 KB                     |
| Bundle budget | `pnpm check:bundles` | Pass; 472,976 B gzipped against 6,291,456 B      |
| Secret scan   | `pnpm check:secrets` | Pass                                             |

`pnpm verify` passed on 2026-11-27 after the Phaser migration and tile-picking
change. The Phaser game chunk is 1.69 MB minified (384.21 KB gzip); the initial
React shell chunk is 296.20 KB minified (87.99 KB gzip).

`pnpm lint` excludes `dist/`, generated output and `.agents/` (vendored agent
skills installed by MEX); those scripts are not Lanternfall source. Prettier is
not part of `pnpm verify` but `pnpm format:check` passes on authored files.

## Acceptance tests (architecture section 15)

| #   | Requirement                                                                                                           | Status                                          | Evidence                                                                                                                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Install, lint, typecheck, test, build pass from a clean clone in CI                                                   | Locally verified; CI pending                    | Every command above passed locally. `.github/workflows/ci.yml` runs the same sequence with `--frozen-lockfile`; GitHub Actions has not run yet.                                                                                  |
| 2   | Every `ClientMessage` variant has valid and invalid fixtures; unknown type, oversized payload, wrong version rejected | Pass                                            | `packages/protocol/src/client.test.ts`: valid fixtures for hello, input, inv.move, interact.begin, interact.cancel, chat, ping; invalid fixtures for every variant plus unknown type, oversized chat/token and version mismatch. |
| 3   | No hello within 5 s closes; invalid JWT closes; second session for the same character closes the first                | Pass                                            | `apps/game-server/src/gateway.test.ts` covers hello timeout, invalid JWT, duplicate-session takeover. Tests use a 100 ms hello timeout to stay fast; the production default is `HELLO_TIMEOUT_MS=5000`.                          |
| 4   | 100 inputs in 1 s drop the excess and increment a counter                                                             | Pass                                            | Gateway test sends 100 inputs: 30 accepted, 70 dropped, `rateLimitDrops` counter asserted.                                                                                                                                       |
| 5   | Silent client dropped by 15 s; reconnect token succeeds once then rotates                                             | Pass                                            | Heartbeat test uses a 150 ms dead timeout for speed; default is `DEAD_TIMEOUT_MS=15000`. Reconnect test asserts single use, rotation, and rejection of a replayed token.                                                         |
| 6   | Physical iPad touch-only movement                                                                                     | Foundation implemented; physical device pending | A touch joystick sends sequenced input; the server advances movement on fixed 20 Hz ticks, stops stale input after 250 ms, and broadcasts full active-entity snapshots with 1/16-tile coordinates. Physical iPad testing remains deferred. |
| 7   | Background 60 s, auto-reconnect, audio resume                                                                         | Partial                                         | The client closes its socket on `pagehide`/hidden, stops retry churn, and reconnects once on `pageshow`/visible using the grace token. The 60 s background test on an iPad and audio are deferred.                               |
| 8   | Diagnostics show FPS, frame time, draw calls, visible sprites, latency, traffic, heap estimate                        | Desktop smoke passed; performance pending       | Headless Edge shows live diagnostics and the Phaser scene. Its virtualized run is not a performance measurement; the earlier 60 FPS/16.7 ms result predates Phaser. iPad verification remains deferred.                          |
| 9   | 30-minute soak with no heap growth trend                                                                              | Deferred to Milestone 3                         | Not measured.                                                                                                                                                                                                                    |
| 10  | Offline behavior honest and usable                                                                                    | Deferred                                        | Service worker caches the shell; no offline UI yet.                                                                                                                                                                              |

## Live verification performed

1. Built and started `@lanternfall/game-server` with development auth.
2. Confirmed the repository-root `.env` is loaded with no shell environment
   variables set (`process.loadEnvFile`), while platform variables would win.
3. `GET /healthz` returned `status: ok`, protocol version 1, and a server ID.
4. `POST /auth/dev` returned a signed token, player ID, character ID, and server ID.
5. A real WebSocket client completed `hello` → `welcome` and `ping` → `pong`.
6. Earlier desktop Chromium baseline verification confirmed:
   - header status chip shows **Connected**;
   - one 32×32-tile bootstrap chunk renders with a survivor marker and road;
   - diagnostics show FPS, frame time, draw calls, sprites, latency, traffic,
     chunks, and heap;
   - no console errors.
7. After the isometric foundation pass, confirmed separately:
   - `GET /healthz` returns protocol version 1 and a server ID;
   - `POST /auth/dev` returns a usable development session;
   - Vite serves the client at `http://localhost:5173/`;
   - the shared isometric projection and server movement integration test pass.
8. After replacing Pixi with Phaser, headless Edge rendered the Phaser canvas,
   isometric neighborhood, joystick, connected status, and diagnostics with no
   renderer error. A subsequent browser interaction selected a terrain tile
   with the expected outline. The integrated browser tab was hidden, so its
   connection correctly stayed idle; the earlier headless Edge check covered
   connection startup. These checks do not replace iPad Safari testing.

## Scope guardrails

- No gameplay simulation, inventory, persistence, chat delivery, or zombie AI is claimed.
- `inv.move`, `interact.*`, and `chat` are validated and answered with a
  non-fatal `NOT_IMPLEMENTED` error until their milestones land.
- Production Supabase JWT verification is implemented but has not been exercised
  against a real Supabase project. Development auth is blocked when
  `NODE_ENV=production`.

## Next milestone

Next: add shared movement/collision rules, client prediction and reconciliation,
and interpolation, then verify multi-client behavior and physical iPad Safari.
