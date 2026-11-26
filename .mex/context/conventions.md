---
name: conventions
description: How code is written in this project — naming, structure, patterns, and style. Load when writing new code or reviewing existing code.
triggers:
  - "convention"
  - "pattern"
  - "naming"
  - "style"
  - "how should I"
  - "what's the right way"
edges:
  - target: context/architecture.md
    condition: when a convention depends on understanding the system structure
  - target: context/stack.md
    condition: when a convention depends on a specific library or tool
  - target: patterns/INDEX.md
    condition: when the task matches an existing project pattern
grounds_to: []
last_updated: 2026-11-25
mex:
  id: mx_01M88NM5F10AJHP932SWKB9152
  type: convention
  status: promoted
  revision: 3
  title: conventions
  relations:
    - type: related_to
      target: mx_01M88NM5EH1VCT3WG3WSSD1EFQ
      note: when a convention depends on understanding the system structure
    - type: related_to
      target: mx_01M88NM5FJZYQPPCE2FA3SE2VF
      note: when a convention depends on a specific library or tool
---

# Conventions

## Naming

- Workspace packages use the `@lanternfall/*` scope; directory names are
  lowercase kebab-case (`packages/shared`, `apps/game-server`, `apps/client`).
- Source files are mostly lowercase kebab-case TypeScript
  (`apps/game-server/src/rate-limit.ts`, `apps/client/src/net/dev-auth.ts`);
  React component files under `apps/client/src/ui/` are PascalCase
  (`apps/client/src/ui/DiagnosticsOverlay.tsx`).
- Functions and variables are camelCase; classes, interfaces, and type aliases
  are PascalCase. Constants are SCREAMING_SNAKE_CASE (`PROTOCOL_VERSION`,
  `DEFAULT_RATE_LIMITS`).
- Branded ids are named `<Noun>Id` and constructed through an `as<Noun>Id()`
  helper (`PlayerId` / `asPlayerId`, `EntityId` / `asEntityId`) rather than a raw
  assertion in call sites.
- Zod schemas end in `Schema` for values (`SoundEventSchema`) and use bare
  PascalCase for message unions (`ClientMessage`, `ClientEnvelope`).

## Structure

- `packages/` holds reusable libraries; `apps/` holds deployable services. A
  package never imports from an app, and apps import each other's code only
  through published package entrypoints — dependency-cruiser enforces this.
- Reusable packages export through `packages/shared/src/index.ts` and
  `packages/protocol/src/index.ts`; internal modules are imported by relative
  path inside the package only.
- Wire schemas and constants live in `packages/protocol`; shared gameplay math,
  ids, and domain types live in `packages/shared`. Do not define a wire format in
  an app.
- Tests sit next to the code under each workspace's `test/` directory
  (`packages/protocol/test/*.test.ts`, `apps/game-server/test/*.test.ts`).
- Shared test setup comes from `@lanternfall/config/vitest`; do not hand-roll a
  second Vitest config.
- `apps/client/src/runtime/game.ts` is loaded as a lazy chunk; keep Pixi imports
  out of `ui/` and `apps/client/src/main.tsx` so the shell paints before the renderer loads.

## Patterns

Never use `any` or leave unused bindings. ESLint treats both as errors, with
leading underscores allowed for intentionally unused parameters:

```
// Correct
const onTick = (_now: number): void => { /* no-op */ };

// Wrong
const onTick = (now: any): void => { ... };
```

Parse untrusted input at the boundary, then work with the inferred type:

```
// Correct
const parsed = ClientEnvelope.safeParse(raw);
if (!parsed.success) { /* reject with a close code */ return; }
handle(parsed.data);

// Wrong
const message = JSON.parse(raw) as ClientMessage;
handle(message);
```

Use explicit narrow types with `verbatimModuleSyntax`: import types with
`import type`, and respect `noUncheckedIndexedAccess` when indexing arrays or
records.

## Verify Checklist

Before presenting any code:

- [ ] `pnpm lint` passes — no `any`, no unused variables, no broken config globals.
- [ ] `pnpm typecheck` passes under `strict`, `noUncheckedIndexedAccess`, and
      `verbatimModuleSyntax`.
- [ ] `pnpm test` passes; new behavior has a test in the owning workspace.
- [ ] `pnpm depcruise` passes — no app imports into `packages/`, no cycles.
- [ ] Wire changes update both protocol schemas and their fixtures; the version
      constant is bumped when the format is incompatible.
- [ ] New server env vars are added to `.env.example` and validated in
      `apps/game-server/src/env.ts`.
- [ ] New client public config uses the `VITE_` prefix and is documented in
      `docs/architecture.md` / `docs/checklist.md`.
- [ ] `pnpm format:check` passes — `docs/architecture.md` is intentionally
      excluded from Prettier and must stay verbatim.
