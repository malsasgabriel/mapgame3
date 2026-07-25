// Performance: FPS counter + culling
export class PerformanceMonitor {
  fps = 60;
  private last = performance.now();
  private frames = 0;
  private cb: (fps: number) => void;
  constructor(cb: (fps: number) => void) { this.cb = cb; this.loop(); }
  private loop = () => {
    this.frames++;
    const now = performance.now();
    if (now - this.last > 1000) {
      this.fps = Math.round(this.frames * 1000 / (now - this.last));
      this.cb(this.fps);
      this.frames = 0;
      this.last = now;
    }
    requestAnimationFrame(this.loop);
  };
  static cullPlayers(players: any[], offset: {x:number,y:number}, scale: number, viewport: {w:number,h:number}) {
    const margin = 200;
    const minX = (-offset.x - margin) / scale;
    const maxX = (viewport.w - offset.x + margin) / scale;
    const minY = (-offset.y - margin) / scale;
    const maxY = (viewport.h - offset.y + margin) / scale;
    return players.filter(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
  }
}
