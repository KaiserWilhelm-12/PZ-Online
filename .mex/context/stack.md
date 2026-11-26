---
name: stack
description: Technology stack, library choices, and the reasoning behind them. Load when working with specific technologies or making decisions about libraries and tools.
triggers:
  - "library"
  - "package"
  - "dependency"
  - "which tool"
  - "technology"
edges:
  - target: context/decisions.md
    condition: when the reasoning behind a tech choice is needed
  - target: context/conventions.md
    condition: when understanding how to use a technology in this codebase
# Broad inventory: ground only claims embodied by a small number of symbols.
# Entry shape: { node: "function:<tier-1-id>" } (MEX records the fingerprint)
grounds_to: []
last_updated: 2026-11-25
mex:
  id: mx_01M88NM5FJZYQPPCE2FA3SE2VF
  type: architecture
  status: promoted
  revision: 3
  title: stack
  relations:
    - type: related_to
      target: mx_01M88T5M38AG876GTN5KB97S07
      note: when the reasoning behind a tech choice is needed
    - type: related_to
      target: mx_01M88NM5F10AJHP932SWKB9152
      note: when understanding how to use a technology in this codebase
---

# Stack

<!-- Keep grounding sparse here. For a concrete wrapper or adapter mention, use:
```markdown
[`someFunction()`](mex://function:<tier-1-id>)
```
-->

## Core Technologies

- **TypeScript 5.7 (strict)** — every package and app; `noUncheckedIndexedAccess`,
  `verbatimModuleSyntax`, `noUnusedLocals`, and no emit for library packages.
- **Node.js 22** — runtime for the server and tooling; `.nvmrc` pins the major.
- **pnpm 9.15.0 workspaces + Turborepo 2** — `apps/*` and `packages/*`; Turbo
  orchestrates `dev`, `build`, and `typecheck`.
- Fastify 5 with `ws` for WebSockets — HTTP endpoints and the WebSocket gateway in one process.
- **React 19 + Vite 6** — client shell, with PixiJS 8 loaded as a separate
  bootstrap chunk.
- **Vitest 2** — unit and integration tests across all workspaces.

## Key Libraries

- Zod v3 (schema library) — the single source of truth for wire formats in
  `packages/protocol`; parse before acting and infer types with `z.infer`.
- jose (JWT library) — JWT verification (HS256 secret or remote JWKS) and development
  token signing; do not add a second JWT library.
- **PixiJS 8 (not Canvas 2D / raw WebGL)** — all world rendering; the runtime
  counts draw calls by wrapping `gl.draw*`.
- **dependency-cruiser** — enforces package boundaries and forbids circular
  imports; `dist` is excluded so built output is not inspected.
- tsup (server bundler) — bundles the server to `dist/`; library packages only run
  `tsc --noEmit`.

## What We Deliberately Do NOT Use

- **No ORM or database yet** — session state is in-memory; persistence is a
  later milestone, not a Milestone 1 change.
- **No client-side authority** — no local movement simulation, no client-side
  loot rolls, no optimistic inventory mutation.
- **No Redux/Zustand** — the shell uses React state plus plain classes for
  socket and runtime ownership.
- **No CSS framework** — hand-written CSS with custom properties and safe-area
  insets keeps the iPad HUD predictable.
- **No second WebSocket library** — `ws` is the only server transport; the
  browser uses native `WebSocket`.

## Version Constraints

- Node 22 is required (`engines.node >= 22`); the server relies on
  `process.loadEnvFile`.
- pnpm 9.15.0 is pinned through `packageManager`; use Corepack rather than a
  global install of another major.
- Protocol version is `1`; bump `PROTOCOL_VERSION` and
  `SUPPORTED_PROTOCOL_VERSIONS` together or the gateway rejects every client.
