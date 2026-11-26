---
name: add-server-message-handler
description: Implementing a new client message in the authoritative gateway without bypassing sequence, rate or lifecycle checks.
triggers:
  - "new handler"
  - "server message handling"
  - "implement client message"
  - "add gateway branch"
edges:
  - target: context/game-server.md
    condition: when reading the gateway lifecycle and session helpers
  - target: patterns/add-protocol-message.md
    condition: when the wire schema must change first
  - target: patterns/run-verify-gates.md
    condition: after implementation
grounds_to: []
last_updated: 2026-11-25
mex:
  id: mx_01M88T5MAFFWJ7AJVNFDT120GB
  type: pattern
  status: promoted
  revision: 4
  title: add-server-message-handler
  relations:
    - type: related_to
      target: mx_01M88SYZDE4PCAB6J2BT60K8N2
      note: when reading the gateway lifecycle and session helpers
    - type: related_to
      target: mx_01M88T5M83HJV1NFQGNSC9JDTZ
      note: when the wire schema must change first
    - type: related_to
      target: mx_01M88T5MFGC096FKCTQCP75SGW
      note: after implementation
---

# Add Server Message Handler

## Context
Read `context/game-server.md`, then `apps/game-server/src/gateway.ts`,
`apps/game-server/src/session.ts`, and `apps/game-server/src/rate-limit.ts`. All inbound messages pass through
`GameGateway.onMessage` before any handler runs. The server is authoritative;
handlers must not trust client-computed state.

## Steps
1. Add the schema variant first, following `patterns/add-protocol-message.md`.
2. Add a `RateLimitRule` to `DEFAULT_RATE_LIMITS` for the new message type.
3. Add a `switch` branch in `GameGateway.onMessage` after the sequence and rate
   checks. Keep validation of cross-field constraints there, not in the client.
4. Use `GameSession.send` for every reply so the outbound `ss` stays monotonic.
   For operations that cannot be completed yet, send a non-fatal
   `NOT_IMPLEMENTED` error as the existing variants do.
5. Update the session state on success only; do not call `GameSession.touch`
   outside the common path.
6. Add gateway tests covering accepted, rejected and rate-limited cases.

## Gotchas
- A branch added before the `context.state === 'ready'` guard would let
  unauthenticated sockets invoke it.
- Returning without calling `session.touch` is already handled by the common
  path; touching twice does not extend the deadline further but obscures tests.
- `GameSession.send` silently returns `false` when the socket is not `OPEN`;
  do not assume a queued reply was delivered.
- Reconnect tokens rotate on every `welcome`; never reuse a token read from the
  store directly.

## Verify
- [ ] `pnpm test` includes rate-limit and invalid-sequence cases for the branch.
- [ ] `pnpm typecheck` passes under strict TypeScript.
- [ ] `pnpm depcruise` still shows no reverse dependency into `packages/`.
- [ ] A live `hello → message → reply` exchange succeeds against `/auth/dev`.

## Debug
If a message is dropped with no error, inspect `metrics.rateLimitDrops` and
`metrics.sequenceDrops` at `/metrics` before reading the switch branch.

## Update Scaffold
- [ ] Update `context/game-server.md` if a new invariant or limit was added.
- [ ] Update `.mex/ROUTER.md` "Current Project State" when new behavior works.
