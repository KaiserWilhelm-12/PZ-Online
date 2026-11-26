# Architecture Decisions

## Renderer and persistence direction

**Date:** 2026-11-27

**Status:** Active for implementation

**Decision:** Use Phaser 4.2.1 for the game renderer with an isometric projection,
retain the existing Fastify and `ws` server/protocol, and target server-only
PostgreSQL persistence.

**Context:** The repository already has a working React/Vite shell, strict
protocol validation, Fastify/WebSocket handshake, and movement foundation. The
master specification recommends Phaser, Colyseus, and SQLite, while the
existing approved architecture baseline chose PixiJS, Fastify/`ws`, and
PostgreSQL. The project owner selected Phaser/isometric, Fastify/`ws`, and
PostgreSQL for the implementation roadmap.

**Consequences:**

- Phaser is loaded as a separate client chunk; the React PWA shell and network
  lifecycle remain independent of renderer initialization.
- The Phaser renderer replaces PixiJS without changing the existing wire
  protocol or server transport.
- PostgreSQL remains a planned server-only dependency until migrations and
  repository code are implemented and tested.
- The frozen `docs/architecture.md` remains unchanged as the historical
  approved baseline. This record governs new implementation work.
- Phaser's MIT license and official API are recorded in the asset/dependency
  register; gameplay visuals remain original placeholder geometry until
  original or appropriately licensed assets are added.
