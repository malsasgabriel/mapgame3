// AAA Audio Engine - Web Audio spatial
export class AudioEngine {
  ctx: AudioContext | null = null;
  enabled = true;
  private master: GainNode | null = null;
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.18;
      this.master.connect(this.ctx.destination);
    } catch {}
  }
  tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, pan = 0) {
    if (!this.enabled || !this.ctx || !this.master) return;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); const p = this.ctx.createStereoPanner();
    o.type = type; o.frequency.value = freq; p.pan.value = pan;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
    o.connect(p).connect(g).connect(this.master);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }
  footstep(speed: number) { this.tone(120 + speed * 20, 0.08, 'square', 0.07); }
  coin() { this.tone(1200, 0.12, 'sine', 0.18); setTimeout(() => this.tone(1600, 0.18, 'sine', 0.18), 90); }
  gem() { this.tone(800, 0.2, 'triangle', 0.2); setTimeout(() => this.tone(1200, 0.3, 'sine', 0.22), 120); }
  pop() { this.tone(660, 0.12, 'sine', 0.18); setTimeout(() => this.tone(880, 0.12, 'sine', 0.14), 80); }
  ambient(osloTemp: number) {
    // wind + seagulls
    if (!this.enabled) return;
    const now = this.ctx?.currentTime || 0;
    if (osloTemp < 0) this.tone(80, 2, 'sawtooth', 0.02, -0.3); // cold wind
  }
}
export const audio = new AudioEngine();
