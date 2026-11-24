import type { CSSProperties } from 'react';
import { HatchFill } from './hatches';
import { GEOMETRY, type SegKind, type Shape } from './layout';
import { dotColor, INK, type Swatch } from './palettes';

/**
 * Timeline marks. Every pill is gray with a slate edge; a role's colour lives
 * in its thread dots. With a thread picked in the key, pills that have it
 * ("lit") fill in that thread's colour or hatch.
 *
 * Pills, circles and event rings are buttons: tap or Enter opens the role.
 * Two layers per pill: the outer element is the edge, the inner `.fill` is
 * inset by the edge width, both clipped to the same shape so slanted cuts get
 * a matching slanted edge.
 */

const vars = (o: Record<string, string>) => o as CSSProperties;

/** What every tappable mark on the timeline takes. */
interface TapProps {
  label: string;
  style: CSSProperties;
  onSelect?: () => void;
  selected?: boolean;
  /** Faded: not part of what's open or filtered. */
  dim?: boolean;
  /** Stepped back part way: in the thread filter, but not the open role. */
  soft?: boolean;
}

const stateClass = ({ selected, dim, soft }: Pick<TapProps, 'selected' | 'dim' | 'soft'>) =>
  `${selected ? ' selected' : ''}${dim ? ' dim' : ''}${soft ? ' soft' : ''}`;

const GRAY = { '--fill': '#f6f7f9', '--edge': '#8793a5' };

export interface PillProps extends TapProps {
  kind: SegKind;
  shape: Shape;
  /** Thread dots, first thread first; x is the dot's centre from the pill's left edge. */
  dots: { x: number; swatch: Swatch }[];
  /** The picked thread's swatch when this role has it: the pill fills with it. */
  lit?: Swatch | null;
}

export function Pill({ kind, shape, dots, lit, style, label, onSelect, selected, dim, soft }: PillProps) {
  const colors = !lit
    ? GRAY
    : lit.kind === 'color'
      ? { '--fill': lit.fill, '--edge': lit.edge }
      : { '--fill': '#fff', '--edge': INK };
  return (
    <button
      type="button"
      className={`seg tap ${shape === 'circle' ? 'circle' : kind}${lit ? ' lit' : ''}${stateClass({ selected, dim, soft })}`}
      aria-label={label}
      aria-pressed={selected}
      title={label}
      data-select
      onClick={onSelect}
      style={{ ...style, ...vars(colors) }}
    >
      <i className="fill">
        {lit?.kind === 'hatch' && <HatchFill className="fill-hatch" hatch={lit.hatch} inverted={lit.inverted} />}
      </i>
      {/* Later dots first, so the first thread sits on top of the stack. */}
      {dots
        .map((d, i) => (
          <b key={i} className="tdot" style={{ left: d.x - GEOMETRY.dotD / 2, background: dotColor(d.swatch) }} />
        ))
        .reverse()}
    </button>
  );
}

export interface EventMarkProps extends Omit<TapProps, 'style'> {
  /** Small dot on the pill's top edge, at the event's date. */
  dotX: number;
  dotY: number;
  /** Centre of the hollow ring above it. */
  ringX: number;
  ringY: number;
  /** Ring colour: the role's first thread. */
  color: string;
}

/** A moment during a role: hollow ring above the pill, a slanted line down to a dot on its top edge. */
export function EventMark({ dotX, dotY, ringX, ringY, color, label, onSelect, selected, dim, soft }: EventMarkProps) {
  const r = GEOMETRY.ringD / 2;
  const left = Math.min(dotX, ringX) - r - 2;
  const top = ringY - r - 2;
  const w = Math.abs(ringX - dotX) + 2 * r + 4;
  const h = dotY - top + GEOMETRY.eventDotD / 2 + 2;
  // The line runs from the ring's edge to the dot.
  const dx = dotX - ringX;
  const dy = dotY - ringY;
  const len = Math.hypot(dx, dy) || 1;
  return (
    <button
      type="button"
      className={`evm tap${stateClass({ selected, dim, soft })}`}
      aria-label={label}
      aria-pressed={selected}
      title={label}
      data-select
      onClick={onSelect}
      style={{ left, top, width: w, height: h }}
    >
      <svg width={w} height={h} aria-hidden="true">
        <line
          x1={ringX + (dx / len) * r - left}
          y1={ringY + (dy / len) * r - top}
          x2={dotX - left}
          y2={dotY - top}
          className="evm-line"
        />
        <circle cx={ringX - left} cy={ringY - top} r={r - 1.25} className="evm-ring" style={{ stroke: color }} />
        <circle cx={dotX - left} cy={dotY - top} r={GEOMETRY.eventDotD / 2} className="evm-dot" />
      </svg>
    </button>
  );
}

/** An event with no parent role, in the lane along the top. */
export function FloatingDot({ style, label, onSelect, selected, dim, soft }: TapProps) {
  return (
    <button
      type="button"
      className={`fev tap${stateClass({ selected, dim, soft })}`}
      aria-label={label}
      aria-pressed={selected}
      title={label}
      data-select
      onClick={onSelect}
      style={style}
    />
  );
}
