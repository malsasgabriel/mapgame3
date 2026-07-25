// Frame sampling and pure viewport culling helpers.
export class PerformanceMonitor {
  fps = 60;
  private last = performance.now();
  private frames = 0;
  private frameId: number | null = null;
  private stopped = false;

  constructor(private readonly cb: (fps: number) => void) {
    this.loop();
  }

  stop() {
    this.stopped = true;
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
  }

  private loop = () => {
    if (this.stopped) return;
    this.frames += 1;
    const now = performance.now();
    if (now - this.last > 1000) {
      this.fps = Math.round((this.frames * 1000) / (now - this.last));
      this.cb(this.fps);
      this.frames = 0;
      this.last = now;
    }
    this.frameId = requestAnimationFrame(this.loop);
  };

  static cullPlayers<T extends { x: number; y: number }>(
    players: T[],
    offset: { x: number; y: number },
    scale: number,
    viewport: { w: number; h: number },
  ): T[] {
    const margin = 200;
    const minX = (-offset.x - margin) / scale;
    const maxX = (viewport.w - offset.x + margin) / scale;
    const minY = (-offset.y - margin) / scale;
    const maxY = (viewport.h - offset.y + margin) / scale;
    return players.filter(player => player.x >= minX && player.x <= maxX && player.y >= minY && player.y <= maxY);
  }
}
