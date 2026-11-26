import Phaser from 'phaser';
import type { EntityDelta } from '@lanternfall/protocol';
import {
  CHUNK_SIZE,
  createPrng,
  dequantizeFromSixteenth,
  deriveSeed,
  screenToTile,
  worldToScreen,
  type IsometricProjection,
  type ScreenPoint,
} from '@lanternfall/shared';
import type { DiagnosticsCollector } from './diagnostics';

const CHUNK_PX = CHUNK_SIZE * 32;
const GRASS_TONES = [0x2c3a2c, 0x2a3729, 0x2f3d2e, 0x283427] as const;
const PROJECTION: IsometricProjection = {
  tileWidth: 32,
  tileHeight: 16,
  originX: CHUNK_PX / 2,
  originY: CHUNK_PX / 2,
};

interface DrawCallContext {
  drawArrays: (...args: unknown[]) => unknown;
  drawElements: (...args: unknown[]) => unknown;
}

const isDrawCallContext = (value: unknown): value is DrawCallContext =>
  typeof value === 'object' && value !== null && 'drawArrays' in value && 'drawElements' in value;

class DrawCallCounter {
  private calls = 0;
  private readonly restores: Array<() => void> = [];

  attach(context: DrawCallContext): void {
    for (const name of [
      'drawArrays',
      'drawElements',
      'drawArraysInstanced',
      'drawElementsInstanced',
    ]) {
      const target = context as unknown as Record<string, unknown>;
      const original = target[name];
      if (typeof original !== 'function') {
        continue;
      }

      try {
        target[name] = (...args: unknown[]): unknown => {
          this.calls += 1;
          return Reflect.apply(original, context, args);
        };
        this.restores.push(() => {
          target[name] = original;
        });
      } catch {
        // Renderer telemetry is optional when a browser locks WebGL methods.
      }
    }
  }

  take(): number {
    const calls = this.calls;
    this.calls = 0;
    return calls;
  }

  detach(): void {
    for (const restore of this.restores) {
      restore();
    }
    this.restores.length = 0;
  }
}

const isRoadTile = (tileX: number, tileY: number): boolean =>
  (tileY >= 13 && tileY <= 16) || (tileX >= 6 && tileX <= 9);

const drawPolygon = (
  graphics: Phaser.GameObjects.Graphics,
  points: readonly ScreenPoint[],
  color: number,
  alpha = 1,
): void => {
  const first = points[0];
  if (!first) {
    return;
  }
  graphics.fillStyle(color, alpha).beginPath().moveTo(first.x, first.y);
  for (const point of points.slice(1)) {
    graphics.lineTo(point.x, point.y);
  }
  graphics.closePath().fillPath();
};

class BootstrapScene extends Phaser.Scene {
  private readonly actors = new Map<number, Phaser.GameObjects.Container>();
  private controlledEntityId: number | null = null;
  private followedEntityId: number | null = null;
  private selectedTile: Phaser.GameObjects.Graphics | null = null;
  private readonly drawCalls = new DrawCallCounter();

  constructor(
    private readonly diagnostics: DiagnosticsCollector,
    private readonly onReady: (scene: BootstrapScene) => void,
  ) {
    super({ key: 'bootstrap' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#151a17');
    this.createNeighborhood();
    this.layoutCamera();
    this.scale.on('resize', this.layoutCamera, this);
    this.input.on('pointerup', this.pickTile, this);
    this.events.once('shutdown', this.onShutdown, this);
    this.onReady(this);
  }

  override update(): void {
    this.diagnostics.recordFrame(performance.now());
    this.diagnostics.setScene(this.drawCalls.take(), this.children.getChildren().length, 1);
  }

  setEntities(entities: readonly EntityDelta[]): void {
    const activeEntities = new Set<number>();
    for (const entity of entities) {
      activeEntities.add(entity.id);
      let actor = this.actors.get(entity.id);
      if (!actor) {
        actor = this.createSurvivor();
        this.actors.set(entity.id, actor);
      }
      const point = worldToScreen(
        dequantizeFromSixteenth(entity.x),
        dequantizeFromSixteenth(entity.y),
        PROJECTION,
      );
      actor.setPosition(point.x, point.y).setDepth(point.y + 10);
    }
    for (const [entityId, actor] of this.actors) {
      if (!activeEntities.has(entityId)) {
        actor.destroy();
        this.actors.delete(entityId);
      }
    }
    this.layoutCamera();
  }

  setControlledEntity(entityId: number | null): void {
    this.controlledEntityId = entityId;
    this.layoutCamera();
  }

  attachDrawCallCounter(game: Phaser.Game): void {
    const renderer = game.renderer;
    if ('gl' in renderer && isDrawCallContext(renderer.gl)) {
      this.drawCalls.attach(renderer.gl);
    }
  }

  private createNeighborhood(): void {
    const prng = createPrng(deriveSeed(['lanternfall', 'bootstrap-chunk', 0, 0]));
    const ground = this.add.graphics();
    const halfWidth = PROJECTION.tileWidth / 2;
    const halfHeight = PROJECTION.tileHeight / 2;

    for (let tileY = 0; tileY < CHUNK_SIZE; tileY += 1) {
      for (let tileX = 0; tileX < CHUNK_SIZE; tileX += 1) {
        const point = worldToScreen(tileX - 16, tileY - 16, PROJECTION);
        const tone = isRoadTile(tileX, tileY)
          ? 0x4b4132
          : (GRASS_TONES[prng.nextInt(0, GRASS_TONES.length)] ?? 0x2a3729);
        drawPolygon(
          ground,
          [
            { x: point.x, y: point.y - halfHeight },
            { x: point.x + halfWidth, y: point.y },
            { x: point.x, y: point.y + halfHeight },
            { x: point.x - halfWidth, y: point.y },
          ],
          tone,
        );
      }
    }

    const details = this.add.graphics().setDepth(1);
    for (let index = 0; index < 180; index += 1) {
      const tileX = prng.nextInt(0, CHUNK_SIZE);
      const tileY = prng.nextInt(0, CHUNK_SIZE);
      if (isRoadTile(tileX, tileY)) {
        continue;
      }
      const point = worldToScreen(tileX - 16, tileY - 16, PROJECTION);
      details
        .fillStyle(0x4a5f45, 0.55)
        .fillCircle(
          point.x + (prng.nextFloat() - 0.5) * 18,
          point.y + (prng.nextFloat() - 0.5) * 8,
          1.5 + prng.nextFloat() * 3.5,
        );
    }

    this.createHouse();
  }

  private createHouse(): void {
    const center = worldToScreen(-8, -4, PROJECTION);
    const walls = this.add.graphics().setDepth(center.y + 48);
    drawPolygon(
      walls,
      [
        { x: center.x - 72, y: center.y - 16 },
        { x: center.x, y: center.y + 20 },
        { x: center.x, y: center.y + 72 },
        { x: center.x - 72, y: center.y + 36 },
      ],
      0x786447,
    );
    drawPolygon(
      walls,
      [
        { x: center.x, y: center.y + 20 },
        { x: center.x + 72, y: center.y - 16 },
        { x: center.x + 72, y: center.y + 36 },
        { x: center.x, y: center.y + 72 },
      ],
      0x574532,
    );

    const openings = this.add.graphics().setDepth(center.y + 50);
    openings.fillStyle(0x8aa0a2).fillRect(center.x - 56, center.y + 2, 20, 14);
    openings.fillStyle(0x8aa0a2).fillRect(center.x + 34, center.y + 2, 20, 14);
    openings.fillStyle(0x2a211c).fillRect(center.x - 10, center.y + 40, 20, 32);

    const roof = this.add.graphics().setDepth(center.y + 80);
    drawPolygon(
      roof,
      [
        { x: center.x, y: center.y - 68 },
        { x: center.x + 80, y: center.y - 28 },
        { x: center.x, y: center.y + 12 },
      ],
      0x49302a,
    );
    drawPolygon(
      roof,
      [
        { x: center.x, y: center.y - 68 },
        { x: center.x - 80, y: center.y - 28 },
        { x: center.x, y: center.y + 12 },
      ],
      0x674137,
    );
  }

  private createSurvivor(): Phaser.GameObjects.Container {
    const survivor = this.add.container(0, 0);
    const glow = this.add.graphics();
    glow.fillStyle(0xe0a64b, 0.08).fillCircle(0, 0, 26);
    glow.fillStyle(0xe0a64b, 0.12).fillCircle(0, 0, 16);
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.35).fillEllipse(0, 10, 26, 12);
    const body = this.add.graphics();
    body.fillStyle(0x2f3b33).fillCircle(0, 0, 9);
    body.lineStyle(2, 0xd9cba4).strokeCircle(0, 0, 9);
    body.lineStyle(2, 0xd9cba4).beginPath().moveTo(0, -4).lineTo(0, -24).strokePath();
    const lantern = this.add.graphics();
    lantern.fillStyle(0xe0a64b).fillCircle(8, -4, 4);
    survivor.add([glow, shadow, body, lantern]);
    return survivor;
  }

  private pickTile(pointer: Phaser.Input.Pointer): void {
    const screenPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tile = screenToTile(screenPoint.x, screenPoint.y, PROJECTION);
    if (tile.x < -16 || tile.x > 15 || tile.y < -16 || tile.y > 15) {
      this.selectedTile?.clear();
      return;
    }
    const center = worldToScreen(tile.x, tile.y, PROJECTION);
    const halfWidth = PROJECTION.tileWidth / 2;
    const halfHeight = PROJECTION.tileHeight / 2;
    const marker = this.selectedTile ?? this.add.graphics();
    marker
      .clear()
      .setDepth(center.y + 1)
      .lineStyle(2, 0xe0a64b, 0.95)
      .beginPath()
      .moveTo(center.x, center.y - halfHeight)
      .lineTo(center.x + halfWidth, center.y)
      .lineTo(center.x, center.y + halfHeight)
      .lineTo(center.x - halfWidth, center.y)
      .closePath()
      .strokePath();
    this.selectedTile = marker;
  }

  private layoutCamera(): void {
    const camera = this.cameras.main;
    const width = this.scale.width || this.game.canvas.width;
    const height = this.scale.height || this.game.canvas.height;
    const zoom = Math.max(0.45, Math.min(width / (CHUNK_PX * 1.1), height / (CHUNK_PX * 0.8), 1.3));
    camera.setZoom(zoom);
    const actor =
      this.controlledEntityId === null ? undefined : this.actors.get(this.controlledEntityId);
    if (actor && this.controlledEntityId !== null) {
      if (this.followedEntityId !== this.controlledEntityId) {
        camera.startFollow(actor, true, 0.08, 0.08);
        this.followedEntityId = this.controlledEntityId;
      }
    } else {
      camera.stopFollow();
      this.followedEntityId = null;
      camera.centerOn(PROJECTION.originX, PROJECTION.originY);
    }
  }

  private onShutdown(): void {
    this.scale.off('resize', this.layoutCamera, this);
    this.input.off('pointerup', this.pickTile, this);
    this.drawCalls.detach();
    this.actors.clear();
    this.selectedTile = null;
  }
}

export class GameRuntime {
  private game: Phaser.Game | null = null;
  private scene: BootstrapScene | null = null;
  private entities: readonly EntityDelta[] = [];
  private controlledEntityId: number | null = null;
  private startupTimer: number | null = null;
  private resolveStartup: (() => void) | null = null;
  private rejectStartup: ((error: Error) => void) | null = null;
  private destroyed = false;

  constructor(
    private readonly host: HTMLElement,
    private readonly diagnostics: DiagnosticsCollector,
  ) {}

  async start(): Promise<void> {
    if (this.game) {
      return;
    }
    const ready = new Promise<void>((resolve, reject) => {
      this.resolveStartup = resolve;
      this.rejectStartup = reject;
    });
    this.startupTimer = window.setTimeout(() => {
      this.finishStartup(new Error('Phaser renderer did not initialize in time'));
    }, 15000);

    const scene = new BootstrapScene(this.diagnostics, (readyScene) => {
      this.scene = readyScene;
      readyScene.attachDrawCallCounter(game);
      readyScene.setEntities(this.entities);
      readyScene.setControlledEntity(this.controlledEntityId);
      this.finishStartup();
    });
    const game = new Phaser.Game({
      type: Phaser.WEBGL,
      parent: this.host,
      width: this.host.clientWidth || 800,
      height: this.host.clientHeight || 600,
      backgroundColor: '#151a17',
      antialias: false,
      pixelArt: true,
      roundPixels: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
      },
      scene: [scene],
    });
    this.game = game;

    try {
      await ready;
    } catch (error) {
      this.destroy();
      throw error;
    }

    if (this.destroyed) {
      this.destroy();
      return;
    }
    game.canvas.style.touchAction = 'none';
    game.canvas.setAttribute('aria-label', 'Lanternfall isometric neighborhood');
  }

  destroy(): void {
    this.destroyed = true;
    this.finishStartup(new Error('Phaser runtime was destroyed before startup completed'));
    this.scene = null;
    const game = this.game;
    this.game = null;
    game?.destroy(true);
  }

  setEntities(entities: readonly EntityDelta[]): void {
    this.entities = entities.map((entity) => ({ ...entity }));
    this.scene?.setEntities(this.entities);
  }

  setControlledEntity(entityId: number | null): void {
    this.controlledEntityId = entityId;
    this.scene?.setControlledEntity(entityId);
  }

  private finishStartup(error?: Error): void {
    if (!this.resolveStartup) {
      return;
    }
    if (this.startupTimer !== null) {
      window.clearTimeout(this.startupTimer);
      this.startupTimer = null;
    }
    const resolve = this.resolveStartup;
    const reject = this.rejectStartup;
    this.resolveStartup = null;
    this.rejectStartup = null;
    if (error) {
      reject?.(error);
    } else {
      resolve();
    }
  }
}
