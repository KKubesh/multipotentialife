import type { CSSProperties } from 'react';
import { HatchFill } from './hatches';
import { edgeOf, INK, rimOf, type Swatch } from './palettes';
import type { SegKind } from './layout';

/**
 * A pill segment. Two layers: the outer element is the edge (outline), the
 * inner one is the fill, inset by the edge width. Both are clipped to the same
 * shape, so slanted cuts get a matching slanted outline.
 *
 * Color swatches blend top into bottom with a soft seam. Hatch swatches split
 * hard at the middle with a dark divider when the two halves differ.
 */

const vars = (o: Record<string, string>) => o as CSSProperties;

function Fill({ top, bottom, divider }: { top: Swatch; bottom: Swatch; divider: boolean }) {
  if (top.kind === 'color' && bottom.kind === 'color') {
    return <i className="fill" style={vars({ '--t1': top.fill, '--t2': bottom.fill })} />;
  }
  const half = (s: Swatch, cls: string) =>
    s.kind === 'hatch' ? (
      <HatchFill className={cls} hatch={s.hatch} inverted={s.inverted} />
    ) : (
      <span className={cls} style={{ background: s.fill }} />
    );
  return (
    <i className="fill hatched">
      {half(top, 'half top')}
      {half(bottom, 'half bottom')}
      {divider && <b className="divider" style={{ background: INK }} />}
    </i>
  );
}

export interface PillProps {
  kind: SegKind;
  swatches: [Swatch, Swatch];
  /** Draw the divider between halves (two-thread roles in Mono). */
  split: boolean;
  dim?: boolean;
  style?: CSSProperties;
  label?: string;
}

export function Pill({ kind, swatches, split, dim, style, label }: PillProps) {
  const [a, b] = swatches;
  return (
    <div
      className={`seg ${kind}${dim ? ' dim' : ''}`}
      role="img"
      aria-label={label}
      title={label}
      style={{ ...style, ...vars({ '--b1': edgeOf(a), '--b2': edgeOf(b) }) }}
    >
      <Fill top={a} bottom={b} divider={split && (a !== b)} />
    </div>
  );
}

/** A moment on a role: a small circle in the role's colors (or its first hatch). */
export function EventDot({ swatches, style, label }: { swatches: [Swatch, Swatch]; style: CSSProperties; label: string }) {
  const [a, b] = swatches;
  if (a.kind === 'hatch') {
    return (
      <span className="ev hatched" role="img" aria-label={label} title={label} style={{ ...style, background: rimOf(a) }}>
        <HatchFill className="ev-fill" hatch={a.hatch} inverted={a.inverted} />
      </span>
    );
  }
  const bb = b.kind === 'color' ? b : a;
  return (
    <span
      className="ev"
      role="img"
      aria-label={label}
      title={label}
      style={{ ...style, ...vars({ '--t1': a.fill, '--t2': bb.fill, '--b1': a.edge, '--b2': bb.edge }) }}
    />
  );
}

/** A parallel role riding under its host pill. */
export function SidecarBand({ swatch, style, label }: { swatch: Swatch; style: CSSProperties; label: string }) {
  if (swatch.kind === 'hatch') {
    return (
      <span className="band hatched" role="img" aria-label={label} title={label} style={{ ...style, background: INK }}>
        <HatchFill className="band-fill" hatch={swatch.hatch} inverted={swatch.inverted} />
      </span>
    );
  }
  return <span className="band" role="img" aria-label={label} title={label} style={{ ...style, ...vars({ '--t1': swatch.fill, '--b1': swatch.edge }) }} />;
}
