# Originality Log

This log records provenance decisions for Lanternfall's identity and content.
It exists to keep the project original and to make any accidental similarity
easy to audit.

## 2026-11-24 — Milestone 1 identity decision

- **Product name:** Lanternfall. Chosen as an original name for this project.
- **Setting name:** Kestrel Basin, an original region used in the shell copy.
- **Repository:** The existing clone is named `PZ-Online` and retains the
  original planning notes under `PZ Online iPad/`. The product, package scope
  (`@lanternfall/*`), UI, and documentation use Lanternfall. The folder name is
  historical and is not a content claim.
- **Positioning:** Lanternfall is an original iPad-first zombie-survival
  sandbox. It is not a port, remake, or redistribution of Project Zomboid code,
  maps, art, audio, UI, item data, or writing.
- **No copied game content:** Milestone 1 contains no Project Zomboid assets,
  map data, item lists, character names, sounds, fonts, or extracted files.
  The bootstrap chunk is generated procedurally from an original palette and
  layout.

## Visual identity

- Palette: deep slate green `#151a17`, bone `#e8e0cf`, ochre `#e0a64b`, moss
  `#7fa36b`, and brick `#c96b5a`. Chosen for the shell and recorded here as an
  original project palette.
- Typography: system UI sans-serif and Georgia/serif fallbacks only. No font
  files are bundled or redistributed.
- Emblem: an original hand-authored SVG lantern glyph
  (`apps/client/public/icons/icon.svg`). No traced or generated-from-reference
  third-party mark was used.
- Scene: roads, grass tones, grid, and survivor marker are drawn from code with
  project-owned colors and a seeded PRNG. No tile atlas or ripped sprite is
  present.

## Third-party code

Runtime dependencies are used under their own licenses and are not claimed as
project content:

| Dependency        | License | Use                                      |
| ----------------- | ------- | ---------------------------------------- |
| Phaser 4.2.1      | MIT     | Isometric WebGL game rendering           |
| React / React DOM | MIT     | HUD and diagnostics UI                   |
| Fastify           | MIT     | HTTP server                              |
| `ws`              | MIT     | WebSocket server                         |
| `jose`            | MIT     | JWT verification and development signing |
| Zod               | MIT     | Protocol and environment validation      |
| Vite              | MIT     | Client dev server and bundler            |
| Turborepo         | MPL-2.0 | Task orchestration                       |
| pnpm              | MIT     | Package manager                          |

License texts remain with their packages. This table is attribution tracking,
not legal advice.

## Rules for future content

1. Record every externally sourced asset in `docs/asset-register.md` with source,
   license, author, and retrieval date before committing it.
2. Do not use Project Zomboid assets, extracted game files, community rips, or
   recognisable derivatives.
3. Generate or commission art with a written provenance trail. Keep prompts,
   source files, and edits for generated assets.
4. Prefer original names for places, items, and characters. Run a trademark
   search before public branding.
5. If a reference is used for mood or mechanics, document the reference and
   describe how the implementation differs. Mechanics are not copied files, but
   the project still commits to original expression.
