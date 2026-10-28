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
 *
 * Pills, bands and dots are buttons: tap or Enter opens the role's detail.
 */

const vars = (o: Record<string, string>) => o as CSSProperties;

/** What every tappable mark on the timeline takes. */
interface TapProps {
  label: string;
  style: CSSProperties;
  onSelect?: () => void;
  selected?: boolean;
  /** Faded while something else is selected. */
  dim?: boolean;
}

const stateClass = ({ selected, dim }: Pick<TapProps, 'selected' | 'dim'>) =>
  `${selected ? ' selected' : ''}${dim ? ' dim' : ''}`;

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

export interface PillProps extends TapProps {
  kind: SegKind;
  swatches: [Swatch, Swatch];
  /** Draw the divider between halves (two-thread roles in Mono). */
  split: boolean;
}

export function Pill({ kind, swatches, split, style, label, onSelect, selected, dim }: PillProps) {
  const [a, b] = swatches;
  return (
    <button
      type="button"
      className={`seg tap ${kind}${stateClass({ selected, dim })}`}
      aria-label={label}
      aria-pressed={selected}
      title={label}
      data-select
      onClick={onSelect}
      style={{ ...style, ...vars({ '--b1': edgeOf(a), '--b2': edgeOf(b) }) }}
    >
      <Fill top={a} bottom={b} divider={split && a !== b} />
    </button>
  );
}

/** A moment on a role: a small circle in the role's colors (or its first hatch). */
export function EventDot({
  swatches,
  style,
  label,
  onSelect,
  selected,
  dim,
}: TapProps & { swatches: [Swatch, Swatch] }) {
  const [a, b] = swatches;
  const common = {
    type: 'button' as const,
    'aria-label': label,
    'aria-pressed': selected,
    title: label,
    'data-select': true,
    onClick: onSelect,
  };
  if (a.kind === 'hatch') {
    return (
      <button
        {...common}
        className={`ev tap hatched${stateClass({ selected, dim })}`}
        style={{ ...style, background: rimOf(a) }}
      >
        <HatchFill className="ev-fill" hatch={a.hatch} inverted={a.inverted} />
      </button>
    );
  }
  const bb = b.kind === 'color' ? b : a;
  return (
    <button
      {...common}
      className={`ev tap${stateClass({ selected, dim })}`}
      style={{ ...style, ...vars({ '--t1': a.fill, '--t2': bb.fill, '--b1': a.edge, '--b2': bb.edge }) }}
    />
  );
}

/** A parallel role riding under its host pill. */
export function SidecarBand({ swatch, style, label, onSelect, selected, dim }: TapProps & { swatch: Swatch }) {
  const common = {
    type: 'button' as const,
    'aria-label': label,
    'aria-pressed': selected,
    title: label,
    'data-select': true,
    onClick: onSelect,
  };
  if (swatch.kind === 'hatch') {
    return (
      <button
        {...common}
        className={`band tap hatched${stateClass({ selected, dim })}`}
        style={{ ...style, background: INK }}
      >
        <HatchFill className="band-fill" hatch={swatch.hatch} inverted={swatch.inverted} />
      </button>
    );
  }
  return (
    <button
      {...common}
      className={`band tap${stateClass({ selected, dim })}`}
      style={{ ...style, ...vars({ '--t1': swatch.fill, '--b1': swatch.edge }) }}
    />
  );
}

/** An event with no parent role, in the lane along the top. */
export function FloatingDot({ style, label, onSelect, selected, dim }: TapProps) {
  return (
    <button
      type="button"
      className={`fev tap${stateClass({ selected, dim })}`}
      aria-label={label}
      aria-pressed={selected}
      title={label}
      data-select
      onClick={onSelect}
      style={style}
    />
  );
}
