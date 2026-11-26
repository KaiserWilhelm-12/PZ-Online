---
name: debug-connection
description: Diagnosing handshake failures, drops, reconnect churn and latency reporting between the client and the game server.
triggers:
  - "connection error"
  - "handshake fails"
  - "websocket drops"
  - "reconnect loop"
  - "latency wrong"
  - "pong missing"
edges:
  - target: context/client.md
    condition: when checking client timers, close codes or reconnect state
  - target: context/game-server.md
    condition: when checking gateway validation, auth or eviction
  - target: context/setup.md
    condition: when suspecting environment or proxy configuration
  - target: patterns/add-protocol-message.md
    condition: when the failure is a schema or version mismatch
grounds_to: []
last_updated: 2026-11-25
mex:
  id: mx_01M88T5MCXQE8S9Y57N1EBKHX4
  type: pattern
  status: promoted
  revision: 5
  title: debug-connection
  relations:
    - type: related_to
      target: mx_01M88T0K1SZXV9JKH71QCR12A3
      note: when checking client timers, close codes or reconnect state
    - type: related_to
      target: mx_01M88SYZDE4PCAB6J2BT60K8N2
      note: when checking gateway validation, auth or eviction
    - type: related_to
      target: mx_01M88NM5F9RS36QYX0CCNTAZEY
      note: when suspecting environment or proxy configuration
    - type: related_to
      target: mx_01M88T5M83HJV1NFQGNSC9JDTZ
      note: when the failure is a schema or version mismatch
---

# Debug Connection

## Context
Read `context/client.md` and `context/game-server.md`. The socket crosses two
validation layers: the Fastify upgrade in `GameGateway.handleUpgrade`, then the
Zod-gated `hello` in `GameGateway.handleHello`. The client mirrors this with
`GameConnection.authenticate` and close-code handling.

## Steps
1. Check `GET /healthz` on port 8080. No response means the server or `.env` is
   wrong, not the socket.
2. Check that `/auth/dev` is registered — it only exists when `DEV_AUTH_ENABLED`
   and `DEV_JWT_SECRET` are set and `NODE_ENV` is not production.
3. Inspect the first client frame: `{ v, cs, msg: { type: 'hello', token,
   serverId } }`. The `serverId` must equal the one returned by sign-in.
4. Map the close code: 4000 hello timeout, 4001 auth, 4002 wrong server/origin,
   4003 takeover, 4004 version, 4006 rejected reconnect, 4007 heartbeat,
   4009 invalid envelope.
5. If the socket opens but goes idle, check `ping`/`pong`: the client sends
   `ping` immediately on `welcome` and every `heartbeatMs` after, and closes
   after `deadAfterMs` without a pong.
6. Check the diagnostics overlay for latency and traffic; `latencyMs` is
   `Date.now() - pong.t`, clamped at zero, so a wrong clock makes it zero.

## Gotchas
- A hidden iPad page has its socket closed with reason `Page hidden`; that is a
  deliberate suspend, not a failure. The single reconnect happens on `pageshow`
  or `visibilitychange`.
- `4003` clears the stored reconnect token and is terminal. Do not retry it.
- `4006` clears the token and retries without one; this is the expected path
  after a server restart.
- `4009` can be produced by either side: gateway on a bad inbound envelope or
  client on a malformed server envelope. Check which side closed first.
- The Vite dev proxy only forwards `/api` and `/ws`; a production build needs
  `VITE_GAME_SERVER_URL`.

## Verify
- [ ] `/healthz` reports the expected `serverId` and `protocolVersion`.
- [ ] `hello → welcome` and `ping → pong` are visible in the diagnostics overlay.
- [ ] Reconnect after `pagehide` produces one new socket, not a burst.
- [ ] `pnpm verify` still passes after any change.

## Debug
If all codes look correct but the session vanishes, inspect `GameGateway.sweep`:
only accepted messages call `GameSession.touch`, so a client that sends no
messages is evicted after `DEAD_TIMEOUT_MS` even if its socket is open.

## Update Scaffold
- [ ] Update `context/game-server.md` or `context/client.md` if lifecycle changed.
- [ ] Update this pattern with any new close code or timing gotcha.
