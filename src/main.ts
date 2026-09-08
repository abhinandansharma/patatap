import './styles.css';
import { createHits, type HitPlayer } from 'ambiently';
import { KEYS, LETTERS } from './keys';
import { Visuals } from './visuals';
import { Loop, STEPS } from './loop';
import { connectMidi } from './midi';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('stage');
const visuals = new Visuals(canvas);

let ctx: AudioContext | null = null;
let hits: HitPlayer | null = null;
let loop: Loop | null = null;

/** Audio is created on the first gesture, which is also what unlocks it. */
function audio(): { ctx: AudioContext; hits: HitPlayer; loop: Loop } {
  if (!ctx) {
    ctx = new AudioContext();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.15;
    comp.connect(ctx.destination);
    hits = createHits(ctx, comp);
    loop = new Loop(ctx);
    loop.onStep = (step, letters, when) => {
      const delay = Math.max(0, (when - ctx!.currentTime) * 1000);
      letters.forEach((l) => hits!.play(KEYS[l].hit, { when, pitch: KEYS[l].pitch, velocity: 0.9 }));
      setTimeout(() => { letters.forEach((l) => flash(l, 0.9)); markStep(step); }, delay);
    };
    loop.onChange = renderTransport;
    if (pendingCode) { loop.decode(pendingCode); pendingCode = null; }
    renderTransport();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return { ctx, hits: hits!, loop: loop! };
}

// ---- playing a key ----------------------------------------------------------
const hint = $('hint');
let hintGone = false;

function flash(letter: string, velocity: number, at?: { x: number; y: number }) {
  const k = KEYS[letter];
  visuals.trigger(k.motif, k.tone, hits ? hits.duration(k.hit) : 0.5, velocity, at);
  const cell = legendCells[letter];
  if (cell) { cell.classList.add('lit'); setTimeout(() => cell.classList.remove('lit'), 140); }
}

function press(letter: string, velocity = 1, at?: { x: number; y: number }) {
  const k = KEYS[letter];
  if (!k) return;
  const a = audio();
  a.hits.play(k.hit, { velocity, pitch: k.pitch });
  a.loop.capture(letter);
  flash(letter, velocity, at);
  if (!hintGone) { hintGone = true; hint.classList.add('gone'); }
}

addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const key = e.key.toLowerCase();
  if (e.repeat && KEYS[key]) return;
  if (KEYS[key]) { e.preventDefault(); press(key); return; }
  if (e.key === 'Enter') { e.preventDefault(); toggleRecord(); }
  else if (e.key === ' ') { e.preventDefault(); audio().loop.toggle(); }
  else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); clearLoop(); }
  else if (e.key === 'Escape') { document.body.classList.remove('perf'); }
  else if (key === 'f' ) { /* f is a key; performance mode uses the button or Shift+F */ }
  else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); bpm(+5); }
  else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); bpm(-5); }
});
addEventListener('keydown', (e) => { if (e.key === 'F' && e.shiftKey) togglePerf(); });

/** Touch and mouse: the screen is a 13 x 2 grid of pads, top row melody, bottom row drums. */
const TOP = 'qwertyuiopzxc'.split('');
const BOTTOM = 'asdfghjklvbnm'.split('');
canvas.addEventListener('pointerdown', (e) => {
  const col = Math.min(12, Math.floor((e.clientX / innerWidth) * 13));
  const letter = e.clientY < innerHeight / 2 ? TOP[col] : BOTTOM[col];
  const velocity = e.pressure && e.pressure > 0 && e.pressure < 1 ? 0.5 + e.pressure * 0.5 : 1;
  press(letter, velocity, { x: e.clientX, y: e.clientY });
});

// ---- transport ---------------------------------------------------------------
const recBtn = $('rec'), playBtn = $('play'), bpmEl = $('bpm'), stepsEl = $('steps'), toast = $('toast');
const stepCells: HTMLElement[] = Array.from({ length: STEPS }, () => { const i = document.createElement('i'); stepsEl.appendChild(i); return i; });
let lastStep = -1;
function markStep(step: number) {
  if (lastStep >= 0) stepCells[lastStep].classList.remove('now');
  stepCells[step].classList.add('now');
  lastStep = step;
}
function renderTransport() {
  const l = loop;
  recBtn.classList.toggle('on', !!l?.recording);
  recBtn.setAttribute('aria-pressed', String(!!l?.recording));
  playBtn.classList.toggle('on', !!l?.playing);
  playBtn.setAttribute('aria-pressed', String(!!l?.playing));
  $('play-label').textContent = l?.playing ? 'Stop' : 'Play';
  bpmEl.textContent = String(l?.bpm ?? 110);
  stepCells.forEach((c, i) => c.classList.toggle('has', !!l && l.steps[i].length > 0));
  if (!l?.playing && lastStep >= 0) { stepCells[lastStep].classList.remove('now'); lastStep = -1; }
}
function toggleRecord() {
  const { loop } = audio();
  loop.recording ? loop.stopRecording() : loop.record();
  say(loop.recording ? 'Recording. Play something, it loops every two bars.' : 'Recording stopped.');
}
function clearLoop() { const { loop } = audio(); loop.stop(); loop.clear(); history.replaceState(null, '', location.pathname); say('Loop cleared.'); }
function bpm(delta: number) { const { loop } = audio(); loop.bpm = Math.min(200, Math.max(50, loop.bpm + delta)); renderTransport(); }
let toastTimer = 0;
function say(text: string) { toast.textContent = text; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2200); }

recBtn.addEventListener('click', toggleRecord);
playBtn.addEventListener('click', () => audio().loop.toggle());
$('clear').addEventListener('click', clearLoop);
$('bpm-up').addEventListener('click', () => bpm(5));
$('bpm-down').addEventListener('click', () => bpm(-5));
$('share').addEventListener('click', async () => {
  const { loop } = audio();
  const code = loop.encode();
  if (!code) { say('Record a loop first.'); return; }
  const url = `${location.origin}${location.pathname}#loop=${code}`;
  history.replaceState(null, '', `#loop=${code}`);
  try { await navigator.clipboard.writeText(url); say('Link copied. Anyone who opens it gets your loop.'); }
  catch { say('Link is in the address bar.'); }
});

// ---- legend ------------------------------------------------------------------
const legend = $('legend');
const legendCells: Record<string, HTMLElement> = {};
[...TOP, ...BOTTOM].forEach((l) => { const s = document.createElement('span'); s.textContent = l; legend.appendChild(s); legendCells[l] = s; });

// ---- theme, performance mode, MIDI, shared loop --------------------------------
const themeBtn = $('theme');
function setTheme(t: 'ink' | 'paper') {
  document.documentElement.dataset.theme = t === 'paper' ? 'paper' : '';
  themeBtn.textContent = t === 'paper' ? 'Ink' : 'Paper';
  visuals.setTheme(t);
  try { localStorage.setItem('patatap.theme', t); } catch { /* ignore */ }
}
let savedTheme: 'ink' | 'paper' = 'ink';
try { savedTheme = (localStorage.getItem('patatap.theme') as 'ink' | 'paper') || 'ink'; } catch { /* ignore */ }
setTheme(savedTheme);
themeBtn.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'paper' ? 'ink' : 'paper'));

function togglePerf() { document.body.classList.toggle('perf'); if (document.body.classList.contains('perf')) say('Performance mode. Press Escape to bring the interface back.'); }
$('perf').addEventListener('click', togglePerf);

connectMidi((index, velocity) => press(LETTERS[index], velocity), (text) => { $('status').textContent = text; });

let pendingCode: string | null = null;
const m = /#loop=([0-9a-z.-]+)/.exec(location.hash);
if (m) {
  pendingCode = m[1];
  hint.querySelector('h1')!.innerHTML = 'Someone sent you <em>a loop</em>.';
  hint.querySelector('p')!.innerHTML = 'Press <kbd>Space</kbd> or tap Play to hear it, then add your own keys on top.';
  playBtn.classList.add('on');
}
