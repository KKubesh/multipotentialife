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

/**
 * A role with no threads yet: a slate tint, distinct from every palette color,
 * so an untagged timeline reads as "not colored yet" rather than faint.
 */
export const UNTHREADED: ColorSwatch = { kind: 'color', fill: '#eef0f4', edge: '#8793a5' };

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
      c('#bae0ff', '#2e93ff'),
      c('#efdbff', '#af78ea'),
      c('#ffd8bf', '#d9784a'),
      c('#ffd6e7', '#df6aa3'),
      c('#d9f7be', '#56a223'),
      c('#fff1b8', '#ba8800'),
    ],
    library: [c('#b5f5ec', '#24a199'), c('#d6e4ff', '#618bff')],
  },
  earth: {
    id: 'earth',
    name: 'Earth',
    swatches: [
      c('#dbe8d3', '#749c5a'),
      c('#e2ddef', '#988ac0'),
      c('#f4dfcc', '#c78347'),
      c('#f2dcd9', '#c3817a'),
      c('#ece8e1', '#9f9077'),
      c('#d8e6ea', '#6e98a5'),
    ],
    library: [],
  },
  bloom: {
    id: 'bloom',
    name: 'Bloom',
    swatches: [
      c('#b5f5ec', '#27a19c'),
      c('#d6e4ff', '#597ef7'),
      c('#fff1b8', '#ac9005'),
      c('#ffd6e7', '#f752a7'),
      c('#d9f7be', '#54a327'),
      c('#ffe7ba', '#e07605'),
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
