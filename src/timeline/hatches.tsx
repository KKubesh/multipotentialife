import { INK, PAPER, type HatchId } from './palettes';

/**
 * Mono hatches as inline SVG patterns. Defined once per page; pills and dots
 * fill shapes with url(#id). (Embedded SVG data-URI backgrounds are blocked
 * in some sandboxes, so patterns stay inline.)
 */

interface HatchDef {
  w: number;
  h: number;
  stroke: number;
  /** Tile markup; INK is replaced by the mark color. */
  body: string;
  transform?: string;
}

const sandDots = ['1.5,2', '6,1', '9,4.5', '3.5,5.5', '7,7.5', '1,8.5', '5,9.5', '8.5,1.8']
  .map((p) => {
    const [x, y] = p.split(',');
    return `<circle cx='${x}' cy='${y}' r='.55' fill='INK' stroke='none'/>`;
  })
  .join('');

export const HATCHES: Record<HatchId, HatchDef> = {
  dots45: {
    w: 5.85, h: 5.85, stroke: 0,
    body: "<circle cx='0' cy='0' r='1.31' fill='INK'/><circle cx='5.85' cy='0' r='1.31' fill='INK'/><circle cx='0' cy='5.85' r='1.31' fill='INK'/><circle cx='5.85' cy='5.85' r='1.31' fill='INK'/><circle cx='2.925' cy='2.925' r='1.31' fill='INK'/>",
  },
  earth: {
    w: 12, h: 12, stroke: 0.9, transform: 'scale(1.25)',
    body: "<path d='M0 3L3 0M.5 5.5L5.5 .5M3 6L6 3M6 9L9 12M6.5 6.5L11.5 11.5M9 6L12 9M6 3L9 6M6.5 .5L11.5 5.5M9 0L12 3M0 9L3 6M.5 11.5L5.5 6.5M3 12L6 9'/>",
  },
  batt: { w: 6, h: 10, stroke: 0.9, body: "<path d='M3 0C6.5 1.6 6.5 3.4 3 5C-.5 6.6 -.5 8.4 3 10'/>" },
  sand: { w: 10, h: 10, stroke: 1, body: sandDots },
  diag: { w: 5.6, h: 5.6, stroke: 1.1, body: "<path d='M0 5.6L5.6 0M-1 1L1 -1M4.6 6.6L6.6 4.6'/>" },
  cross: {
    w: 5.86, h: 5.86, stroke: 0.85,
    body: "<path d='M0 5.86L5.86 0M-1 1L1 -1M4.86 6.86L6.86 4.86M0 0L5.86 5.86M-1 4.86L1 6.86M4.86 -1L6.86 1'/>",
  },
  steel: { w: 8, h: 8, stroke: 0.9, body: "<path d='M0 8L8 0M-1 1L1 -1M7 9L9 7M0 2.5L2.5 0M2.5 8L8 2.5'/>" },
  alum: {
    w: 8, h: 8, stroke: 0.9,
    body: "<path d='M0 8L8 0M-1 1L1 -1M7 9L9 7'/><path d='M0 4L4 0M4 8L8 4' stroke-dasharray='1.3 1.3'/>",
  },
  gravel: {
    w: 12, h: 12, stroke: 0.8,
    body: "<ellipse cx='3' cy='3' rx='2' ry='1.4'/><ellipse cx='9' cy='5' rx='2' ry='1.5'/><ellipse cx='4' cy='9.5' rx='1.8' ry='1.3'/><ellipse cx='10.5' cy='10.5' rx='1.3' ry='1'/>",
  },
  vline: { w: 3.5, h: 4, stroke: 1.1, body: "<path d='M.55 0V4'/>" },
  check: {
    w: 6.33, h: 6.33, stroke: 0,
    body: "<rect width='3.165' height='3.165' fill='INK'/><rect x='3.165' y='3.165' width='3.165' height='3.165' fill='INK'/>",
  },
  chev: { w: 8, h: 8, stroke: 0.9, body: "<path d='M0 8L4 4L8 8M0 4L4 0L8 4'/>" },
};

export const hatchId = (hatch: HatchId, inverted: boolean) => `mpl-h-${hatch}-${inverted ? 1 : 0}`;

function patternMarkup(): string {
  let out = '';
  for (const [id, d] of Object.entries(HATCHES) as [HatchId, HatchDef][]) {
    for (const inv of [false, true]) {
      const ink = inv ? PAPER : INK;
      const paper = inv ? INK : PAPER;
      out +=
        `<pattern id="${hatchId(id, inv)}" patternUnits="userSpaceOnUse" width="${d.w}" height="${d.h}"` +
        `${d.transform ? ` patternTransform="${d.transform}"` : ''}>` +
        `<rect width="${d.w}" height="${d.h}" fill="${paper}"/>` +
        `<g fill="none" stroke="${ink}" stroke-width="${d.stroke}">${d.body.replace(/INK/g, ink)}</g></pattern>`;
    }
  }
  return out;
}

const MARKUP = patternMarkup();

/** Render once near the root of any page that shows Mono pills. */
export function HatchDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs dangerouslySetInnerHTML={{ __html: MARKUP }} />
    </svg>
  );
}

/** A box filled with a hatch; sized by its parent. */
export function HatchFill({ hatch, inverted, className }: { hatch: HatchId; inverted: boolean; className?: string }) {
  return (
    <svg className={className} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <rect width="100%" height="100%" fill={`url(#${hatchId(hatch, inverted)})`} />
    </svg>
  );
}
