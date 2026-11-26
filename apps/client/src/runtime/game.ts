import { Application, Container, Graphics } from 'pixi.js';
import { CHUNK_SIZE, createPrng, deriveSeed } from '@lanternfall/shared';
import type { DiagnosticsCollector } from './diagnostics';

const TILE_PX = 32;
const CHUNK_PX = CHUNK_SIZE * TILE_PX;
const GRASS_TONES = [0x2c3a2c, 0x2a3729, 0x2f3d2e, 0x283427] as const;

interface WebGlLike {
  gl?: WebGL2RenderingContext | WebGLRenderingContext;
}

class DrawCallCounter {
  private calls = 0;
  private readonly restores: Array<() => void> = [];

  attach(renderer: unknown): void {
    if (typeof renderer !== 'object' || renderer === null) {
      return;
    }
    const gl = (renderer as WebGlLike).gl;
    if (!gl) {
      return;
    }

    const methodNames = [
      'drawArrays',
      'drawElements',
      'drawArraysInstanced',
      'drawElementsInstanced',
    ] as const;

    for (const methodName of methodNames) {
      const target = gl as unknown as Record<string, unknown>;
      const original = target[methodName];
      if (typeof original !== 'function') {
        continue;
      }
      const bound = original.bind(gl) as (...args: unknown[]) => unknown;
      try {
        target[methodName] = (...args: unknown[]): unknown => {
          this.calls += 1;
          return bound(...args);
        };
        this.restores.push(() => {
          target[methodName] = original;
        });
      } catch {
        // Some engines expose read-only prototypes; draw-call telemetry is optional.
      }
    }
  }

  take(): number {
    const value = this.calls;
    this.calls = 0;
    return value;
  }

  detach(): void {
    for (const restore of this.restores) {
      restore();
    }
    this.restores.length = 0;
  }
}

const isRoadTile = (tileX: number, tileY: number): boolean => {
  const onHorizontalRoad = tileY >= 13 && tileY <= 16;
  const onVerticalRoad = tileX >= 6 && tileX <= 9;
  return onHorizontalRoad || onVerticalRoad;
};

export class GameRuntime {
  private app: Application | null = null;
  private world: Container | null = null;
  private readonly drawCounter = new DrawCallCounter();
  private resizeObserver: ResizeObserver | null = null;
  private ready = false;
  private destroyed = false;

  constructor(
    private readonly host: HTMLElement,
    private readonly diagnostics: DiagnosticsCollector,
  ) {}

  async start(): Promise<void> {
    const app = new Application();
    this.app = app;

    await app.init({
      background: '#151a17',
      resizeTo: this.host,
      antialias: false,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });

    if (this.destroyed) {
      app.destroy(true);
      return;
    }

    app.canvas.style.touchAction = 'none';
    app.canvas.setAttribute('aria-label', 'Lanternfall bootstrap chunk');
    this.host.appendChild(app.canvas);

    const world = this.buildScene();
    this.world = world;
    app.stage.addChild(world);

    this.drawCounter.attach(app.renderer);
    this.ready = true;

    this.layout();
    this.resizeObserver = new ResizeObserver(() => {
      this.layout();
    });
    this.resizeObserver.observe(this.host);
    window.addEventListener('resize', this.onWindowResize);

    app.ticker.add(() => {
      this.onFrame();
    });
  }

  destroy(): void {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener('resize', this.onWindowResize);

    if (this.app && this.ready) {
      this.drawCounter.detach();
      this.app.destroy(true, { children: true, texture: true });
    }
    this.ready = false;
    this.app = null;
    this.world = null;
  }

  private readonly onWindowResize = (): void => {
    this.layout();
  };

  private buildScene(): Container {
    const world = new Container();
    const prng = createPrng(deriveSeed(['lanternfall', 'bootstrap-chunk', 0, 0]));

    const ground = new Graphics();
    for (let tileY = 0; tileY < CHUNK_SIZE; tileY += 1) {
      for (let tileX = 0; tileX < CHUNK_SIZE; tileX += 1) {
        const tone = GRASS_TONES[prng.nextInt(0, GRASS_TONES.length)] ?? 0x2a3729;
        ground.rect(tileX * TILE_PX, tileY * TILE_PX, TILE_PX, TILE_PX).fill(tone);
      }
    }
    ground.rect(0, 13 * TILE_PX, CHUNK_PX, 4 * TILE_PX).fill(0x4b4132);
    ground.rect(6 * TILE_PX, 0, 4 * TILE_PX, CHUNK_PX).fill(0x463d30);
    world.addChild(ground);

    const grid = new Graphics();
    for (let index = 1; index < CHUNK_SIZE; index += 1) {
      const offset = index * TILE_PX;
      grid
        .moveTo(offset, 0)
        .lineTo(offset, CHUNK_PX)
        .stroke({ width: 1, color: 0xd7c9a8, alpha: 0.05 });
      grid
        .moveTo(0, offset)
        .lineTo(CHUNK_PX, offset)
        .stroke({ width: 1, color: 0xd7c9a8, alpha: 0.05 });
    }
    world.addChild(grid);

    const roadMarks = new Graphics();
    for (let offset = 0; offset < CHUNK_PX; offset += 64) {
      roadMarks.rect(offset, 14.7 * TILE_PX, 30, 4).fill({ color: 0xd7c9a8, alpha: 0.16 });
      roadMarks.rect(7.7 * TILE_PX, offset, 4, 30).fill({ color: 0xd7c9a8, alpha: 0.16 });
    }
    world.addChild(roadMarks);

    const details = new Graphics();
    for (let index = 0; index < 180; index += 1) {
      const tileX = prng.nextInt(0, CHUNK_SIZE);
      const tileY = prng.nextInt(0, CHUNK_SIZE);
      if (isRoadTile(tileX, tileY)) {
        continue;
      }
      const x = tileX * TILE_PX + prng.nextFloat() * TILE_PX;
      const y = tileY * TILE_PX + prng.nextFloat() * TILE_PX;
      const radius = 1.5 + prng.nextFloat() * 3.5;
      details.circle(x, y, radius).fill({ color: 0x4a5f45, alpha: 0.55 });
    }
    world.addChild(details);

    const border = new Graphics()
      .rect(0, 0, CHUNK_PX, CHUNK_PX)
      .stroke({ width: 2, color: 0xd7c9a8, alpha: 0.3 });
    world.addChild(border);

    const survivor = new Container();
    survivor.position.set(CHUNK_PX / 2, 15 * TILE_PX);
    const glow = new Graphics()
      .circle(0, 0, 30)
      .fill({ color: 0xe0a64b, alpha: 0.05 })
      .circle(0, 0, 18)
      .fill({ color: 0xe0a64b, alpha: 0.1 });
    const shadow = new Graphics().ellipse(0, 10, 13, 6).fill({ color: 0x000000, alpha: 0.35 });
    const facing = new Graphics()
      .moveTo(0, -4)
      .lineTo(0, -24)
      .stroke({ width: 2, color: 0xd9cba4, alpha: 0.9 });
    const body = new Graphics()
      .circle(0, 0, 9)
      .fill(0x2f3b33)
      .stroke({ width: 2, color: 0xd9cba4 });
    const lantern = new Graphics().circle(8, -4, 4).fill(0xe0a64b);
    survivor.addChild(glow, shadow, facing, body, lantern);
    world.addChild(survivor);

    return world;
  }

  private layout(): void {
    if (!this.app || !this.world) {
      return;
    }
    const width = this.host.clientWidth || window.innerWidth;
    const height = this.host.clientHeight || window.innerHeight;
    const scale = Math.max(
      0.35,
      Math.min(width / (CHUNK_PX * 1.1), height / (CHUNK_PX * 1.1), 1.4),
    );
    this.world.scale.set(scale);
    this.world.position.set((width - CHUNK_PX * scale) / 2, (height - CHUNK_PX * scale) / 2);
  }

  private onFrame(): void {
    const now = performance.now();
    this.diagnostics.recordFrame(now);
    const drawCalls = this.drawCounter.take();
    this.diagnostics.setScene(drawCalls, this.world?.children.length ?? 0, 1);
  }
}
