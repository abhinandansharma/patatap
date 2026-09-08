import type { HitName } from 'ambiently';

export type Motif =
  | 'ripple' | 'burst' | 'ticks' | 'bars' | 'ring' | 'spark' | 'spin' | 'spray' | 'wave'
  | 'spring' | 'bloom' | 'orbit' | 'stack' | 'grid' | 'zigzag' | 'beam' | 'wipe' | 'rise' | 'static' | 'fall';

export interface KeyDef { hit: HitName; pitch: number; motif: Motif; tone: 'red' | 'bone' | 'deep' | 'white' }

/** Every letter has a sound, a transposition, a shape and a colour. Left hand is drums, right hand is melody. */
export const KEYS: Record<string, KeyDef> = {
  a: { hit: 'kick', pitch: 0, motif: 'ripple', tone: 'red' },
  s: { hit: 'snare', pitch: 0, motif: 'burst', tone: 'bone' },
  d: { hit: 'hat', pitch: 0, motif: 'ticks', tone: 'white' },
  f: { hit: 'clap', pitch: 0, motif: 'bars', tone: 'bone' },
  g: { hit: 'tom', pitch: 0, motif: 'ring', tone: 'deep' },
  h: { hit: 'rim', pitch: 0, motif: 'spark', tone: 'white' },
  j: { hit: 'wood', pitch: 0, motif: 'spin', tone: 'red' },
  k: { hit: 'shaker', pitch: 0, motif: 'spray', tone: 'bone' },
  l: { hit: 'sub', pitch: 0, motif: 'wave', tone: 'deep' },
  q: { hit: 'pluck', pitch: 0, motif: 'spring', tone: 'red' },
  w: { hit: 'bell', pitch: 0, motif: 'bloom', tone: 'bone' },
  e: { hit: 'chime', pitch: 0, motif: 'orbit', tone: 'white' },
  r: { hit: 'stab', pitch: 0, motif: 'stack', tone: 'red' },
  t: { hit: 'blip', pitch: 0, motif: 'grid', tone: 'bone' },
  y: { hit: 'zap', pitch: 0, motif: 'zigzag', tone: 'red' },
  u: { hit: 'laser', pitch: 0, motif: 'beam', tone: 'white' },
  i: { hit: 'sweep', pitch: 0, motif: 'wipe', tone: 'deep' },
  o: { hit: 'riser', pitch: 0, motif: 'rise', tone: 'red' },
  p: { hit: 'noise', pitch: 0, motif: 'static', tone: 'bone' },
  z: { hit: 'drop', pitch: 0, motif: 'fall', tone: 'red' },
  x: { hit: 'kick', pitch: 5, motif: 'ripple', tone: 'bone' },
  c: { hit: 'snare', pitch: 3, motif: 'burst', tone: 'red' },
  v: { hit: 'pluck', pitch: 7, motif: 'spring', tone: 'white' },
  b: { hit: 'bell', pitch: 5, motif: 'bloom', tone: 'red' },
  n: { hit: 'stab', pitch: -5, motif: 'stack', tone: 'bone' },
  m: { hit: 'chime', pitch: -7, motif: 'orbit', tone: 'deep' },
};

export const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
