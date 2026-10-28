import { monthIndex } from '../data/months';
import type { FloatingEvent, Role, RoleEvent, TimelineDoc, YearMonth } from '../data/schema';

/**
 * The packed layout: turns roles into positioned pills, rows, events and
 * labels. Pure and deterministic so it can be tested without a browser.
 *
 * Time runs left to right at a fixed number of pixels per month. Each row is
 * a horizontal band; a unit (one role, or a chain of roles at one company)
 * goes into the first row whose previous contents end before the unit's
 * footprint starts. A footprint covers everything the unit draws in its row:
 * pills, its sidecar band and any title labels, so nothing ever collides.
 */

export const GEOMETRY = {
  padX: 16,
  axisH: 26,
  pillH: 22,
  /** Space above each pill for floating titles (only when titles are on). */
  labelBand: 16,
  /** Space under each pill: sidecar band (3px gap + 7px) + breathing room. */
  below: 12,
  sidecarGap: 3,
  sidecarH: 7,
  floatLaneH: 22,
  /** Visible space between neighbouring pills. */
  gap: 2,
  /** Horizontal run of the slanted cut between chained roles. */
  slant: 7,
  minPillW: 14,
  eventD: 12,
  /** Horizontal padding inside a pill for its title. */
  textPad: 12,
  /** A title that can't show at least this many characters floats outside. */
  minChars: 10,
  labelGap: 8,
  bottomPad: 10,
} as const;

export type SegKind = 'solo' | 'first' | 'mid' | 'last';

export interface Tether {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Label {
  text: string;
  /** in = full title inside; clip = trimmed inside with an ellipsis; float = outside with a tether. */
  mode: 'in' | 'clip' | 'float';
  /** Left edge and baseline of the text. */
  x: number;
  y: number;
  /** Width available (in/clip) or measured (float). */
  width: number;
  tether: Tether | null;
}

export interface LaidSegment {
  role: Role;
  kind: SegKind;
  /** Time extent in px (before the visual gap is applied). */
  x0: number;
  x1: number;
  /** Visible left/right edges of the pill body (gap applied; slant not included). */
  left: number;
  right: number;
  row: number;
  /** Top of the pill. */
  y: number;
  label: Label | null;
}

export interface LaidEvent {
  role: Role;
  event: RoleEvent;
  x: number;
  y: number;
}

export interface LaidSidecar {
  role: Role;
  hostId: string;
  left: number;
  right: number;
  y: number;
  label: Label | null;
}

export interface LaidFloating {
  event: FloatingEvent;
  x: number;
  y: number;
  label: Label | null;
}

export interface Layout {
  width: number;
  height: number;
  rowCount: number;
  pxPerMonth: number;
  years: { year: number; x: number }[];
  /** y where the role rows start (below the axis and floating-event lane). */
  rowsTop: number;
  rowH: number;
  segments: LaidSegment[];
  events: LaidEvent[];
  sidecars: LaidSidecar[];
  floating: LaidFloating[];
  floatLaneTop: number;
  floatLaneRows: number;
}

export interface LayoutOptions {
  pxPerMonth: number;
  showTitles: boolean;
  /** Width in px of a title at the label font size. */
  measure: (text: string) => number;
  /** The current month, for roles ending "now". */
  now: YearMonth;
}

/** Roles in a row at one company whose dates are this close share an edge. */
const SNAP_MONTHS = 2;

const sameCompany = (a: Role, b: Role) => {
  const company = a.company.trim().toLowerCase();
  return company !== '' && company === b.company.trim().toLowerCase();
};

/** A role's time extent in month indexes; `end` is exclusive. */
interface Span {
  role: Role;
  start: number;
  end: number;
}

type Doc = Pick<TimelineDoc, 'roles' | 'floatingEvents'>;

/** Months shown for a document: January of the first year to a few months past the end. */
export function timeRange(doc: Doc, now: YearMonth) {
  const nowMonth = monthIndex(now);
  const starts = [...doc.roles.map((r) => monthIndex(r.start)), ...doc.floatingEvents.map((e) => monthIndex(e.date))];
  const ends = [
    ...doc.roles.map((r) => Math.max((r.end === 'now' ? nowMonth : monthIndex(r.end)) + 1, monthIndex(r.start) + 1)),
    ...doc.floatingEvents.map((e) => monthIndex(e.date) + 1),
    nowMonth + 1,
  ];
  const firstMonth = Math.floor((starts.length ? Math.min(...starts) : nowMonth) / 12) * 12;
  return { firstMonth, endMonth: Math.max(...ends) + 3 };
}

/** Pixels per month that fit the whole range in a given width. */
export function fitPxPerMonth(doc: Doc, now: YearMonth, width: number) {
  const { firstMonth, endMonth } = timeRange(doc, now);
  return (width - 2 * GEOMETRY.padX) / Math.max(1, endMonth - firstMonth);
}

/** What every step of the layout needs to know. */
interface Context {
  options: LayoutOptions;
  pxPerMonth: number;
  /** Left edge in px of a month. */
  xOf: (month: number) => number;
  /** Right limit for anything drawn. */
  contentRight: number;
}

/** A unit (one role, or a chain) laid out relative to the top of its row. */
interface PlannedUnit {
  segments: Omit<LaidSegment, 'row' | 'y'>[];
  sidecar: { span: Span; hostId: string; left: number; right: number; label: Label | null } | null;
  /** Horizontal extent of everything the unit draws, labels included. */
  footprintStart: number;
  footprintEnd: number;
  /** The footprint starts / ends at a pill edge (not a label or sidecar). */
  startsAtPill: boolean;
  endsAtPill: boolean;
  /** Months from the first start to the last end, to place longer units first. */
  duration: number;
}

export function layoutTimeline(doc: Doc, options: LayoutOptions): Layout {
  const nowMonth = monthIndex(options.now);
  const spans: Span[] = doc.roles.map((role) => {
    const start = monthIndex(role.start);
    const end = (role.end === 'now' ? nowMonth : monthIndex(role.end)) + 1;
    return { role, start, end: Math.max(end, start + 1) };
  });

  const { firstMonth, endMonth } = timeRange(doc, options.now);
  const { pxPerMonth } = options;
  const xOf = (month: number) => GEOMETRY.padX + (month - firstMonth) * pxPerMonth;
  const width = xOf(endMonth) + GEOMETRY.padX;
  const context: Context = { options, pxPerMonth, xOf, contentRight: width - GEOMETRY.padX };

  const sidecarHosts = assignSidecarHosts(spans);
  const units = groupIntoUnits(spans, sidecarHosts);
  const planned = units.map((unit) => planUnit(unit, spans, sidecarHosts, context));

  const lane = planFloatingLane(doc.floatingEvents, context);
  const floatLaneTop = GEOMETRY.axisH;
  const rowsTop = floatLaneTop + lane.rows * GEOMETRY.floatLaneH + (lane.rows ? 4 : 0);
  // With titles on, the row also holds sidecar labels under the pill, so it gets a little more air.
  const rowH = (options.showTitles ? GEOMETRY.labelBand + 6 : 0) + GEOMETRY.pillH + GEOMETRY.below;

  const { rowOf, rowCount } = packIntoRows(planned, pxPerMonth);

  const segments: LaidSegment[] = [];
  const events: LaidEvent[] = [];
  const sidecars: LaidSidecar[] = [];
  planned.forEach((unit, i) => {
    const row = rowOf[i];
    const rowTop = rowsTop + row * rowH;
    // Labels were planned with a title band above the pill; without titles there is no band.
    const bandOffset = options.showTitles ? 0 : -GEOMETRY.labelBand;
    const place = (label: Label | null): Label | null =>
      label && {
        ...label,
        y: rowTop + label.y + bandOffset,
        tether: label.tether && {
          ...label.tether,
          y1: rowTop + label.tether.y1 + bandOffset,
          y2: rowTop + label.tether.y2 + bandOffset,
        },
      };
    const pillTop = rowTop + (options.showTitles ? GEOMETRY.labelBand : 0);

    for (const segment of unit.segments) {
      segments.push({ ...segment, row, y: pillTop, label: place(segment.label) });
      for (const event of segment.role.events) {
        events.push({
          role: segment.role,
          event,
          x: eventX(monthIndex(event.date), segment.left, segment.right, context),
          y: pillTop + (GEOMETRY.pillH - GEOMETRY.eventD) / 2,
        });
      }
    }
    if (unit.sidecar) {
      sidecars.push({
        role: unit.sidecar.span.role,
        hostId: unit.sidecar.hostId,
        left: unit.sidecar.left,
        right: unit.sidecar.right,
        y: pillTop + GEOMETRY.pillH + GEOMETRY.sidecarGap,
        label: place(unit.sidecar.label),
      });
    }
  });

  const floating: LaidFloating[] = lane.events.map((planned) => {
    const y = floatLaneTop + planned.lane * GEOMETRY.floatLaneH + (GEOMETRY.floatLaneH - GEOMETRY.eventD) / 2;
    const label: Label | null = planned.labelWidth
      ? {
          text: planned.title,
          mode: 'float',
          x: planned.x + GEOMETRY.eventD + 6,
          y: y + GEOMETRY.eventD - 2,
          width: planned.labelWidth,
          tether: null,
        }
      : null;
    return { event: planned.event, x: planned.x, y, label };
  });

  const years: Layout['years'] = [];
  for (let month = firstMonth; month <= endMonth; month += 12) years.push({ year: month / 12, x: xOf(month) });

  return {
    width,
    height: rowsTop + rowCount * rowH + GEOMETRY.bottomPad,
    rowCount,
    pxPerMonth,
    years,
    rowsTop,
    rowH,
    segments,
    events,
    sidecars,
    floating,
    floatLaneTop,
    floatLaneRows: lane.rows,
  };
}

/** Left edge of an event dot in its month, kept inside its pill. */
function eventX(month: number, pillLeft: number, pillRight: number, context: Context) {
  const centered = context.xOf(month) + context.pxPerMonth / 2 - GEOMETRY.eventD / 2;
  return Math.max(pillLeft + 4, Math.min(pillRight - GEOMETRY.eventD - 4, centered));
}

/**
 * A role marked "sidecar" rides under the same-company role it overlaps most.
 * One sidecar per host; any extra side role gets its own row instead.
 * Returns side role id → host span.
 */
function assignSidecarHosts(spans: Span[]): Map<string, Span> {
  const hostOf = new Map<string, Span>();
  const hostsUsed = new Set<Span>();
  for (const side of [...spans].sort((a, b) => a.start - b.start)) {
    if (side.role.overlapStyle !== 'sidecar') continue;
    let best: Span | null = null;
    let bestOverlap = 0;
    for (const other of spans) {
      const eligible =
        other !== side &&
        other.role.overlapStyle !== 'sidecar' &&
        !hostsUsed.has(other) &&
        sameCompany(side.role, other.role);
      if (!eligible) continue;
      const overlap = Math.min(side.end, other.end) - Math.max(side.start, other.start);
      if (overlap > bestOverlap) {
        best = other;
        bestOverlap = overlap;
      }
    }
    if (best) {
      hostOf.set(side.role.id, best);
      hostsUsed.add(best);
    }
  }
  return hostOf;
}

/** Units are what get placed in rows: a chain (sorted by start) or a single role. Sidecars ride with their host. */
function groupIntoUnits(spans: Span[], sidecarHosts: Map<string, Span>): Span[][] {
  const chains = new Map<string, Span[]>();
  const units: Span[][] = [];
  for (const span of spans) {
    if (sidecarHosts.has(span.role.id)) continue;
    if (span.role.chain) {
      const chain = chains.get(span.role.chain) ?? [];
      chain.push(span);
      chains.set(span.role.chain, chain);
    } else units.push([span]);
  }
  for (const chain of chains.values()) units.push(chain.sort((a, b) => a.start - b.start || a.end - b.end));
  return units;
}

/** Baseline of a floating title, inside the label band above the pill (row top = 0). */
const floatBaseline = GEOMETRY.labelBand - 4;

function fitTitle(title: string, available: number, measure: LayoutOptions['measure']): Label['mode'] {
  if (!title) return 'float';
  if (measure(title) <= available) return 'in';
  return measure(title.slice(0, GEOMETRY.minChars) + '…') <= available ? 'clip' : 'float';
}

/** A floating title with a short tether line back to the pill. */
function floatingLabel(text: string, width: number, x: number, tether: { x1: number; y1: number; x2: number }): Label {
  return { text, mode: 'float', x, y: floatBaseline, width, tether: { ...tether, y2: floatBaseline - 4 } };
}

/** Lays out one unit relative to its row top (0), including its titles and any sidecar. */
function planUnit(unit: Span[], spans: Span[], sidecarHosts: Map<string, Span>, context: Context): PlannedUnit {
  const { options, xOf, contentRight, pxPerMonth } = context;
  const count = unit.length;
  const segments: PlannedUnit['segments'] = [];
  let previousEnd = -Infinity;
  let lastChainLabelEnd = -Infinity; // right end of the last floating title in this chain

  unit.forEach((span, i) => {
    const kind: SegKind = count === 1 ? 'solo' : i === 0 ? 'first' : i === count - 1 ? 'last' : 'mid';
    let x0 = xOf(span.start);
    let x1 = xOf(span.end);
    if (i > 0 && Math.abs(x0 - previousEnd) <= SNAP_MONTHS * pxPerMonth) x0 = previousEnd; // handover snap
    x0 = Math.max(x0, previousEnd);
    x1 = Math.max(x1, x0 + GEOMETRY.minPillW + GEOMETRY.gap);
    previousEnd = x1;
    const left = x0 + GEOMETRY.gap / 2;
    const right = x1 - GEOMETRY.gap / 2;

    let label: Label | null = null;
    const title = span.role.title.trim();
    if (options.showTitles && title) {
      const padLeft = GEOMETRY.textPad + (kind === 'last' || kind === 'mid' ? GEOMETRY.slant : 0);
      const padRight = GEOMETRY.textPad + (kind === 'first' || kind === 'mid' ? GEOMETRY.slant : 0);
      // Keep inside text clear of event dots.
      const firstEventX = span.role.events
        .map((event) => eventX(monthIndex(event.date), left, right, context))
        .sort((a, b) => a - b)[0];
      const textRight = firstEventX !== undefined ? Math.min(right - padRight, firstEventX - 6) : right - padRight;
      const available = textRight - (left + padLeft);
      const mode = fitTitle(title, available, options.measure);

      if (mode !== 'float') {
        const baseline = GEOMETRY.labelBand + GEOMETRY.pillH / 2 + 4;
        label = { text: title, mode, x: left + padLeft, y: baseline, width: available, tether: null };
      } else {
        // Floating titles sit in the label band above the row. A title that can't be
        // placed without touching another one is left off (it's still in the hover card).
        const titleWidth = options.measure(title);
        if (kind === 'solo') {
          if (right + GEOMETRY.labelGap + titleWidth <= contentRight) {
            const x = right + GEOMETRY.labelGap;
            label = floatingLabel(title, titleWidth, x, { x1: right - 4, y1: GEOMETRY.labelBand + 3, x2: x - 3 });
          } else if (left - GEOMETRY.labelGap - titleWidth >= GEOMETRY.padX) {
            const x = left - GEOMETRY.labelGap - titleWidth;
            label = floatingLabel(title, titleWidth, x, {
              x1: left + 4,
              y1: GEOMETRY.labelBand + 3,
              x2: x + titleWidth + 3,
            });
          }
        } else {
          // Chains: titles run left to right in reading order and never overlap each other.
          let x = kind === 'last' ? right + GEOMETRY.labelGap : left + GEOMETRY.textPad;
          x = Math.max(x, lastChainLabelEnd + GEOMETRY.labelGap);
          if (x + titleWidth > contentRight) x = contentRight - titleWidth;
          if (x >= lastChainLabelEnd + GEOMETRY.labelGap && x >= GEOMETRY.padX) {
            lastChainLabelEnd = x + titleWidth;
            if (kind === 'last' && x >= right) {
              label = floatingLabel(title, titleWidth, x, { x1: right - 4, y1: GEOMETRY.labelBand + 3, x2: x - 3 });
            } else {
              const anchor = Math.min(left + GEOMETRY.textPad, right - 4);
              label = floatingLabel(title, titleWidth, x, {
                x1: anchor,
                y1: GEOMETRY.labelBand + 2,
                x2: Math.max(x - 3, anchor),
              });
            }
          }
        }
      }
    }
    segments.push({ role: span.role, kind, x0, x1, left, right, label });
  });

  const sidecar = planSidecar(unit, spans, sidecarHosts, context);

  // Footprint: pills edge to edge; labels plus breathing room so text never touches a neighbour.
  const pillStart = segments[0].x0;
  const pillEnd = segments[segments.length - 1].x1;
  const floatingLabels = [...segments.map((segment) => segment.label), sidecar?.label ?? null].filter(
    (label): label is Label => !!label && label.mode === 'float',
  );
  const sidecarStart = sidecar ? sidecar.left - GEOMETRY.gap / 2 : Infinity;
  const sidecarEnd = sidecar ? sidecar.right + GEOMETRY.gap / 2 : -Infinity;
  const labelsStart = Math.min(...floatingLabels.map((label) => label.x - GEOMETRY.labelGap));
  const labelsEnd = Math.max(...floatingLabels.map((label) => label.x + label.width + GEOMETRY.labelGap));
  const footprintStart = Math.min(pillStart, sidecarStart, labelsStart);
  const footprintEnd = Math.max(pillEnd, sidecarEnd, labelsEnd);

  return {
    segments,
    sidecar,
    footprintStart,
    footprintEnd,
    startsAtPill: footprintStart === pillStart,
    endsAtPill: footprintEnd === pillEnd,
    duration: unit[count - 1].end - unit[0].start,
  };
}

/** The sidecar band under a host role in this unit, if it has one. */
function planSidecar(
  unit: Span[],
  spans: Span[],
  sidecarHosts: Map<string, Span>,
  { options, xOf, contentRight }: Context,
): PlannedUnit['sidecar'] {
  for (const [sideId, host] of sidecarHosts) {
    if (!unit.includes(host)) continue;
    const side = spans.find((span) => span.role.id === sideId)!;
    const left = xOf(side.start) + GEOMETRY.gap / 2;
    const right = Math.max(xOf(side.end) - GEOMETRY.gap / 2, left + GEOMETRY.minPillW);
    let label: Label | null = null;
    const title = side.role.title.trim();
    if (options.showTitles && title) {
      const titleWidth = options.measure(title);
      const bandBottom = GEOMETRY.labelBand + GEOMETRY.pillH + GEOMETRY.sidecarGap + GEOMETRY.sidecarH;
      const x = right + GEOMETRY.labelGap + titleWidth <= contentRight ? right + 6 : left - 6 - titleWidth;
      label = { text: title, mode: 'float', x, y: bandBottom + 1, width: titleWidth, tether: null };
    }
    return { span: side, hostId: host.role.id, left, right, label };
  }
  return null;
}

/** Floating events go in a lane at the top, packed into as many sub-rows as their titles need. */
function planFloatingLane(floatingEvents: FloatingEvent[], { options, xOf, pxPerMonth }: Context) {
  const subRowEnds: number[] = [];
  const events = [...floatingEvents]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((event) => {
      const x = xOf(monthIndex(event.date)) + pxPerMonth / 2 - GEOMETRY.eventD / 2;
      const title = event.title.trim();
      const labelWidth = options.showTitles && title ? options.measure(title) : 0;
      const end = x + GEOMETRY.eventD + (labelWidth ? 6 + labelWidth : 0);
      let lane = subRowEnds.findIndex((rowEnd) => rowEnd + GEOMETRY.labelGap <= x);
      if (lane < 0) {
        lane = subRowEnds.length;
        subRowEnds.push(-Infinity);
      }
      subRowEnds[lane] = end;
      return { event, x, lane, title, labelWidth };
    });
  return { events, rows: subRowEnds.length };
}

/**
 * Greedy first-fit packing, longest first when two units start together.
 * A one-month overlap between pills (one role ends the month the next starts)
 * still shares the row: the earlier pill is trimmed to meet the later one.
 * Sorts `planned` in place; returns each unit's row in that order.
 */
function packIntoRows(planned: PlannedUnit[], pxPerMonth: number) {
  planned.sort((a, b) => a.footprintStart - b.footprintStart || b.duration - a.duration);
  const rows: { end: number; endsAtPill: boolean; last: PlannedUnit | null }[] = [];
  const lastSegment = (unit: PlannedUnit) => unit.segments[unit.segments.length - 1];

  const rowOf = planned.map((unit) => {
    let row = rows.findIndex((candidate) => {
      if (candidate.end <= unit.footprintStart + 0.5) return true;
      if (!candidate.endsAtPill || !unit.startsAtPill || !candidate.last) return false;
      const overlap = candidate.end - unit.footprintStart;
      const tail = lastSegment(candidate.last);
      return overlap <= pxPerMonth + 0.5 && unit.footprintStart - tail.x0 >= GEOMETRY.minPillW + GEOMETRY.gap;
    });
    if (row < 0) {
      row = rows.length;
      rows.push({ end: -Infinity, endsAtPill: true, last: null });
    } else if (rows[row].end > unit.footprintStart + 0.5 && rows[row].last) {
      // Trim the earlier pill so the two meet.
      const tail = lastSegment(rows[row].last!);
      const cut = tail.x1 - unit.footprintStart;
      tail.x1 = unit.footprintStart;
      tail.right = unit.footprintStart - GEOMETRY.gap / 2;
      if (tail.label && tail.label.mode !== 'float') tail.label = { ...tail.label, width: tail.label.width - cut };
    }
    rows[row] = { end: unit.footprintEnd, endsAtPill: unit.endsAtPill, last: unit };
    return row;
  });
  return { rowOf, rowCount: rows.length };
}
