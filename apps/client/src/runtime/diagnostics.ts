export interface DiagnosticsSnapshot {
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  visibleSprites: number;
  chunksLoaded: number;
  latencyMs: number | null;
  trafficInBytes: number;
  trafficOutBytes: number;
  heapUsedMb: number | null;
  serverTickMs: number | null;
}

interface HeapPerformance extends Performance {
  memory?: {
    usedJSHeapSize: number;
  };
}

export class DiagnosticsCollector {
  private frames = 0;
  private frameTotalMs = 0;
  private windowStartedAt = 0;
  private lastFrameAt = 0;
  private fps = 0;
  private frameTimeMs = 0;
  private drawCalls = 0;
  private visibleSprites = 0;
  private chunksLoaded = 0;
  private latencyMs: number | null = null;
  private trafficInBytes = 0;
  private trafficOutBytes = 0;
  private serverTickMs: number | null = null;

  recordFrame(now: number): void {
    if (this.windowStartedAt === 0) {
      this.windowStartedAt = now;
      this.lastFrameAt = now;
      return;
    }

    const delta = now - this.lastFrameAt;
    this.lastFrameAt = now;
    if (delta > 0) {
      this.frames += 1;
      this.frameTotalMs += delta;
    }

    const elapsed = now - this.windowStartedAt;
    if (elapsed >= 1000) {
      this.fps = (this.frames * 1000) / elapsed;
      this.frameTimeMs = this.frames > 0 ? this.frameTotalMs / this.frames : 0;
      this.frames = 0;
      this.frameTotalMs = 0;
      this.windowStartedAt = now;
    }
  }

  setScene(drawCalls: number, visibleSprites: number, chunksLoaded: number): void {
    this.drawCalls = drawCalls;
    this.visibleSprites = visibleSprites;
    this.chunksLoaded = chunksLoaded;
  }

  setNetwork(latencyMs: number | null, trafficInBytes: number, trafficOutBytes: number): void {
    this.latencyMs = latencyMs;
    this.trafficInBytes = trafficInBytes;
    this.trafficOutBytes = trafficOutBytes;
  }

  setServerTick(tickMs: number | null): void {
    this.serverTickMs = tickMs;
  }

  snapshot(): DiagnosticsSnapshot {
    const memory = (performance as HeapPerformance).memory;
    const heapUsedMb = memory
      ? Math.round((memory.usedJSHeapSize / (1024 * 1024)) * 10) / 10
      : null;

    return {
      fps: this.fps,
      frameTimeMs: this.frameTimeMs,
      drawCalls: this.drawCalls,
      visibleSprites: this.visibleSprites,
      chunksLoaded: this.chunksLoaded,
      latencyMs: this.latencyMs,
      trafficInBytes: this.trafficInBytes,
      trafficOutBytes: this.trafficOutBytes,
      heapUsedMb,
      serverTickMs: this.serverTickMs,
    };
  }
}
