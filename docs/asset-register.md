# Asset Register

Every bundled visual, audio, font, or data asset must be listed here before it
ships. Milestone 1 has no third-party game assets.

## Project-owned assets

| ID           | Asset                       | Path                                                      | Type                | Source                                  | License                               | Status |
| ------------ | --------------------------- | --------------------------------------------------------- | ------------------- | --------------------------------------- | ------------------------------------- | ------ |
| LF-ICON-001  | Lanternfall emblem          | `apps/client/public/icons/icon.svg`                       | SVG icon            | Hand-authored for this project          | Project-owned; repository license TBD | Active |
| LF-UI-001    | HUD and diagnostics styling | `apps/client/src/styles.css`                              | CSS                 | Hand-authored                           | Project-owned; repository license TBD | Active |
| LF-SCENE-001 | Bootstrap chunk             | Generated at runtime in `apps/client/src/runtime/game.ts` | Procedural 2D scene | Original code, palette, and seeded PRNG | Project-owned; repository license TBD | Active |
| LF-UI-002    | Wordmark text               | `apps/client/src/ui/App.tsx`                              | Text                | Original project name                   | Project-owned                         | Active |

`LF-ICON-001` also serves as the manifest icon and Apple touch icon. Milestone 1
does not ship PNG icon variants; see `docs/tech-debt.md` item 17.

## Fonts

No font files are bundled. The client uses platform fonts through CSS stacks:
`Segoe UI`, `-apple-system`, `BlinkMacSystemFont`, `Helvetica Neue`, Georgia,
and monospace fallbacks. Nothing is redistributed.

## Audio

None. The audio system is deferred.

## Third-party runtime code

Third-party libraries are dependencies, not assets, and are attributed in
`docs/originality-log.md`. They are installed from the npm registry at the
versions pinned in `pnpm-lock.yaml`; their licenses remain in their packages.

## Data and maps

- No map, tile, item, recipe, or character data has been imported.
- The bootstrap chunk layout is authored in code: grass tones, a horizontal and
  vertical road, a grid, scattered ground detail, and a survivor marker.
- No user data, telemetry, or analytics assets are present.

## Intake checklist for future assets

Before committing an asset:

1. Add a row with a unique ID, path, type, author, source URL, license, and date.
2. Confirm the license permits web distribution and modification.
3. Keep the editable source and any generation prompt or reference notes.
4. Record attribution requirements and where they are displayed.
5. Reject assets with unclear provenance, ripped game files, or missing license
   grants.
