# Lanternfall: Architecture Baseline (Milestone 0)

Working title. Lead-developer architecture document, 24 Nov 2026.

Status: baseline. Decisions below are made, not offered as options. Reversible ones can change at a milestone boundary and will be logged in the changelog.

## 0. How I read your three files

Your directive and guidelines say: decide, build, one milestone per response, complete files, never claim untested code. The master prompt says the first response must be the architecture package. These agree: this document is Milestone 0 (design only, no claims of tested code). The next response is Milestone 1, with complete scaffold files.

Assumptions, documented per the directive:

- A1. iPad 10th gen means an A14 chip, 4 GB RAM, Safari with WebGL2. I do not rely on WebGPU. Every memory and frame number below is a target to measure, not a measured fact.
- A2. pnpm workspaces and Turborepo, Vitest for tests, ESLint and Prettier, GitHub Actions for CI.
- A3. Fastify handles HTTP (health, admin API). The ws library serves the game socket on the same HTTP server through a manual upgrade handler.
- A4. Supabase CLI SQL migrations. The game server uses a server-only Postgres connection. Clients never query game tables; row-level security is deny-all for the anon and authenticated roles on game tables. Clients use Supabase only for sign-in.
- A5. Free tiers are for development only. As I understand it, free Render web services sleep when idle and free Supabase projects can pause. Verify current terms before relying on either. A real 10-player server needs an always-on paid Render instance and a Supabase plan with backups.
- A6. Library APIs (PixiJS v8, Zod, Fastify, ws) are used as I know them. Each first use compiles and passes a CI test before anything depends on it.

## 1. Original identity

**Setting.** Kestrel Basin, a fictional river-valley region of grain mills, cold storage and barge freight. Its hub is Orrin's Ford (about 6,000 residents), with a textile mill, a co-op grain terminal, a clinic, a reservoir called Tallow Lake and a chain of farm roads.

**Outbreak.** Greywater Fever. Origin is deliberately uncertain: the reservoir is suspected, never confirmed. Timeline: day 0 first clusters near the lake, day 6 quarantine ring, day 11 failed evacuation at the Harrow Bridge checkpoint, day 19 grid instability. Infected are called the Grey. They are people, not monster classes; they differ only by condition (fresh, wasted, crawling).

**Visual and interface language.** A field ledger: slate, ochre and bone palette, stenciled labels, paper tabs, hand-painted pixel sprites. Interface vocabulary is our own: Ledger (journal), Kit (inventory), Wellbeing (status), Know-how (skills), Haven (safehouse).

**Originality controls.** No borrowed names, terms, recipes, numbers, layouts or art. Every feature gets an entry in docs/originality-log.md: is it a genre convention or a distinctive implementation, what are our names and numbers, and how it was independently designed. Anything too close gets redesigned before merge. The asset register (docs/asset-register.md) records source, creator, license and export settings for every asset.

## 2. Projection and rendering

**Decision: angled top-down (3/4 view), orthographic, 32 logical-pixel tiles, 8-direction sprites, PixiJS on WebGL2.**

| Criterion | Isometric | Angled top-down | Winner |
| --- | --- | --- | --- |
| Touch targeting | Needs projection math and depth-sorted hit tests | Inverse camera transform only | Top-down |
| Sprite workload | Diamond tiles, tall objects overlap neighbors | Footprint-bounded objects, easier modular kits | Top-down |
| Visibility and occlusion | Walls hide characters often | Cutaway roofs and floors plus silhouette outlines | Top-down |
| Collision and navigation | Grid shown skewed | Grid matches screen | Top-down |
| Lighting | Harder to bake and mask | Simple 2D light masks | Top-down |
| iPad performance | Heavier depth sorting and overdraw | Cheap y-sort within a floor | Top-down |

Camera: smooth follow, pinch zoom 0.6x to 2.0x, two-finger pan with auto re-center after 3 s, indoor roof and upper-floor hiding, occlusion outlines, reduced motion, shake slider 0 to 100 percent. Floors: slice supports z 0 to 2; basements are deferred.

| Preset | Render scale | Lights | Shadows | Weather and fire | Infected detail | Blood persistence |
| --- | --- | --- | --- | --- | --- | --- |
| Battery Saver | 0.6, 30 fps cap | Baked ambient only | Off | Minimal particles | Reduced animation distance | Short |
| Balanced (default) | 0.75 to 1.0 adaptive | Up to 8 dynamic | Blob | Moderate | Standard | Medium |
| High | 1.0 | Up to 16 dynamic | Blob plus cast on key lights | Full | Full | Long |

## 3. Architecture diagram

```text
iPad Safari / PWA (Vercel static)              Render (always-on)                 Supabase
+--------------------------------+   WSS     +-------------------------------+   +--------------+
| React UI: menus, kit, ledger   |<--------->| Fastify: health, admin API    |   | Auth (JWT)   |
|   ^ Zustand (UI state only)    |           | ws gateway: validate, limit   |<->| Postgres     |
|   | events                     |           |   -> per-session command queue|   | Storage      |
| Game runtime (no React)        |           | Game loop 20 Hz               |   +--------------+
|  - touch input layer           |           |  - simulation package         |
|  - prediction + reconcile      |           |  - sim-level scheduler        |
|  - interpolation buffers       |           |  - infected, sound, combat    |
|  - chunk cache (IndexedDB)     |           |  - interest management        |
|  - PixiJS renderer             |           |  - replication (deltas)       |
+--------------------------------+           |  persistence: ledger+write-back|
                                             +-------------------------------+
```

## 4. Client and server responsibilities

| Concern | Client | Server (authoritative) |
| --- | --- | --- |
| Movement | Predicts own movement, interpolates others | Validates every input, owns true position |
| Combat | Sends intent (attack, facing), plays feedback | Range, arc, timing, line of sight, ammo, damage, death |
| Inventory | Sends move requests with opId and versions | Reachability, capacity, locks, transactions, ledger |
| Loot | Displays | Rolls lazily and persists |
| Crafting and building | Sends intent | Costs, skill, quality, completion, reservations |
| Skills and vitals | Displays | All gain, decay and effects |
| Infected AI and sound | Renders states | Perception, pathing, sound routing, aggregation |
| Vehicles | Owner predicts for feel | Validates movement, parts, fuel, permissions |
| Time and weather | Renders | Owns world clock and weather state |
| Chat and labels | Renders as plain text | Sanitizes, rate-limits, permission checks |
| Admin | Thin UI in apps/admin | Every permission check and audit log |
| Settings, camera, layout | Owns (IndexedDB) | Not involved |

## 5. Monorepo, boundaries, CI

```text
apps/client        Vite + React + PixiJS PWA
apps/game-server   Fastify + ws + game loop + persistence (server-only code lives here)
apps/admin         protected admin UI
packages/protocol  Zod schemas, message types, versions
packages/game-data item, recipe, building, loot-table definitions (data-driven)
packages/simulation pure deterministic rules: movement, collision, needs, spoilage, catch-up
packages/shared    ids, math, seeded PRNG, domain types
packages/config    tsconfig, eslint, vitest presets
packages/testing   fixtures, bot clients, load harness (dev only)
packages/tools     map compiler, atlas packer, schema and asset-register checks (build time)
assets/source  assets/processed  docs  infrastructure
```

Dependency rules, enforced in CI by a boundary check (dependency-cruiser): shared depends on nothing but Zod; protocol depends on shared; game-data on shared; simulation on shared and game-data and performs no I/O, no Date.now and no Math.random (a seeded PRNG is injected); client may use simulation for prediction only; loot generation, persistence, auth and admin logic exist only in apps/game-server; admin depends on protocol and shared only.

Secrets: service-role key and database URL exist only in Render environment variables. The client receives only the Supabase URL and public anon key. Protocol versions are integers; the server accepts N and N-1 during rollout. Save schema versions are separate.

CI order: install, lint, typecheck, unit tests, integration tests (Postgres service container), boundary check, build, bundle-size budget, asset-register check.

## 6. Networking model

- **Transport and handshake.** WSS. First message must be hello (JWT, serverId, optional reconnect token) within 5 s or the socket closes. The server verifies the Supabase JWT using the project's documented verification keys (confirm the exact mechanism in Phase 0), checks membership, and enforces one live session per character.
- **Encoding.** Envelope is v, cs (client sequence), msg. JSON with Zod validation for control messages. Entity snapshots start as quantized JSON and move to a binary DataView codec in Phase 2, only after measurement, with golden-file tests.
- **Tick and snapshots.** 20 Hz fixed 50 ms simulation step on a drift-corrected monotonic clock. Snapshots at 10 Hz, raised to 15 Hz for entities within 12 tiles only if tick time and bandwidth allow. Slow state is event-driven.
- **Prediction.** Client sends inputs (seq, dtMs, move vector, facing, flags) at 20 Hz and applies them with the same movement function the server uses. Server acks the last processed input with the authoritative position. Client rewinds to the ack and replays unacked inputs; it snaps if error exceeds 1.5 tiles and smooths otherwise. Server clamps per-command dt and commands per tick.
- **Interpolation.** Remote entities render 100 to 150 ms in the past from a snapshot buffer, extrapolating at most 100 ms.
- **Deltas.** Per-client baseline acknowledged by snapshot id; changed fields only; full resync on gap.
- **Interest management.** Spatial hash of 16-tile cells. A client receives entities on visible floors within view radius, sound events within audibility radius, group-member status (not position), current interaction targets and its vehicle.
- **Unstable Wi-Fi.** Ping every 5 s, dead after 15 s. Reconnect with exponential backoff and jitter capped at 10 s. Reconnect token is 256-bit random, stored hashed, rotated on every use, valid for a 120 s grace window. A disconnected character stays in the world and remains vulnerable for 60 s (configurable) before being moved to a safe sleeping state, which blocks combat-logging. On pageshow and visibilitychange the client checks the socket and reconnects.
- **Idempotency and order.** Every state-changing command carries an opId UUID; the server dedupes through the ledger and returns the original result on replay. Per-session sequence numbers must increase; duplicates and out-of-order inputs are dropped and counted.
- **Limits.** Token buckets per message type (inputs 30/s, inventory 10/s with burst 20, chat 1/s with burst 5, craft 2/s). Payload caps: 8 KB general, 200 characters chat. Repeated violations kick and log.

## 7. World chunk format and simulation levels

**Coordinates.** Tile (x, y, z). Chunk is 32 by 32 tiles: cx = floor(x / 32). Origin is the Kestrel Basin survey benchmark at the map's southwest corner. Vertical slice target is 64 by 64 chunks (2,048 by 2,048 tiles). Phase 1 starts with an 8 by 8 chunk neighborhood.

**Static chunk file** (compiled by packages/tools from authored data, little-endian binary, brotli or gzip at the CDN):

- Header: magic LFCK, formatVersion u16, cx i16, cy i16, floorMask u8, contentHash u32.
- Per floor: ground tile ids Uint16\[1024\]; wall north-edge material Uint8\[1024\]; wall west-edge material Uint8\[1024\]; room id Uint16\[1024\] (roof cutaway grouping); nav flags Uint8\[1024\] (walkable, blocked, water, stairs, door).
- Object list: count u16, then defId u16, localIndex u16, rotation u8, flags u8. Spawn markers and light list follow.

**Dynamic overlay** (separate, persisted): opened and broken doors and windows, barricades, structures, dropped item container ids, blood, fire, plant state, loot-rolled flags, last simulated world time, version, checksum.

**Loot.** Rolled lazily on first activation of a container from a seeded PRNG of (serverSeed, containerId, lootEpoch), server-side only. The rolled flag persists, so loot never re-rolls by accident.

**Client streaming.** 5 by 5 chunks loaded around the camera (Balanced), unloaded at 7 by 7 for hysteresis, fetched from static hosting and cached in IndexedDB by contentHash. Server active ring is 3 by 3 chunks around each player (configurable).

**Simulation levels.** Active: full collision, AI, combat, sound, fire, interaction. Reduced (one ring beyond active, 1 Hz): aggregate infected migration, generator fuel, plants, spoilage, fire summaries. Dormant: no ticking; on activation, pure idempotent catchUp(state, fromWorldTime, toWorldTime) functions with bounded steps.

**Transition safety.** One EntityRegistry owns all entity ids. Each entity has exactly one simLevel and chunkKey. Transitions run only in the scheduler phase at the start of a tick as atomic synchronous functions: materialize decrements an aggregate count and spawns N entities with deterministic ids derived from (chunkKey, aggregateEpoch, index); dematerialize does the reverse. Invariant test: total infected count is conserved across 10,000 random transitions, and no entity id exists twice.

## 8. Database schema overview

Supabase Postgres. UUID primary keys, created\_at and updated\_at everywhere, version columns for optimistic concurrency, server\_id on every game table.

- **Identity and membership:** profiles, servers (settings jsonb, settings\_version), memberships (role), groups, group\_members, permissions.
- **Characters:** characters (alive, background, appearance, vitals, position, born and died world time, death\_summary, version), wounds, skills (character\_id, skill\_id, xp), character\_conditions (illness, medication, intoxication).
- **Items:** containers (kind, owner reference, parent\_container\_id, nest\_depth, capacity, lock, version) and items (def\_id, container\_id, slot, qty, state jsonb, version). A CHECK constraint guarantees each item sits in exactly one location, and nest depth is capped.
- **Ledger:** item\_ledger (bigserial, server\_id, op\_id uuid with UNIQUE(server\_id, op\_id), kind, item\_id, from, to, qty, actor, at). Append-only. It provides idempotency and the audit trail.
- **World:** chunk\_dynamic (cx, cy, state jsonb, sim\_level, last\_world\_time, version, checksum), structures, openings, vehicles, vehicle\_parts, infected\_aggregates, farms, utilities, fires, world\_events, world\_state (clock, weather, seed).
- **Operations:** chat\_log (metadata and sanitized text), admin\_actions, world\_snapshots (manifest of chunk and character versions), schema\_migrations.
- **Access:** row-level security deny-all for client roles on every game table. Only the game server's connection reads and writes them.
- **Concurrency:** UPDATE ... WHERE version = expected; an in-memory per-container mutation queue; cross-container transfers lock in sorted id order. No per-tick queries. No per-frame writes.

## 9. Core shared TypeScript interfaces

```ts
// packages/shared/src/ids.ts
export type Brand<T, B extends string> = T & { readonly __brand: B };
export type PlayerId = Brand<string, 'PlayerId'>;
export type CharacterId = Brand<string, 'CharacterId'>;
export type ItemId = Brand<string, 'ItemId'>;
export type ContainerId = Brand<string, 'ContainerId'>;
export type OpId = Brand<string, 'OpId'>;
export type EntityId = Brand<number, 'EntityId'>; // runtime-only u32
export const CHUNK_SIZE = 32;
export interface TileCoord { readonly x: number; readonly y: number; readonly z: number }
export interface ChunkCoord { readonly cx: number; readonly cy: number }

// packages/shared/src/domain.ts
export interface ItemDef {
  id: string; massG: number; volumeMl: number; maxStack: number;
  tags: readonly string[]; spoilsAfterHours: number | null; maxDurability: number | null;
}
export interface ItemInstance {
  id: ItemId; defId: string; qty: number; durability: number | null;
  freshness: number | null; wetness: number; contamination: number;
  temperatureC: number; fuel: number | null; ammo: number | null;
  tags: readonly string[]; version: number;
}
export type ContainerKind = 'body' | 'bag' | 'furniture' | 'ground' | 'vehicle';
export interface ContainerState {
  id: ContainerId; kind: ContainerKind; maxMassG: number; maxVolumeMl: number;
  nestDepth: number; lockedBy: PlayerId | null; version: number;
  itemIds: readonly ItemId[];
}
export type BodyRegion = 'head' | 'torso' | 'armL' | 'armR' | 'handL' | 'handR'
  | 'legL' | 'legR' | 'footL' | 'footR';
export type WoundKind = 'scratch' | 'laceration' | 'puncture' | 'bite' | 'bruise'
  | 'burn' | 'deep' | 'fracture' | 'sprain' | 'debris';
export interface Wound {
  id: string; region: BodyRegion; kind: WoundKind; severity: number; // 0..1
  bleedPerMin: number; infection: number; dressed: boolean;
  dressingDirty: boolean; atWorldSec: number;
}
export interface Vitals {
  hunger: number; thirst: number; fatigue: number; bodyTempC: number;
  bloodMl: number; pain: number; endurance: number;
  fear: number; stress: number; morale: number;
}
export type SoundKind = 'footstep' | 'melee' | 'gunshot' | 'glass' | 'door'
  | 'engine' | 'alarm' | 'generator' | 'voice' | 'impact';
export interface SoundEvent {
  id: number; kind: SoundKind; x: number; y: number; z: number;
  intensity: number; durationMs: number; indoor: boolean;
  sourceEntity: number | null; atTick: number;
}

// packages/protocol/src/client.ts
import { z } from 'zod';
export const PROTOCOL_VERSION = 1;
const uuid = z.string().uuid();
const nat = z.number().int().nonnegative();

export const ContainerRef = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('container'), id: uuid }),
  z.object({ kind: z.literal('ground'), x: z.number().int(), y: z.number().int(),
    z: z.number().int().min(0).max(2) }),
]);

export const ClientMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('hello'), token: z.string().max(4096), serverId: uuid,
    reconnectToken: z.string().max(128).optional() }),
  z.object({ type: z.literal('input'), seq: nat, dtMs: z.number().int().min(1).max(100),
    moveX: z.number().min(-1).max(1), moveY: z.number().min(-1).max(1),
    facing: z.number().int().min(0).max(255), flags: z.number().int().min(0).max(255) }),
  z.object({ type: z.literal('inv.move'), opId: uuid, itemId: uuid,
    qty: z.number().int().min(1).max(999), from: ContainerRef, to: ContainerRef,
    expectedFromVersion: nat, expectedToVersion: nat }),
  z.object({ type: z.literal('interact.begin'), opId: uuid, targetId: nat,
    actionId: z.string().max(32) }),
  z.object({ type: z.literal('interact.cancel'), opId: uuid }),
  z.object({ type: z.literal('chat'), channel: z.enum(['local', 'group']),
    text: z.string().min(1).max(200) }),
  z.object({ type: z.literal('ping'), t: nat }),
]);
export type ClientMessage = z.infer<typeof ClientMessage>;
export const ClientEnvelope = z.object({
  v: z.literal(PROTOCOL_VERSION), cs: nat, msg: ClientMessage,
});

// packages/protocol/src/server.ts
export type InvFailure = 'version_conflict' | 'over_capacity' | 'not_reachable'
  | 'locked' | 'not_found' | 'rate_limited';
export interface EntityDelta { // x, y in 1/16 tile units
  id: number; kind: number; x: number; y: number; z: number;
  facing: number; state: number; mask: number;
}
export type ServerMessage =
  | { type: 'welcome'; playerId: string; characterId: string | null;
      worldTimeSec: number; tickRate: number; reconnectToken: string }
  | { type: 'snapshot'; id: number; tick: number; ackInput: number;
      entities: EntityDelta[]; removed: number[] }
  | { type: 'inv.result'; opId: string; ok: boolean; reason?: InvFailure;
      versions: { containerId: string; version: number }[] }
  | { type: 'sound'; event: import('@lanternfall/shared').SoundEvent }
  | { type: 'error'; code: string; fatal: boolean };
```

## 10. Touch-control specification

| Control | Specification |
| --- | --- |
| Joystick (left) | Floating by default, fixed optional. Base radius 64 CSS px, scalable 0.75x to 1.5x. Dead zone 10 percent. Walk below 70 percent deflection, run above. Sneak is a toggle button. Auto-walk latches by swiping up past the stick edge, cancels on any touch. |
| Action cluster (right) | Context button 80 px, Attack 72 px, Push 56 px, two quick-equip slots 56 px, arranged in an arc reachable by the thumb. |
| Radial menu | Long-press 350 ms opens eight sectors, each at least 56 px, release to select, center is the cancel zone. |
| Context action | Shows action name, duration ring and hazard badge. Cancellable. Honors line of sight and floor. Destructive actions (dismantle, destroy, consume a rare item) require hold-to-confirm for 600 ms. |
| Aiming | Drag from the attack button sets facing. Assist cone 0 to 15 degrees snaps to the nearest valid target, never fires on its own. Allies in the line of fire show a warning marker. |
| Camera | Pinch zoom, two-finger pan, tap to re-center. Camera gestures are accepted anywhere not covered by a control. |
| Inventory | Two panels. Tap transfers, drag-and-drop with a 12 px slop, hold an item 400 ms for a quantity slider, search and filters, favorites, locked items, queued transfers, capacity bars. |
| Layout | Left-handed mirror, per-control drag, resize and opacity (20 to 100 percent), saved layouts in IndexedDB. |
| Targets and safety | Minimum 48 CSS px, 56 px default for primary, 8 px spacing, env(safe-area-inset-\*) padding. No hover dependence, no pixel-perfect taps. Double-tap only for non-destructive shortcuts. |
| Input plumbing | Pointer events with per-pointerId tracking, touch-action none on the canvas. System-gesture edge conflicts and palm contacts are to be evaluated on the device. |
| Accessibility | Color-blind-safe palette with shape-coded states, text scale 100 to 200 percent, reduced motion, no keyboard needed anywhere. |

## 11. iPad 10 performance budget

All values are targets until measured on a real device.

| Area | Target |
| --- | --- |
| Frame rate | 30 fps floor (33.3 ms), 60 fps in light scenes. Adaptive render scale 0.6 to 1.0 from a moving average of frame times. |
| Main-thread split at 30 fps | Prediction and sim 4 ms, net decode 1 ms, culling and updates 4 ms, Pixi submit 8 ms, React UI 2 ms, headroom 14 ms or more. |
| Rendering | At most 120 draw calls (Balanced), 2,500 visible sprites, 8 dynamic lights, 300 particles. |
| Infected | At most 60 rendered at full detail per client, 150 fully simulated per player region on the server, beyond that aggregated. |
| Memory | Texture estimate at most 192 MB, JS heap at most 150 MB where measurable, at most 49 chunks cached. 60-minute soak: under 10 percent heap growth after warmup. |
| Network | Average at most 25 KB/s down and 4 KB/s up per client. First load at most 6 MB compressed. Chunk at most 12 KB compressed. |
| Server (10 players) | Tick p50 at most 8 ms and p99 at most 20 ms of the 50 ms budget. Heap at most 512 MB. DB write p95 at most 50 ms. Save flush at most 250 ms. |

## 12. Security model

- **Authority.** The client never decides damage, loot, ownership, crafting, vehicles, health, skill gain, infected death, construction, container contents, teleportation or admin rights.
- **Every message:** protocol version check, Zod validation, authenticated session, sequence check, authorization, rate limit, payload cap.
- **Object authorization.** Every item, container, vehicle and structure access checks reachability (distance, floor, line of sight), permission and lock, then version.
- **Duplication defense.** Transactions, opId idempotency through the unique ledger key, version checks, durable-before-ack for item changes, sorted lock order for transfers and trades, conservation checks in tests.
- **Anti-cheat.** Speed and teleport checks on inputs, fire-rate and reload validation, vehicle movement validation, server-owned clock (client timestamps are advisory only).
- **Injection and XSS.** Parameterized SQL only. Chat, labels and notes render as text nodes, never as HTML.
- **Secrets.** Service-role key and database URL only on the server. The client bundle is scanned in CI for known secret patterns.
- **Admin.** Separate app, role claim checked server-side on every call, every action written to admin\_actions, destructive actions need a reason string.
- **Logging.** Item creation and transfer, deaths, destruction, ownership changes, suspicious movement, validation failures and admin commands.

## 13. Save and recovery model

Three durability tiers:

1. **Durable before ack.** Item and container changes, trades, crafting completion, death, character creation, ownership and permission changes, admin actions. One transaction including the ledger row. The player sees success only after commit.
2. **Write-behind, at most 5 s stale.** Chunk dynamic state, structure damage, plants, fires, vehicle positions, infected aggregates. A dirty-chunk set flushes in one batched transaction with version checks.
3. **Snapshots.** Every 10 minutes a consistent world\_snapshots manifest (chunk versions, character versions, world clock). Exported backups rotate hourly for 24, daily for 7, weekly for 4. Provider backups are plan-dependent and are not assumed.

**Shutdown (SIGTERM).** Stop accepting joins, broadcast restarting, halt the loop at a tick boundary, flush dirty chunks and characters, close sockets with a restarting code so clients back off and reconnect, and exit within the platform's grace window (confirm its length on Render).

**Startup recovery.** Check schema version, load the world clock and last snapshot, run integrity checks (each item in exactly one location, container versions monotonic, no orphan containers, aggregate counts non-negative, chunk checksums valid). Anomalies are quarantined and logged, never auto-deleted. Reconnecting characters are restored at their last flushed position (at most 5 s stale); items are never lost to that rollback because they are durable before ack.

**Client cache.** IndexedDB holds only static chunk cache and settings. Clearing it loses no world data.

**Migrations.** Forward-only SQL with a version table, each with a documented rollback script. Blob schemas carry schemaVersion with fixture-tested upgrade functions. Rollback means restoring a snapshot with the server stopped, logged as an admin action.

## 14. Twelve-week vertical-slice roadmap

| Week | Deliverable | Phase |
| --- | --- | --- |
| 1 | Repo, CI, boundaries, protocol package, WebSocket handshake, PWA shell | 0 |
| 2 | Pixi chunk render, touch joystick movement, diagnostics overlay, first real-iPad test | 0 exit |
| 3 | Chunk compiler, streaming, collision, authored neighborhood v1 | 1 |
| 4 | Items, containers, kit UI, ledger and transactions | 1 |
| 5 | Needs, health and wound basics, lazy loot | 1 |
| 6 | Infected AI, sound routing, melee, death, save and restore | 1 exit |
| 7 | Auth, rooms, persistence of 10 players, reconnect | 2 |
| 8 | Prediction, interpolation, interest management, 10 bot clients, binary snapshot codec | 2 |
| 9 | Groups, chat, permissions, admin-lite, restart preservation | 2 exit |
| 10 | Barricades, door and window persistence, spoilage, weather-lite | 3 and 4 slice |
| 11 | Original art pass, audio hooks, iPad optimization pass | polish |
| 12 | Soak and load tests, originality review, release candidate | gate |

## 15. First-milestone acceptance tests (Phase 0 exit)

1. pnpm install, lint, typecheck, test and build pass from a clean clone in CI.
2. Protocol: every ClientMessage variant has valid and invalid fixtures; unknown type, oversized payload and wrong version are rejected.
3. Server: a client without hello within 5 s is closed; an invalid JWT is closed; a second session for the same character closes the first.
4. Rate limiting: 100 inputs in 1 s from a test client drops the excess and increments a counter.
5. Heartbeat: a silent client is dropped by 15 s; reconnect with a valid token succeeds once and the token then rotates.
6. Client on a physical iPad 10 in Safari and in PWA mode: renders one chunk with a moving player controlled only by touch; joystick response under 100 ms by on-screen test; no keyboard.
7. Background for 60 s then resume: the socket reconnects automatically and the audio context resumes after the first touch.
8. The diagnostics overlay shows FPS, frame time, draw calls, visible sprites, latency, traffic and heap estimate when available.
9. A 30-minute session shows no heap growth trend above the stated soak target.
10. Offline: menus and settings open; multiplayer shows a clear connection-required message, with no false offline promise.

## 16. Major technical risks

1. **Safari memory pressure and tab kills.** Mitigate with texture budgets, chunk unloading, context-loss recovery and early soak tests.
2. **Suspended sockets and background throttling.** Mitigate with resume logic, grace windows and server-side vulnerability rules.
3. **Art volume.** Original 8-direction sprites, clothing layers and tile kits are the largest unbounded cost. Mitigate with modular kits, a strict item list per phase and palette-limited sprites.
4. **Single-threaded Node tick.** Infected AI plus 10 players can exceed 50 ms. Mitigate with staggered updates, path budgets, aggregation and early load tests.
5. **Duplication and data-integrity bugs.** Mitigate with the ledger, conservation property tests and concurrency integration tests before any content growth.
6. **Touch ergonomics.** Mitigate with real-device tests every milestone and the layout editor.
7. **Free-tier surprises.** Mitigate with an early paid-tier decision for any shared server.
8. **Scope creep.** Mitigate with the milestone gate: one coherent milestone per response, and never trade stability for feature count.
9. **Unverified library behavior.** Mitigate with CI proof on first use (assumption A6).
10. **Service worker caching bugs.** Mitigate with hashed assets, network-first HTML and an update banner.

## 17. Real-iPad validation decisions

| Decision | Test | Rule |
| --- | --- | --- |
| PNG atlases or compressed textures | Same scene both ways, record memory and load time | Choose compressed only if the memory or load gain is material and visual quality holds |
| Default render scale | 10-minute scene at 0.6, 0.75, 1.0 | Highest scale holding 30 fps under thermal load |
| Snapshot rate | 10 vs 15 Hz with 10 bots and simulated 150 ms RTT | Raise only if feel improves and traffic stays within budget |
| HUD in React or Pixi | Frame-time comparison with full HUD | Move a widget to Pixi only if React cost exceeds 2 ms |
| Audio strategy | Unlock, interruption and resume tests | Single AudioContext with explicit resume on first touch |
| WebGL context loss | Force loss, observe recovery | Must restore without losing the session |
| Workers | Profile the main thread with real AI and decoding | Add workers only for measured hot spots |
| Service worker policy | Update and offline scenarios | Ship the simplest policy that updates reliably |
| Tick rate | Server tick time at 10 players | Stay at 20 Hz unless p99 exceeds budget |

## 18. Exact first files to create

Milestone 1 (next response, complete contents):

```text
package.json  pnpm-workspace.yaml  turbo.json  tsconfig.base.json  .nvmrc
.editorconfig  .gitignore  .prettierrc.json  eslint.config.js  .dependency-cruiser.cjs
.github/workflows/ci.yml
packages/config/package.json, tsconfig presets, vitest preset
packages/shared/src/{index,ids,domain,math,prng}.ts + prng.test.ts, math.test.ts
packages/protocol/src/{index,client,server,errors}.ts + client.test.ts
apps/game-server/src/{main,env,http,gateway,session,rate-limit}.ts + gateway.test.ts
apps/client/{index.html,vite.config.ts,public/manifest.webmanifest,public/sw.js}
apps/client/src/{main.tsx,ui/App.tsx,ui/DiagnosticsOverlay.tsx}
apps/client/src/{net/connection.ts,runtime/game.ts,runtime/diagnostics.ts}
infrastructure/render.yaml  .env.example (names only)
docs/{architecture,checklist,changelog,tech-debt,originality-log,asset-register}.md
```

Later milestones: packages/simulation/movement, packages/tools chunk compiler, infrastructure/supabase/migrations/0001\_init.sql, apps/admin.

## Implementation sequence

1. Milestone 1: scaffold, CI and boundary check, shared and protocol packages with tests, game-server handshake and heartbeat, client PWA shell with Pixi canvas and diagnostics. Run acceptance tests 1 to 5 and 8.
2. Milestone 2: movement function in packages/simulation, touch joystick, one hand-authored chunk, local prediction against the server. Acceptance tests 6 and 7 on the iPad.
3. Milestone 3: Phase 0 hardening, 30-minute soak (test 9), offline behavior (test 10), record device numbers into the budget.
4. Milestone 4: chunk compiler and streaming, collision, neighborhood v1.
5. Milestone 5: Postgres migration 0001, ledger, containers and items with transactional moves and conservation tests.
6. Milestone 6: kit UI (two-panel touch inventory) with idempotent operations and reconnect tests.
7. Milestone 7: needs, wounds and lazy loot.
8. Milestone 8: infected perception, sound routing, melee and death.
9. Milestone 9: save and restore, startup integrity checks, graceful shutdown. Phase 1 exit review.
10. Milestones 10 to 12: Supabase auth, rooms, 10-player persistence, reconnect.
11. Milestones 13 to 15: prediction polish, interest management, binary snapshots, 10-bot harness. Phase 2 exit review.
12. Milestones 16 to 20: groups, chat, permissions, admin-lite, barricades, spoilage, weather-lite, art and audio pass, soak and load gate.
