/** A two-bar, sixteenth-note step loop. Records key presses, quantises them, and plays back on the audio clock. */
export const STEPS = 32;

export class Loop {
  bpm = 110;
  steps: string[][] = Array.from({ length: STEPS }, () => []);
  recording = false;
  playing = false;
  private recordStart = 0;
  private timer: number | null = null;
  private nextStepTime = 0;
  private step = 0;
  onStep: ((step: number, letters: string[], when: number) => void) | null = null;
  onChange: (() => void) | null = null;

  constructor(private ctx: AudioContext) {}

  get stepSeconds() { return 60 / this.bpm / 4; }
  get isEmpty() { return this.steps.every((s) => s.length === 0); }

  /** Start recording; if the loop is already playing, recording overdubs into it in time. */
  record() {
    this.recording = true;
    if (!this.playing) { this.clear(false); this.recordStart = this.ctx.currentTime; this.play(); }
    this.onChange?.();
  }
  stopRecording() { this.recording = false; this.onChange?.(); }

  /** Called on every live key press. */
  capture(letter: string) {
    if (!this.recording) return;
    const t = this.ctx.currentTime - this.recordStart;
    const idx = Math.round(t / this.stepSeconds) % STEPS;
    const cell = this.steps[idx];
    if (!cell.includes(letter)) cell.push(letter);
    this.onChange?.();
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.recordStart = this.nextStepTime;
    this.tick();
    this.onChange?.();
  }

  stop() {
    this.playing = false;
    this.recording = false;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.onChange?.();
  }

  toggle() { this.playing ? this.stop() : this.play(); }

  clear(notify = true) {
    this.steps = Array.from({ length: STEPS }, () => []);
    if (notify) this.onChange?.();
  }

  private tick = () => {
    const lookahead = 0.12;
    while (this.nextStepTime < this.ctx.currentTime + lookahead) {
      const letters = this.steps[this.step];
      const when = this.nextStepTime;
      if (this.step === 0) this.recordStart = when;
      this.onStep?.(this.step, letters, when);
      this.nextStepTime += this.stepSeconds;
      this.step = (this.step + 1) % STEPS;
    }
    if (this.playing) this.timer = window.setTimeout(this.tick, 25);
  };

  /** Share format: `bpm-step.step.step` where each step is its letters, so `110-a.s..d` is readable. */
  encode(): string {
    if (this.isEmpty) return '';
    return `${this.bpm}-${this.steps.map((s) => s.join('')).join('.')}`.replace(/\.+$/, '');
  }

  decode(code: string): boolean {
    const m = /^(\d{2,3})-([a-z.]*)$/.exec(code);
    if (!m) return false;
    this.bpm = Math.min(200, Math.max(50, Number(m[1])));
    const parts = m[2].split('.');
    this.steps = Array.from({ length: STEPS }, (_, i) => (parts[i] ?? '').split('').filter(Boolean));
    this.onChange?.();
    return !this.isEmpty;
  }
}
