---
name: router
description: Session bootstrap and navigation hub. Read at the start of every session before any task. Contains project state, routing table, and behavioural contract.
edges:
  - target: context/architecture.md
    condition: when working on system design, integrations, or understanding how components connect
  - target: context/stack.md
    condition: when working with specific technologies, libraries, or making tech decisions
  - target: context/conventions.md
    condition: when writing new code, reviewing code, or unsure about project patterns
  - target: context/decisions.md
    condition: when making architectural choices or understanding why something is built a certain way
  - target: context/setup.md
    condition: when setting up the dev environment or running the project for the first time
  - target: patterns/INDEX.md
    condition: when starting a task — check the pattern index for a matching pattern file
  - target: patterns/add-server-message-handler.md
    condition: when adding a new inbound message handler
  - target: patterns/add-protocol-message.md
    condition: when adding or changing a wire message or protocol version
  - target: patterns/run-verify-gates.md
    condition: when running or interpreting the full verification suite
  - target: patterns/debug-connection.md
    condition: when a handshake, drop or reconnect failure needs diagnosis
  - target: context/knowledge-pairings.md
    condition: when checking code-to-knowledge pairings, query history links, or active work memory
last_updated: 2026-11-25
---

# Session Bootstrap

If you haven't already read `AGENTS.md`, read it now — it contains the project identity, non-negotiables, and commands.

Then read this file fully before doing anything else in this session.

## Current Project State

**Working:**

- pnpm 9.15.0 monorepo with strict TypeScript, ESLint, Prettier, Turbo, Vitest,
  dependency-cruiser, and a single `pnpm verify` gate that passed with 47 tests.
- `@lanternfall/protocol` with Zod envelopes for every client/server message,
  fixtures, close codes, and protocol version 1.
- `@lanternfall/shared` with branded ids, chunk helpers, clamped math, and a
  deterministic PRNG.
- Fastify game server with `/healthz`, `/readyz`, `/metrics`, development-only
  `/auth/dev`, JWT verification, hello deadline, rate limits, sequence checks,
  session takeover, rotating reconnect tokens, and heartbeat eviction.
- React 19 + PixiJS 8 PWA shell with a generated bootstrap chunk, iPad-first HUD,
  resilient WebSocket client with background suspend/resume, and diagnostics.
- Verified live: server health, dev sign-in, `hello → welcome`, `ping → pong`,
  `.env`-only boot, and client render/connection in Chromium.

**Not yet built:**

- Gameplay simulation: movement, combat, inventory, and persistence (Milestone 2+).
- Production sign-in UI and Supabase client integration.
- Database, Redis, background workers, and authoritative snapshots of a world.
- Physical iPad Safari validation, GitHub Actions run, and Render deployment.

**Known issues:**

- Supabase production JWT verification is coded but unexercised against a live project.
- Reconnect tokens live in `sessionStorage` and only in server memory; they are
  lost on server restart and do not survive a new tab.
- `docs/architecture.md` is frozen by approval and excluded from Prettier.
- Current gzipped bundle total is 250,969 B; the configured budget is 6 MiB, so
  growth must stay under `scripts/check-bundle-size.mjs`.
- `mex check` previously flagged the undocumented `typecheck` and `depcruise`
  root scripts; `context/conventions.md` and `context/setup.md` now document both.

## Routing Table

Load the relevant file based on the current task. Always load `context/architecture.md` first if not already in context this session.

| Task type | Load |
|-----------|------|
| Understanding how the system works | `context/architecture.md` |
| Working with a specific technology | `context/stack.md` |
| Writing or reviewing code | `context/conventions.md` |
| Making a design decision | `context/decisions.md` |
| Setting up or running the project | `context/setup.md` |
| Working on shared libraries, wire schemas or seeded math | `context/packages.md` |
| Working on the Fastify/ws gateway or server config | `context/game-server.md` |
| Working on the React/Pixi client shell | `context/client.md` |
| Any specific task | Check `patterns/INDEX.md` for a matching pattern |

## Behavioural Contract

For every task, follow this loop:

1. **CONTEXT** — Load the relevant context file(s) from the routing table above. Check `patterns/INDEX.md` for a matching pattern. If one exists, follow it.
2. **BUILD** — Do the work. If a pattern exists, follow its Steps. If you are about to deviate from an established pattern, say so before writing any code — state the deviation and why.
3. **VERIFY** — Load `context/conventions.md` and run the Verify Checklist item by item. State each item and whether the output passes. Do not summarise — enumerate explicitly.
4. **DEBUG** — If verification fails or something breaks, check `patterns/INDEX.md` for a debug pattern. Follow it. Fix the issue and re-run VERIFY.
5. **GROW** — After meaningful work, run this binary checklist:
   - **Ground:** What changed in reality? Name the changed behavior, system, command, dependency, or workflow.
   - **Record:** If project state changed, update the "Current Project State" section above. If documented facts changed, update the relevant `context/` file surgically. Record a new behavioral claim about specific code as its own entity (`mex wiki apply` with a `create-entry` operation), grounded to every symbol whose change could make it false and naming the identifiers and literals it depends on. Ground with node ids only; MEX records the fingerprints. Give the entity 3 to 6 `aliases` (short plain-word phrases a developer would type for the symptom or outcome it covers, written from the claim itself, not its title or identifiers).
   - **Connect:** Link section entities to their enclosing knowledge with `refines` using existing ids. Preview missing structural links with `mex wiki link-sections`, then apply explicitly. Review semantic relationships from evidence; do not connect records just because they share keywords or code groundings.
   - **Orient:** If this task can recur and no pattern exists, create one in `patterns/` using `patterns/README.md`, then add it to `patterns/INDEX.md`. If a pattern exists but you learned a gotcha, update it.
   - **Write:** Bump `last_updated` in every scaffold file you changed. Read `mex logging --json` before optional `mex log` notes: `significant` records material rationale, `checkpoints` batches useful notes at task/session boundaries, and `manual` avoids unsolicited notes. Honor explicit user log requests in every mode; mandatory workflow Activity and recovery audits remain required.
