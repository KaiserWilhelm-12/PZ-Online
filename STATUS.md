# Status / Checklist

## Completed
- [x] Client Vite+React+TS scaffold
- [x] Three.js isometric-style orthographic scene (ground, grid, trees)
- [x] Server-authored building layout rendered from schema state (client no longer invents walls)
- [x] Player mesh + WASD + touch joystick movement
- [x] Camera follow
- [x] Building collision, client (sliding) and server (authoritative)
- [x] Remote player rendering (greyed while dead)
- [x] Zombie rendering + state color
- [x] Loot rendering
- [x] HUD with HP and stamina bars
- [x] Combat depth: four weapons (fists/knife/bat/axe) with per-weapon damage, cooldown, stamina cost and knockback; blunt weapons also stagger the zombie (700 ms, path invalidated)
- [x] Weapon pickups: loot now drops knife/bat/axe; picking one up unlocks it, tapping it in the inventory panel equips it (server validates ownership)
- [x] HUD shows the equipped weapon; the attack button gates on that weapon's stamina cost
- [x] Inventory panel (filled only by server-confirmed pickups)
- [x] Attack button (melee nearest zombie, stamina cost + cooldown)
- [x] Pickup button (nearest loot, server-confirmed)
- [x] Player death on zombie attack + respawn (5 s, full HP, random open spot) + death overlay
- [x] Colyseus 0.18 GameRoom (players, zombies, loot, buildings, tick AI)
- [x] Server-authoritative zombie AI (idle/roam/chase/attack/dead), corpse despawn + replacement spawn
- [x] Zombie pathfinding: grid A* over a baked walkable map (`findPath` in `server/src/world.ts`), 8-way with no corner cutting, rubber-band smoothing, cached per zombie and re-planned at most every 600 ms; falls back to straight-line steering when no path is found. Verified by `server/pathcheck.mjs`.
- [x] Server validates movement (max step), melee (range, cooldown, stamina, alive) and pickup (range, alive)
- [x] Two+ client sync via schema callbacks
- [x] Disconnect handling (onLeave removes player)
- [x] Join error surfaced in UI (room full, server down)
- [x] Runnable multiplayer smoke test (`client/smoke.mjs`)
- [x] README + env examples

## Partial
- [~] Inventory: flat list from pickups; weapons unlock individually but there is no weight, stacking or crafting
- [~] Reconnect: not implemented (refresh loses session)
- [~] Persistence: none (in-memory only)
- [~] Audio: none
- [~] Mobile Safari: not tested on physical device

## Not started
- [ ] Phase 3+ (crafting, safehouses, vehicles, weather, time of day, skills, map, audio, persistence)
- [ ] Chunk loading / world streaming
- [ ] Account/registration (8 registered, 4 simultaneous)
- [ ] Per-client message rate limiting
- [ ] E2E browser tests

## Known bugs / limitations
- Bundle ~947 KB (Three.js) — code-split when the extra request becomes worth it.
- Camera orthographic frustum is fixed height 24 units; very wide/short viewports see a lot horizontally.
- No reconnection; refresh loses session (multiplayer state is in-memory).
- Trees are cosmetic only (no collision), deliberately, to keep the world cheap on iPad.
