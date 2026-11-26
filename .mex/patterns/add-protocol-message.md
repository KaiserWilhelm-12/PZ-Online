---
name: add-protocol-message
description: Adding or changing a wire message in packages/protocol without breaking the handshake or fixtures.
triggers:
  - "new message"
  - "add protocol message"
  - "change wire format"
  - "new server message"
edges:
  - target: context/packages.md
    condition: when reading the existing schemas and limits before editing
  - target: context/game-server.md
    condition: when the gateway must handle or emit the new message
  - target: context/client.md
    condition: when the client must send or interpret the new message
  - target: patterns/run-verify-gates.md
    condition: after the schema and fixtures change
grounds_to: []
last_updated: 2026-11-25
mex:
  id: mx_01M88T5M83HJV1NFQGNSC9JDTZ
  type: pattern
  status: promoted
  revision: 5
  title: add-protocol-message
  relations:
    - type: related_to
      target: mx_01M88SV6KFDDEH3R3W2YEVSD0V
      note: when reading the existing schemas and limits before editing
    - type: related_to
      target: mx_01M88SYZDE4PCAB6J2BT60K8N2
      note: when the gateway must handle or emit the new message
    - type: related_to
      target: mx_01M88T0K1SZXV9JKH71QCR12A3
      note: when the client must send or interpret the new message
    - type: related_to
      target: mx_01M88T5MFGC096FKCTQCP75SGW
      note: after the schema and fixtures change
---

# Add Protocol Message

## Context
`packages/protocol` is the only place wire formats are defined. Read
`context/packages.md` first, then `packages/protocol/src/client.ts`, `packages/protocol/src/server.ts`,
`packages/protocol/src/errors.ts`, and the fixtures in
`packages/protocol/src/client.test.ts`. Both
`ClientEnvelope` and `ServerEnvelope` pin `v` to `PROTOCOL_VERSION`.

## Steps
1. Add the message to `ClientMessage` or `ServerMessage` as a `z.discriminatedUnion`
   variant on `type` — never a loosely typed object.
2. Give every field explicit bounds (nat, UUID, enum or numeric range); reuse
   `MAX_CHAT_CHARS` and other declared constants rather than new magic numbers.
3. If the shape is incompatible with version 1, bump `PROTOCOL_VERSION` and
   `SUPPORTED_PROTOCOL_VERSIONS` together. A new additive variant still warrants
   a review of the client/server version gate.
4. Add fixtures for the valid case plus invalid, oversized, unknown-type and
   wrong-version cases in `packages/protocol/src/client.test.ts`.
5. Update `GameGateway.onMessage` / `GameSession.send` and
   `GameConnection.onSocketMessage` / `send` in the same change.

## Gotchas
- The gateway checks `v` before running `ClientEnvelope.safeParse`; a missing `v`
  bypasses the explicit mismatch check and fails as `INVALID_MESSAGE` instead of
  `4004`.
- Client sequence `cs` and server sequence `ss` are carried by the envelope, not
  by the message. Do not move them into a variant.
- `CloseCode` uses 4000-4009 for application failures; reuse an existing code or
  add one deliberately, never invent a standard code.

## Verify
- [ ] `pnpm test` covers the new variant and its rejection cases.
- [ ] `pnpm typecheck` passes with inferred types, without `any`.
- [ ] `pnpm depcruise` shows no new app-to-package boundary violation.
- [ ] Both client and server compile against the same version constant.

## Debug
If the handshake dies with `4004`, the client and server disagree on
`PROTOCOL_VERSION`. If it dies with `4009`, the payload failed schema validation
— compare the fixture to the generated envelope, not to the message alone.

## Update Scaffold
- [ ] Update `context/packages.md` if a new limit or invariant was introduced.
- [ ] Update `.mex/ROUTER.md` "Current Project State" if what works changed.
- [ ] Add a new pattern only if this task type is genuinely different.
