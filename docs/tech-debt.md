# Technical Debt and Known Limitations

This register records deliberate Milestone 1 shortcuts. Each item names the
risk and the milestone or trigger for repayment. Nothing here is a claim that
the shortcut is safe for public play.

## Security and identity

1. **Production Supabase verification is unexercised.** The server supports a
   shared HS256 secret and a remote JWKS URL, but only development HS256 tokens
   were tested. Exercise both against a real Supabase project, including key
   rotation, issuer/audience mismatch, and expired tokens, before any public
   deployment. (`apps/game-server/src/auth.ts`)
2. **Development auth is an intentional backdoor.** `/auth/dev` issues tokens
   for any caller and is disabled by default. The environment schema refuses to
   start with `DEV_AUTH_ENABLED=true` when `NODE_ENV=production`, but this guard
   has only unit-level coverage. Add a deployment smoke test that asserts the
   route is absent in production. (`apps/game-server/src/http.ts`,
   `src/env.ts`)
3. **Reconnect tokens live in `sessionStorage`.** They are tab-scoped and
   cleared when the tab closes, but readable by any script in the origin. Move
   to memory-only plus an HttpOnly, Secure, SameSite cookie when the real auth
   flow lands, and reassess whether page-reload reconnection is worth the
   storage exposure. (`apps/client/src/net/connection.ts`)
4. **Rate limits are per connection.** A reconnect starts a fresh token bucket,
   so a hostile client can reset its budget. Add per-player and per-IP budgets,
   plus alerting, before exposing the server publicly.
   (`apps/game-server/src/rate-limit.ts`)
5. **`/metrics` is unauthenticated JSON.** It defaults off in production, but
   when enabled it exposes player and traffic counters to anyone who can reach
   the port. Put it behind the private network or an authenticated scrape path.
6. **No origin enforcement by default.** `ALLOWED_ORIGINS` is optional. A
   production deployment must set it; otherwise any web origin can open a
   WebSocket with a stolen token.

## Simulation and networking

7. **There is no simulation tick.** `TICK_RATE_HZ` is advertised in `welcome`,
   but `input`, `inv.move`, `interact.*`, and `chat` are validated and then
   discarded or answered with `NOT_IMPLEMENTED`. This is Milestone 1 scope, not
   a playable game.
8. **Reconnect restores a token, not a character.** The 120 s grace window only
   protects the token. There is no world state, safe sleeping state, or
   combat-logging rule yet; those arrive with simulation and persistence.
9. **Duplicate-session handling is abrupt.** The first socket is closed with
   `DUPLICATE_SESSION` immediately. Once inventories exist, the takeover path
   must preserve the character, cancel pending operations, and flush the
   ledger transactionally.
10. **No sequence window or replay protection beyond monotonic `cs`.** A client
    that jumps far ahead is accepted. Add a bounded receive window when server
    snapshots begin.
11. **Heartbeat timing is client-driven.** The server only observes inbound
    traffic; it does not send its own pings. Hidden pages now close cleanly and
    reconnect on resume, but a visible-yet-occluded desktop window can still
    have timers throttled and be evicted after 15 s. Re-evaluate with real iPad
    background data; consider server-issued pings or a worker for the heartbeat.
12. **`SERVER_ID` changes on every development boot.** Reconnect tokens do not
    survive a restart, and clients correctly reject the unknown server. That is
    acceptable locally; production requires a stable ID (enforced).

## Client and rendering

13. **One procedural chunk, no streaming.** The scene is a single generated
    32×32-tile chunk drawn with Pixi `Graphics`. There is no chunk compiler,
    culling, atlas, or texture budget yet. Replace the generated scene in
    Milestone 2 and add measured budgets before art volume grows.
14. **Draw-call telemetry monkey-patches WebGL methods.** It provides a useful
    number today but is coupled to renderer internals and does not cover
    WebGPU. Replace with first-party Pixi metrics or an engine-agnostic
    instrumentation layer. (`apps/client/src/runtime/game.ts`)
15. **Diagnostics are desktop-verified only.** FPS, heap, and draw calls were
    observed in desktop Chromium. Safari/iPad memory reporting, thermal
    throttling, and canvas resolution behavior remain unmeasured.
16. **No offline UX or update banner.** The service worker caches the shell and
    serves a cached `index.html` on navigation failure, but the UI does not
    explain offline state or prompt for a new version. Acceptance test 10 is
    deferred.
17. **Icons are SVG only.** iOS may ignore SVG `apple-touch-icon` and fall back
    to a screenshot. Add 180×180, 192×192, and 512×512 PNG icons before PWA
    install testing on a device.
18. **The client is not served by the game server.** Vite proxies `/api` and
    `/ws` in development. Production needs a static host plus an explicit
    `VITE_GAME_SERVER_URL`, or a reverse proxy that serves both. The Render
    blueprint currently deploys only the game server.
19. **The main client chunk is 544 KB minified (165 KB gzip).** It is within the
    total budget, but Pixi and React are bundled together. Add manual chunking
    and measure startup on an iPad before adding more UI.
20. **No audio system.** Audio unlock, interruption, and resume are Milestone 2+
    work.

## Process and operations

21. **CI has not run on GitHub.** The workflow mirrors the local command
    sequence, but the first push must confirm pnpm caching, lockfile integrity,
    and artifact-free library builds.
22. **No browser or end-to-end test in CI.** The live browser check was manual.
    Add Playwright with a mocked or ephemeral game server once the client has
    stable gameplay flows.
23. **No database, migrations, or ledger.** Milestone 5 work. CI intentionally
    has no Postgres service yet.
24. **No license.** The repository remains unlicensed, which blocks confident
    reuse and contribution. Choose a license before accepting outside code.
25. **Single-node only.** Sessions, reconnect grants, and rate limits are
    in-process. Horizontal scaling requires a shared presence store, sticky
    routing, or a room gateway; do not run multiple instances behind a naive
    load balancer.
26. **No structured audit log.** Authentication failures and lifecycle events
    are logged, but administrative and economy actions do not exist yet. Add
    tamper-evident audit logging with the ledger.
27. **The portable toolchain is not part of the repo.** Verification used a
    temp-installed Node 22 and pnpm 9.15.0 because the host lacked them.
    Contributors should install Node 22 through their normal version manager.
