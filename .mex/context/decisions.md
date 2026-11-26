---
name: decisions
description: Key architectural and technical decisions with reasoning. Load when making design choices or understanding why something is built a certain way.
triggers:
  - "why do we"
  - "why is it"
  - "decision"
  - "alternative"
  - "we chose"
edges:
  - target: context/architecture.md
    condition: when a decision relates to system structure
  - target: context/stack.md
    condition: when a decision relates to technology choice
  - target: context/conventions.md
    condition: when a decision changes how code must be written
grounds_to: []
last_updated: 2026-11-25
mex:
  id: mx_01M88T5M38AG876GTN5KB97S07
  type: architecture
  status: promoted
  revision: 4
  title: decisions
  relations:
    - type: related_to
      target: mx_01M88NM5EH1VCT3WG3WSSD1EFQ
      note: when a decision relates to system structure
    - type: related_to
      target: mx_01M88NM5FJZYQPPCE2FA3SE2VF
      note: when a decision relates to technology choice
    - type: related_to
      target: mx_01M88NM5F10AJHP932SWKB9152
      note: when a decision changes how code must be written
---

# Decisions

<!-- HOW TO USE THIS FILE:
     Each decision follows the format below.
     When a decision changes: DO NOT delete the old entry.
     Mark it as superseded, add the new entry above it.
     The history must be preserved — this is the event clock. -->

## Decision Log

<!-- mex:entity
id: mx_01M88T5M0BD53C0P8SEXNDJDMB
type: decision
status: promoted
revision: 2
relations:
  - type: refines
    target: mx_01M88T5M38AG876GTN5KB97S07
    note: Section of decisions in context/decisions.md
-->
### Keep the approved architecture verbatim
**Date:** 2026-11-25
**Status:** Active
**Decision:** `docs/architecture.md` is treated as a frozen Milestone 0 contract,
is excluded from Prettier, and is not edited during implementation.
**Reasoning:** The four approved documents define the boundaries and acceptance
tests; changing them mid-implementation would invalidate the verification
evidence in `docs/checklist.md`.
**Alternatives considered:** Updating the architecture doc as code evolved
(rejected — the checklist references its exact file list and tests).
**Consequences:** When implementation needs a detail the document does not
specify, record it in `docs/tech-debt.md` or a newer doc rather than rewriting
the baseline.

<!-- mex:entity
id: mx_01M88T5KXP862KCFHZBTSG7Y34
type: decision
status: promoted
revision: 2
relations:
  - type: refines
    target: mx_01M88T5M38AG876GTN5KB97S07
    note: Section of decisions in context/decisions.md
-->
### Use a versioned server envelope with a `pong` reply
**Date:** 2026-11-25
**Status:** Active
**Decision:** Server messages use `{ v, ss, msg }`, and `ping` is answered with
`pong` carrying a client timestamp so latency can be measured in the HUD.
**Reasoning:** A single version field lets the gateway reject incompatible
clients with `4004`, while `pong` gives the diagnostics overlay real round-trip
data without a second transport.
**Alternatives considered:** Relying on WebSocket ping frames (rejected — they
do not surface as application data for the diagnostics overlay).
**Consequences:** Any wire-format change must bump `PROTOCOL_VERSION` and
`SUPPORTED_PROTOCOL_VERSIONS` together and update protocol fixtures.

<!-- mex:entity
id: mx_01M88T5KTYY07KDNNFZAZ4VZ2Y
type: decision
status: promoted
revision: 2
relations:
  - type: refines
    target: mx_01M88T5M38AG876GTN5KB97S07
    note: Section of decisions in context/decisions.md
-->
### Verify Supabase tokens on the server, but ship a development-only sign-in
**Date:** 2026-11-25
**Status:** Active
**Decision:** Production JWT verification uses a Supabase secret or JWKS;
`/auth/dev` exists only when `DEV_AUTH_ENABLED=true` and refuses to run in
production.
**Reasoning:** Milestone 1 needs a testable handshake without adding a hosted
auth dependency to local development, while still proving the verification path
is server-owned.
**Alternatives considered:** Client-only mock auth (rejected — it would bypass
the gateway's token checks and hide verification bugs).
**Consequences:** The production verification branch is coded but unexercised;
this is recorded in `docs/tech-debt.md` and must be tested before launch.

<!-- mex:entity
id: mx_01M88T5KRQMEQJZHJACGBYMXQN
type: decision
status: promoted
revision: 2
relations:
  - type: refines
    target: mx_01M88T5M38AG876GTN5KB97S07
    note: Section of decisions in context/decisions.md
-->
### Store reconnect tokens as hashed, single-use values in memory
**Date:** 2026-11-25
**Status:** Active
**Decision:** Reconnect tokens are hashed server-side, rotated on each use,
single-use, and expire after a 120 s grace window; the client keeps the raw
token in `sessionStorage`.
**Reasoning:** A stolen raw token cannot be replayed after the legitimate
client reconnects, and a short grace window bounds the takeover exposure.
**Alternatives considered:** Storing raw tokens in a database (rejected — no
persistence layer exists in Milestone 1) and `localStorage` (rejected — would
survive tab closure beyond the grace window).
**Consequences:** Tokens are lost on server restart, and `sessionStorage` is
listed as technical debt; reconnects across a full page reload in a new tab are
not supported.

<!-- mex:entity
id: mx_01M88T5KNYBHZ994FQNZNJVS7N
type: decision
status: promoted
revision: 2
relations:
  - type: refines
    target: mx_01M88T5M38AG876GTN5KB97S07
    note: Section of decisions in context/decisions.md
-->
### Suspend the socket when the page is hidden
**Date:** 2026-11-25
**Status:** Active
**Decision:** The client closes its WebSocket on `visibilitychange` and performs
one reconnect when the page becomes visible again.
**Reasoning:** iPad tabs are frequently backgrounded; leaving a socket open
creates heartbeat churn and false `HeartbeatTimeout` evictions.
**Alternatives considered:** Keeping the socket alive with more frequent pings
(rejected — wastes battery and still drops under long suspension).
**Consequences:** Server-side heartbeat eviction remains the authority for
truly dead sessions; the reconnect path must reuse the rotated token correctly.

<!-- mex:entity
id: mx_01M88T5KH1JZA501ZSA15XVRDW
type: decision
status: promoted
revision: 2
relations:
  - type: refines
    target: mx_01M88T5M38AG876GTN5KB97S07
    note: Section of decisions in context/decisions.md
-->
### Keep library packages build-free and enforce boundaries in CI
**Date:** 2026-11-25
**Status:** Active
**Decision:** `shared` and `protocol` export TypeScript source and build with
`tsc --noEmit`; dependency-cruiser excludes `dist` and runs as part of
`pnpm verify`.
**Reasoning:** Source-only exports make debugging and typechecking consistent
across apps, while a build gate prevents an app from importing another app.
**Alternatives considered:** Publishing compiled library bundles (rejected —
would require a second build artifact and complicate source maps).
**Consequences:** Package-level `turbo.json` files mark library builds as
output-free; adding a `dist/` import or a cycle fails CI.
