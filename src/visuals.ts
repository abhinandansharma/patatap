import type { Motif } from './keys';

export type Tone = 'red' | 'bone' | 'deep' | 'white';

interface Shape {
  born: number;
  life: number;
  draw: (g: CanvasRenderingContext2D, p: number, e: number) => void;
}

const easeOut = (p: number) => 1 - Math.pow(1 - p, 4);
const easeIn = (p: number) => p * p * p;
/** Damped spring, 0 -> 1 with overshoot. */
const spring = (p: number) => 1 - Math.exp(-6 * p) * Math.cos(9 * p);
const TAU = Math.PI * 2;

/**
 * Canvas renderer. Every hit spawns a shape with a lifetime that matches the sound's length;
 * shapes ease, spring and decay, and the frame fades a little each tick so motion leaves trails.
 */
export class Visuals {
  private g: CanvasRenderingContext2D;
  private shapes: Shape[] = [];
  private w = 0;
  private h = 0;
  private dpr = 1;
  private running = false;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private palette = { bg: '#0b0b0b', red: '#e0202a', bone: '#f1ede4', deep: '#8a0f16', white: '#ffffff' };

  constructor(private canvas: HTMLCanvasElement) {
    this.g = canvas.getContext('2d', { alpha: false })!;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  setTheme(theme: 'ink' | 'paper') {
    this.palette = theme === 'ink'
      ? { bg: '#0b0b0b', red: '#e0202a', bone: '#f1ede4', deep: '#8a0f16', white: '#ffffff' }
      : { bg: '#efece4', red: '#c8202a', bone: '#1a1815', deep: '#7a0d13', white: '#0b0b0b' };
    this.g.fillStyle = this.palette.bg;
    this.g.fillRect(0, 0, this.w, this.h);
  }

  private resize() {
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.w = innerWidth; this.h = innerHeight;
    this.canvas.width = this.w * this.dpr; this.canvas.height = this.h * this.dpr;
    this.canvas.style.width = this.w + 'px'; this.canvas.style.height = this.h + 'px';
    this.g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.g.fillStyle = this.palette.bg;
    this.g.fillRect(0, 0, this.w, this.h);
  }

  private color(tone: Tone) { return this.palette[tone]; }

  /** Spawn the motif for a key. `at` is where it happens (touch position), else somewhere sensible. */
  trigger(motif: Motif, tone: Tone, seconds: number, velocity = 1, at?: { x: number; y: number }) {
    const { w, h } = this;
    const x = at?.x ?? w * (0.15 + Math.random() * 0.7);
    const y = at?.y ?? h * (0.2 + Math.random() * 0.6);
    const life = Math.max(0.35, Math.min(seconds * 1.1, 2.4)) * (this.reduced ? 0.6 : 1);
    const c = this.color(tone);
    const R = Math.min(w, h);
    const v = 0.6 + velocity * 0.6;
    const g = this.g;
    const born = performance.now();
    const add = (draw: Shape['draw']) => this.shapes.push({ born, life: life * 1000, draw });

    switch (motif) {
      case 'ripple':
        add((_, p, e) => {
          for (let i = 0; i < 3; i++) {
            const pp = Math.max(0, Math.min(1, (p - i * 0.12) / (1 - i * 0.12)));
            g.beginPath(); g.arc(x, y, R * 0.45 * v * easeOut(pp), 0, TAU);
            g.lineWidth = 8 * (1 - pp) + 1; g.strokeStyle = c; g.globalAlpha = (1 - pp) * e; g.stroke();
          }
        });
        break;
      case 'burst': {
        const n = 14; const angles = Array.from({ length: n }, (_, i) => (i / n) * TAU + Math.random() * 0.3);
        add((_, p, e) => {
          const d = R * 0.42 * v * easeOut(p);
          g.fillStyle = c; g.globalAlpha = e;
          angles.forEach((a) => {
            const len = 26 * (1 - p) + 6;
            g.save(); g.translate(x + Math.cos(a) * d, y + Math.sin(a) * d); g.rotate(a);
            g.beginPath(); g.moveTo(0, -4); g.lineTo(len, 0); g.lineTo(0, 4); g.closePath(); g.fill(); g.restore();
          });
        });
        break;
      }
      case 'ticks':
        add((_, p, e) => {
          g.fillStyle = c; g.globalAlpha = e;
          const n = 9; const gap = 14;
          for (let i = 0; i < n; i++) {
            const k = i / (n - 1);
            const hh = 6 + 30 * Math.max(0, Math.sin((p * 3 + k) * Math.PI)) * v;
            g.fillRect(x - (n * gap) / 2 + i * gap, y - hh / 2, 3, hh);
          }
        });
        break;
      case 'bars':
        add((_, p, e) => {
          g.fillStyle = c; g.globalAlpha = e * 0.9;
          const n = 5;
          for (let i = 0; i < n; i++) {
            const bw = w / n; const hh = h * (0.12 + 0.5 * (1 - p) * v) * (i % 2 ? 0.7 : 1);
            g.fillRect(i * bw + bw * 0.2 * p, y - hh / 2, bw * (1 - p) * 0.6, hh);
          }
        });
        break;
      case 'ring':
        add((_, p, e) => {
          const s = spring(p);
          g.beginPath(); g.arc(x, y, R * 0.16 * v * s, 0, TAU);
          g.lineWidth = 22 * (1 - p) + 2; g.strokeStyle = c; g.globalAlpha = e; g.stroke();
        });
        break;
      case 'spark': {
        const pts = Array.from({ length: 7 }, () => ({ a: Math.random() * TAU, r: 0.4 + Math.random() }));
        add((_, p, e) => {
          g.strokeStyle = c; g.lineWidth = 2; g.globalAlpha = e;
          pts.forEach(({ a, r }) => {
            const d1 = R * 0.05 * r * easeOut(p), d2 = R * 0.12 * r * easeOut(p);
            g.beginPath(); g.moveTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1); g.lineTo(x + Math.cos(a) * d2, y + Math.sin(a) * d2); g.stroke();
          });
        });
        break;
      }
      case 'spin':
        add((_, p, e) => {
          const s = R * 0.12 * v;
          g.save(); g.translate(x, y); g.rotate(spring(p) * Math.PI * 0.5);
          g.strokeStyle = c; g.lineWidth = 6 * (1 - p) + 1.5; g.globalAlpha = e;
          g.strokeRect(-s / 2, -s / 2, s, s); g.restore();
        });
        break;
      case 'spray': {
        const dots = Array.from({ length: 24 }, () => ({ a: Math.random() * TAU, r: Math.random(), s: 2 + Math.random() * 4 }));
        add((_, p, e) => {
          g.fillStyle = c; g.globalAlpha = e;
          dots.forEach(({ a, r, s }) => {
            const d = R * 0.3 * v * r * easeOut(p);
            g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d + 60 * easeIn(p), s * (1 - p * 0.7), 0, TAU); g.fill();
          });
        });
        break;
      }
      case 'wave':
        add((_, p, e) => {
          g.strokeStyle = c; g.lineWidth = 3; g.globalAlpha = e;
          g.beginPath();
          for (let i = 0; i <= w; i += 6) {
            const k = i / w;
            const yy = y + Math.sin(k * TAU * 2 + p * 6) * 40 * v * (1 - p) * Math.sin(k * Math.PI);
            i === 0 ? g.moveTo(i, yy) : g.lineTo(i, yy);
          }
          g.stroke();
        });
        break;
      case 'spring':
        add((_, p, e) => {
          const s = spring(p);
          g.strokeStyle = c; g.lineWidth = 4; g.globalAlpha = e;
          g.beginPath(); g.moveTo(x - R * 0.3, y);
          g.quadraticCurveTo(x, y - R * 0.35 * v * (1 - s) * 2, x + R * 0.3, y); g.stroke();
        });
        break;
      case 'bloom':
        add((_, p, e) => {
          const s = spring(p);
          g.save(); g.translate(x, y); g.rotate(p * 0.6);
          g.fillStyle = c; g.globalAlpha = e * 0.9;
          const sides = 6, r = R * 0.14 * v * s;
          g.beginPath();
          for (let i = 0; i < sides; i++) { const a = (i / sides) * TAU; i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
          g.closePath(); g.fill(); g.restore();
        });
        break;
      case 'orbit':
        add((_, p, e) => {
          g.fillStyle = c; g.globalAlpha = e;
          const n = 8, r = R * 0.16 * v * easeOut(p);
          for (let i = 0; i < n; i++) { const a = (i / n) * TAU + p * 4; g.beginPath(); g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 5 + 4 * (1 - p), 0, TAU); g.fill(); }
        });
        break;
      case 'stack':
        add((_, p, e) => {
          g.fillStyle = c; g.globalAlpha = e * 0.85;
          for (let i = 0; i < 3; i++) {
            const s = R * (0.22 - i * 0.06) * v * spring(Math.max(0, p - i * 0.08));
            g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.9, y + s * 0.6); g.lineTo(x - s * 0.9, y + s * 0.6); g.closePath();
            i % 2 ? g.stroke() : g.fill();
            g.strokeStyle = c; g.lineWidth = 3;
          }
        });
        break;
      case 'grid':
        add((_, p, e) => {
          g.fillStyle = c; g.globalAlpha = e;
          const cell = 18, n = 5;
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
            const k = (i + j) / (2 * n - 2);
            const s = cell * Math.max(0, 1 - Math.abs(p * 1.4 - k) * 2.5);
            g.fillRect(x + (i - n / 2) * cell * 1.3, y + (j - n / 2) * cell * 1.3, s, s);
          }
        });
        break;
      case 'zigzag':
        add((_, p, e) => {
          g.strokeStyle = c; g.lineWidth = 5 * (1 - p) + 1; g.globalAlpha = e;
          g.beginPath();
          const n = 8, len = R * 0.5 * v * easeOut(p);
          for (let i = 0; i <= n; i++) g.lineTo(x - len / 2 + (i / n) * len, y + (i % 2 ? -1 : 1) * 24 * (1 - p));
          g.stroke();
        });
        break;
      case 'beam':
        add((_, p, e) => {
          g.fillStyle = c; g.globalAlpha = e * (1 - p * 0.5);
          const th = 10 * (1 - p) + 1;
          g.fillRect(0, y - th / 2, w * easeOut(Math.min(1, p * 1.5)), th);
        });
        break;
      case 'wipe':
        add((_, p, e) => {
          g.fillStyle = c; g.globalAlpha = e * 0.8 * (1 - p);
          const ww = w * easeOut(p);
          g.fillRect(x - ww / 2, 0, ww, h);
        });
        break;
      case 'rise':
        add((_, p, e) => {
          g.fillStyle = c; g.globalAlpha = e * 0.9;
          const n = 12, bw = w / n;
          for (let i = 0; i < n; i++) {
            const k = i / n;
            const hh = h * 0.5 * v * Math.max(0, easeOut(p) - k * 0.3);
            g.fillRect(i * bw + 4, h - hh, bw - 8, hh);
          }
        });
        break;
      case 'static':
        add((_, p, e) => {
          g.fillStyle = c; g.globalAlpha = e * 0.7 * (1 - p);
          for (let i = 0; i < 160; i++) g.fillRect(Math.random() * w, Math.random() * h, 3, 3 + Math.random() * 20 * (1 - p));
        });
        break;
      case 'fall':
        add((_, p, e) => {
          const yy = y - R * 0.35 + (h - y + R * 0.35) * easeIn(Math.min(1, p * 1.2));
          g.fillStyle = c; g.globalAlpha = e;
          g.beginPath(); g.arc(x, Math.min(yy, h - 30), R * 0.06 * v * (1 - p * 0.5), 0, TAU); g.fill();
          if (p > 0.8) { g.beginPath(); g.arc(x, h - 30, R * 0.06 + R * 0.4 * easeOut((p - 0.8) / 0.2), 0, TAU); g.lineWidth = 3; g.strokeStyle = c; g.stroke(); }
        });
        break;
    }
    if (!this.running) this.loop();
  }

  private loop = () => {
    this.running = true;
    const now = performance.now();
    const g = this.g;
    g.globalAlpha = 0.22; g.fillStyle = this.palette.bg; g.fillRect(0, 0, this.w, this.h);
    this.shapes = this.shapes.filter((s) => now - s.born < s.life);
    for (const s of this.shapes) {
      const p = (now - s.born) / s.life;
      g.globalAlpha = 1;
      s.draw(g, p, 1 - p * p);
    }
    g.globalAlpha = 1;
    if (this.shapes.length) requestAnimationFrame(this.loop);
    else { this.running = false; g.fillStyle = this.palette.bg; g.fillRect(0, 0, this.w, this.h); }
  };
}
