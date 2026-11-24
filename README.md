# Zomboid Web (iPad Survival Multiplayer) — Vertical Slice

Original, non-copyrighted survival game inspired by Project Zomboid. Touch-first, isometric, server-authoritative multiplayer (max 4 simultaneous). Target: iPad 10th gen Safari.

## Stack
- Client: React + TypeScript + Vite + Three.js + Zustand
- Server: Node.js + TypeScript + Colyseus 0.18 (`@colyseus/core`, `@colyseus/ws-transport`) + WebSockets
- State: server owns the world (buildings, zombies, loot, players); client renders what the server says and predicts only its own movement

## Prerequisites
- Node.js 20+ (tested 26.x)
- npm 10+
- Windows: use `cmd /c` if PowerShell blocks npm scripts.

## Install
```bash
cd client && npm install
cd ../server && npm install
```

## Run (dev)
Terminal 1 (server):
```bash
cd server && npm run dev
```
Terminal 2 (client):
```bash
cd client && npm run dev
```
Open http://localhost:5173. Start a second tab/browser to test two-player.

## Build
```bash
cd client && npm run build
cd ../server && npm run build
```

## Smoke test (real multiplayer, no browser)
```bash
cd server && npm run dev        # in another terminal
cd client && node smoke.mjs
```
Joins the room and asserts: state/buildings arrive, teleport and out-of-range hit/pickup are rejected, walking + pickup is confirmed by the server, melee kills and drains stamina, zombies can kill you and you respawn at full HP elsewhere.

## Pathfinding check (no server needed)
```bash
cd server && npm run build && node pathcheck.mjs
```
Asserts the A* grid can cross the map, routes around buildings instead of through them, survives an unreachable goal, and handles same-cell queries.

## Environment
Client (`client/.env`):
- `VITE_SERVER_URL` (default `ws://localhost:2567`)

Server (`server/.env` or process env):
- `PORT` (default `2567`)

## Deploy (free-first)
- Server: Render / Railway free tier or Fly.io. Set `PORT`. WebSocket support must be enabled (Render and Fly do this by default).
- Client: Vercel / Netlify / GitHub Pages. Set `VITE_SERVER_URL` to the deployed `wss://` URL.
- DB (later phases): Supabase free tier.

## Controls
- WASD or on-screen joystick: move
- Attack: melee nearest zombie within 2.5 units (cost/cooldown depend on the weapon)
- Pickup: nearest loot within 2.5 units (item is added when the server confirms)
- Equip: tap a weapon chip in the inventory panel (top right); you can only equip weapons you have picked up
- Death: you respawn at a random open spot after 5 s

## Combat
| Weapon | Damage | Cooldown | Stamina | Knockback | Stagger |
|--------|--------|----------|---------|-----------|---------|
| Fists (start) | 14 | 450 ms | 12 | 0.4 | — |
| Knife | 30 | 380 ms | 10 | 0.15 | — |
| Bat | 24 | 620 ms | 18 | 1.4 | 700 ms |
| Axe | 40 | 850 ms | 26 | 0.7 | — |

Zombies have 50 HP. Blunt knockback shoves the zombie and (bat) freezes it briefly, cancelling its cached path; bladed weapons trade control for damage. Numbers live in `server/src/weapons.ts`; the client mirrors only label + stamina cost in `client/src/weapons.ts` (the server stays authoritative).

## Architecture notes
- `server/src/world.ts` generates the building map deterministically and is the single source of truth; the client receives buildings through schema state.
- Movement, hit and pickup messages are validated server-side (distance, cooldown, stamina, per-message max step).
- Server schema uses Colyseus schema decorators, which require `experimentalDecorators: true` **and** `useDefineForClassFields: false` in `server/tsconfig.json`. Removing either silently breaks state encoding.

## Troubleshooting
- PowerShell "running scripts disabled": use `cmd /c "npm ..."`.
- Port 2567 in use / `EADDRINUSE`: a stale dev server is still running. `Get-NetTCPConnection -LocalPort 2567 -State Listen | Select OwningProcess` then `Stop-Process -Id <pid> -Force`. Two servers on one port means clients hit an old schema.
- `seat reservation expired` / `404` on matchmaking: the client SDK and server must be on the same Colyseus major (both 0.18 here), and the server must start via `gameServer.listen(port)` so `/matchmake` routes are registered.
- State desync or `Symbol.metadata` crash: check `server/tsconfig.json` has both decorator flags above.
- Safari WebGL: ensure hardware acceleration on; the renderer already caps pixel ratio at 2.
- No multiplayer: confirm server running and `VITE_SERVER_URL`.

## Status
See `STATUS.md`.
