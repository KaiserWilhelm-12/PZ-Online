---
name: run-verify-gates
description: Running the full Milestone 1 verification suite and reading each gate correctly on this Windows host.
triggers:
  - "verify"
  - "run tests"
  - "build check"
  - "bundle budget"
  - "secret scan"
  - "ci gates"
edges:
  - target: context/setup.md
    condition: when the commands fail because of local toolchain or PATH issues
  - target: context/conventions.md
    condition: when a gate flags a naming, type or boundary violation
  - target: patterns/add-protocol-message.md
    condition: when a protocol change caused the failure
grounds_to: []
last_updated: 2026-11-25
mex:
  id: mx_01M88T5MFGC096FKCTQCP75SGW
  type: pattern
  status: promoted
  revision: 4
  title: run-verify-gates
  relations:
    - type: related_to
      target: mx_01M88NM5F9RS36QYX0CCNTAZEY
      note: when the commands fail because of local toolchain or PATH issues
    - type: related_to
      target: mx_01M88NM5F10AJHP932SWKB9152
      note: when a gate flags a naming, type or boundary violation
    - type: related_to
      target: mx_01M88T5M83HJV1NFQGNSC9JDTZ
      note: when a protocol change caused the failure
---

# Run Verify Gates

## Context
`pnpm verify` is the single acceptance command for this milestone. Read
`context/setup.md` for the exact commands and `context/conventions.md` for the
rules each gate enforces. The approved `docs/architecture.md` is excluded from
Prettier and must not be reformatted.

## Steps
1. Use the pinned pnpm 9.15.0: `corepack enable`, or invoke the portable
   `pnpm.cmd` from `C:\Users\NV24170\AppData\Local\Temp\opencode\lanternfall-tools\pnpm`.
2. Run `pnpm verify` from the repository root, not the container directory.
3. Read gates in order: lint, typecheck, tests, depcruise, build,
   `check:bundles`, `check:secrets`.
4. For a single gate use `pnpm lint`, `pnpm typecheck`, `pnpm test`,
   `pnpm depcruise`, `pnpm build`, `pnpm check:bundles`, or `pnpm check:secrets`.
5. Record actual numbers in `docs/checklist.md`: test count, modules and
   dependencies from depcruise, and gzipped bundle bytes.

## Gotchas
- PowerShell execution policy blocks `pnpm.ps1` and `npm.ps1`; use `pnpm.cmd`,
  `npm.cmd`, or Git Bash.
- `format:check` covers Prettier but is not part of `verify`; run it separately
  before a release, and leave `docs/architecture.md` untouched.
- `typecheck` and `depcruise` are root scripts but are now documented in
  `context/conventions.md` and `context/setup.md` so scaffold drift checks
  recognise them.
- Library packages intentionally produce no build output; a `turbo` cache miss
  is not a failure.
- Bundle budget is measured on the gzipped client bundle, not raw bytes.

## Verify
- [ ] Every gate prints a success exit code.
- [ ] Test count and bundle size are recorded rather than approximated.
- [ ] No secret or `.env` file is left in the working tree after live checks.
- [ ] Temporary dev servers are stopped and browser tabs closed.

## Debug
If depcruise reports a cycle, the usual cause is an app importing another app
or a package importing from `apps/`. If `check:secrets` fails after adding docs,
remove the real value and point to `.env.example` instead.

## Update Scaffold
- [ ] Update `docs/checklist.md` with new evidence after a passing run.
- [ ] Update `context/setup.md` if commands or tools changed.
