import type { PaletteId, TimelineDoc } from '../data/schema';

/**
 * Palettes. Color palettes give each swatch a light fill and a stronger edge.
 * The Mono palette gives each swatch an architectural hatch in black on white
 * or white on black. Threads take swatches in creation order unless the user
 * picked a different one (settings.threadSwatches).
 */

export interface ColorSwatch {
  kind: 'color';
  fill: string;
  edge: string;
}

export type HatchId =
  'dots45' | 'earth' | 'batt' | 'sand' | 'diag' | 'cross' | 'steel' | 'alum' | 'gravel' | 'vline' | 'check' | 'chev';

export interface HatchSwatch {
  kind: 'hatch';
  hatch: HatchId;
  /** true = white marks on black. */
  inverted: boolean;
}

export type Swatch = ColorSwatch | HatchSwatch;

export const INK = '#141414';
export const PAPER = '#ffffff';

/** A role with no threads yet. */
export const UNTHREADED: ColorSwatch = { kind: 'color', fill: '#ffffff', edge: '#d9d9d9' };

const c = (fill: string, edge: string): ColorSwatch => ({ kind: 'color', fill, edge });
const h = (hatch: HatchId, inverted = false): HatchSwatch => ({ kind: 'hatch', hatch, inverted });

export interface Palette {
  id: PaletteId;
  name: string;
  /** Default order; thread #n takes swatches[(n - 1) % length]. */
  swatches: Swatch[];
  /** Extra swatches people can switch a thread to. */
  library: Swatch[];
}

export const PALETTES: Record<PaletteId, Palette> = {
  soft: {
    id: 'soft',
    name: 'Soft',
    swatches: [
      c('#bae0ff', '#69b1ff'),
      c('#efdbff', '#b37feb'),
      c('#ffd8bf', '#ff9c6e'),
      c('#ffd6e7', '#ff85c0'),
      c('#d9f7be', '#95de64'),
      c('#fff1b8', '#ffd666'),
    ],
    library: [c('#b5f5ec', '#5cdbd3'), c('#d6e4ff', '#85a5ff')],
  },
  earth: {
    id: 'earth',
    name: 'Earth',
    swatches: [
      c('#dbe8d3', '#94b57f'),
      c('#e2ddef', '#9b8dc2'),
      c('#f4dfcc', '#d29c6c'),
      c('#f2dcd9', '#c98d86'),
      c('#ece8e1', '#b8ad9b'),
      c('#d8e6ea', '#86a9b4'),
    ],
    library: [],
  },
  bloom: {
    id: 'bloom',
    name: 'Bloom',
    swatches: [
      c('#b5f5ec', '#36cfc9'),
      c('#d6e4ff', '#597ef7'),
      c('#fff1b8', '#d4b106'),
      c('#ffd6e7', '#f759ab'),
      c('#d9f7be', '#73d13d'),
      c('#ffe7ba', '#fa8c16'),
    ],
    library: [],
  },
  mono: {
    id: 'mono',
    name: 'Mono',
    swatches: [h('dots45', true), h('earth'), h('batt'), h('sand'), h('diag', true), h('cross')],
    library: [h('steel'), h('alum'), h('gravel'), h('vline'), h('check'), h('chev')],
  },
};

/** All swatches a thread can use in a palette: defaults, then the library. */
export const allSwatches = (p: Palette): Swatch[] => [...p.swatches, ...p.library];

export function swatchForThread(doc: TimelineDoc, threadId: string): Swatch {
  const palette = PALETTES[doc.settings.palette];
  const options = allSwatches(palette);
  const override = doc.settings.threadSwatches[threadId];
  if (override !== undefined && override < options.length) return options[override];
  const t = doc.threads.find((x) => x.id === threadId);
  if (!t) return UNTHREADED;
  return palette.swatches[(t.order - 1) % palette.swatches.length];
}

/** The two swatches that fill a pill: its first two threads (or one thread twice). */
export function pillSwatches(doc: TimelineDoc, threads: string[]): [Swatch, Swatch] {
  if (threads.length === 0) return [UNTHREADED, UNTHREADED];
  const a = swatchForThread(doc, threads[0]);
  const b = threads[1] ? swatchForThread(doc, threads[1]) : a;
  return [a, b];
}

/** Edge color of a swatch: the pill outline, divider and event rim. */
export const edgeOf = (s: Swatch) => (s.kind === 'color' ? s.edge : INK);
/** Rim of an event dot: white on white-on-black hatches so it shows on its own dark pill. */
export const rimOf = (s: Swatch) => (s.kind === 'color' ? s.edge : s.inverted ? PAPER : INK);
