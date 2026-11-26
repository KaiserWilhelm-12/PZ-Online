---
name: architecture
description: How the major pieces of this project connect and flow. Load when working on system design, integrations, or understanding how components interact.
triggers:
  - "architecture"
  - "system design"
  - "how does X connect to Y"
  - "integration"
  - "flow"
edges:
  - target: context/stack.md
    condition: when specific technology details are needed
  - target: context/decisions.md
    condition: when understanding why the architecture is structured this way
# Broad overview: keep this empty unless a claim depends on a few specific symbols.
# Entry shape: { node: "function:<tier-1-id>" } (MEX records the fingerprint)
grounds_to: []
last_updated: 2026-11-27
mex:
  id: mx_01M88NM5EH1VCT3WG3WSSD1EFQ
  type: architecture
  status: promoted
  revision: 3
  title: architecture
  relations:
    - type: related_to
      target: mx_01M88NM5FJZYQPPCE2FA3SE2VF
      note: when specific technology details are needed
    - type: related_to
      target: mx_01M88T5M38AG876GTN5KB97S07
      note: when understanding why the architecture is structured this way
---

# Architecture

<!-- Read broad, ground tight. Architecture usually grounds sparsely. When a
     specific symbol is worth navigating to, use this inline form:
```markdown
[`someFunction()`](mex://function:<tier-1-id>)
```
-->

## System Overview

A browser client (React shell + Phaser isometric canvas) authenticates over HTTP, then
opens one WebSocket to the game server and sends a `hello` message carrying its
JWT and the server id it expects. The gateway validates the envelope and
payload against `@lanternfall/protocol`, verifies the token, registers a
`GameSession`, and answers with `welcome` (plus a rotated reconnect token).
After that, the client streams `input`, `interact.*`, `chat`, and `ping`
messages; the server guards each one with sequence checks and token-bucket rate
limits, processes prototype movement input, replies with `pong`/`snapshot`/
`error`, and evicts sessions that miss the heartbeat deadline. The client
renders a geometric 32×32 isometric neighborhood, supports tile selection, and
reports FPS, latency, traffic, and draw calls in a diagnostics overlay.
The gateway advances movement on configured fixed ticks (20 Hz by default),
expires input after 250 ms, and broadcasts active-session snapshots to every
connected client. Positions use 1/16-tile integers, and entity IDs remain stable
in memory during the reconnect grace period. This is not world persistence or
world isolation; collision, prediction/reconciliation, and interpolation are
not implemented.

## Key Components

- **`packages/protocol`** — Zod schemas and TypeScript types for every client and
  server message, close codes, protocol-error payloads, and the version
  constants; the only place wire formats are defined.
- **`packages/shared`** — deterministic PRNG, seeded math and isometric projection helpers, branded id
  types, chunk constants, and domain interfaces (items, containers, body
  regions) shared by client and server.
- **`apps/game-server`** — Fastify HTTP surface (`/healthz`, `/readyz`,
  `/metrics`, `/auth/dev`) plus the `ws`-based `GameGateway`; owns auth
  verification, rate limiting, session registry, and reconnect tokens.
- **`apps/client`** — Vite/React 19 PWA shell. `GameConnection` owns the socket
  lifecycle, `GameRuntime` boots Phaser 4.2.1 in a separate chunk, `DiagnosticsCollector`
  feeds the overlay.
- **`infrastructure/` and `.github/`** — Render blueprint and CI gates (lint,
  typecheck, test, dependency-cruiser, build, bundle budget, secret scan).

## External Dependencies

- **Supabase Auth** — issues the JWTs the gateway verifies, either through a
  shared HS256 secret or a remote JWKS URL. Production verification is coded but
  has not been exercised against a live project.
- Fastify 5 — HTTP server, logging, and the upgrade path that hands sockets
  to `ws`.
- Phaser 4.2.1 — WebGL renderer for the isometric neighborhood; loaded lazily so the
  React shell paints before the renderer bundle arrives.
- **Render** — hosting target described by `infrastructure/render.yaml`; CI and
  live deployment are not yet exercised.

## What Does NOT Exist Here

- No fixed-tick simulation, collision, multi-player entity replication, combat,
  inventory, or persistence; movement handling is a prototype only.
- No database, Redis, or background worker yet; PostgreSQL is the selected
  persistence target, while sessions still live in process memory.
- No production sign-in UI or Supabase client integration; only the
  development-only `/auth/dev` endpoint issues tokens today.
- No offline gameplay or client-side world simulation; the service worker caches
  the shell only.
- No asset pipeline or authored art; the visible world is generated from
  `createPrng` and `deriveSeed`.
