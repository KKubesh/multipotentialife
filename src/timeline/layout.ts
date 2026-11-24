import { monthIndex } from '../data/months';
import type { FloatingEvent, Role, RoleEvent, TimelineDoc, YearMonth } from '../data/schema';

/**
 * The packed layout: turns roles into positioned pills, circles, events and
 * titles. Pure and deterministic so it can be tested without a browser.
 *
 * Time runs left to right at a fixed number of pixels per month. A unit (one
 * role, or a chain of roles at one company) goes into the first row whose
 * contents end before it starts. Every role is drawn the same way: a gray pill
 * (or a circle when it's too short), its threads as dots at the start, its
 * title inside, and its events as rings above. Roles are never tied together
 * by placement; only a chain (role change) joins pills.
 */

export const GEOMETRY = {
  padX: 16,
  axisH: 26,
  pillH: 22,
  /** Space above a pill for event rings, only in rows that have events. */
  eventBand: 22,
  below: 10,
  floatLaneH: 22,
  gap: 2,
  slant: 7,
  minPillW: 14,
  /** A solo role narrower than this is drawn as a circle. */
  circleBelow: 30,
  circleD: 22,
  dotD: 9,
  /** Centre of the first thread dot, from the pill's start. */
  dotLead: 11,
  dotStep: 5,
  dotStepMin: 3,
  ringD: 11.5,
  ringGap: 3,
  eventDotD: 4.5,
  /** Floating-event dot. */
  eventD: 12,
  textGap: 5,
  textPadRight: 9,
  labelGap: 8,
  bottomPad: 10,
} as const;

export type SegKind = 'solo' | 'first' | 'mid' | 'last';
export type Shape = 'pill' | 'circle';

export interface Label {
  /** What fits: the full title, a trimmed one, initials, or one letter. */
  text: string;
  /** in = inside a pill; beside = next to a floating event's dot. */
  mode: 'in' | 'beside';
  /** Left edge and baseline of the text. */
  x: number;
  y: number;
  /** Width available (in) or measured (beside). */
  width: number;
}

export interface LaidSegment {
  role: Role;
  kind: SegKind;
  shape: Shape;
  x0: number;
  x1: number;
  /** Visible left/right edges (gap applied; slant not included). For circles, the circle's box. */
  left: number;
  right: number;
  row: number;
  y: number;
  /** Centres of the thread dots, relative to the pill's left edge (slant included). */
  dots: { x: number; threadId: string }[];
  label: Label | null;
}

export interface LaidEvent {
  role: Role;
  event: RoleEvent;
  /** Dot on the pill's top edge. */
  dotX: number;
  dotY: number;
  /** Centre of the ring above. */
  ringX: number;
  ringY: number;
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
  rowsTop: number;
  segments: LaidSegment[];
  events: LaidEvent[];
  floating: LaidFloating[];
  floatLaneTop: number;
  floatLaneRows: number;
}

export interface LayoutOptions {
  pxPerMonth: number;
  showTitles: boolean;
  measure: (text: string) => number;
  now: YearMonth;
}

/** Roles in a chain whose dates are this close share an edge. */
const SNAP_MONTHS = 2;

interface Span {
  role: Role;
  start: number;
  end: number;
}

type Doc = Pick<TimelineDoc, 'roles' | 'floatingEvents'>;

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

export function fitPxPerMonth(doc: Doc, now: YearMonth, width: number) {
  const { firstMonth, endMonth } = timeRange(doc, now);
  return (width - 2 * GEOMETRY.padX) / Math.max(1, endMonth - firstMonth);
}

function toSpans(roles: Role[], nowMonth: number): Span[] {
  return roles.map((role) => {
    const start = monthIndex(role.start);
    const end = (role.end === 'now' ? nowMonth : monthIndex(role.end)) + 1;
    return { role, start, end: Math.max(end, start + 1) };
  });
}

interface Context {
  options: LayoutOptions;
  pxPerMonth: number;
  xOf: (month: number) => number;
}

interface PlannedUnit {
  segments: Omit<LaidSegment, 'row' | 'y'>[];
  footprintStart: number;
  footprintEnd: number;
  duration: number;
  hasEvents: boolean;
}

/** Dot centres for n threads in a pill whose dots start at `lead`, squeezed to fit `room`. */
export function dotCentres(n: number, lead: number, room: number) {
  if (n === 0) return [];
  const step = Math.max(
    GEOMETRY.dotStepMin,
    Math.min(GEOMETRY.dotStep, n > 1 ? (room - GEOMETRY.dotD) / (n - 1) : GEOMETRY.dotStep),
  );
  return Array.from({ length: n }, (_, i) => lead + i * step);
}

const initials = (title: string) =>
  title
    .split(/[\s/&-]+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w) && !/^(of|and|the|for|at|in)$/i.test(w))
    .map((w) => w[0].toUpperCase())
    .join('');

/** Full title → ellipsis (3+ letters) → initials → one letter + ellipsis → nothing. */
export function fitTitle(title: string, available: number, measure: LayoutOptions['measure']): string | null {
  if (!title || available <= 0) return null;
  if (measure(title) <= available) return title;
  for (let n = title.length - 1; n >= 3; n--) {
    const cut = title.slice(0, n).trimEnd() + '…';
    if (n >= 3 && measure(cut) <= available) return cut;
  }
  const ini = initials(title);
  if (ini.length > 1 && measure(ini) <= available) return ini;
  const one = title[0].toUpperCase() + '…';
  if (measure(one) <= available) return one;
  return null;
}

export function layoutTimeline(doc: Doc, options: LayoutOptions): Layout {
  const nowMonth = monthIndex(options.now);
  const spans = toSpans(doc.roles, nowMonth);
  const { firstMonth, endMonth } = timeRange(doc, options.now);
  const { pxPerMonth } = options;
  const xOf = (month: number) => GEOMETRY.padX + (month - firstMonth) * pxPerMonth;
  const width = xOf(endMonth) + GEOMETRY.padX;
  const context: Context = { options, pxPerMonth, xOf };

  const planned = groupIntoUnits(spans).map((unit) => planUnit(unit, context));
  const lane = planFloatingLane(doc.floatingEvents, context);
  const floatLaneTop = GEOMETRY.axisH;
  const rowsTop = floatLaneTop + lane.rows * GEOMETRY.floatLaneH + (lane.rows ? 4 : 0);

  const { rowOf, rowCount } = packIntoRows(planned, options.measure);
  const rowHasEvents = Array.from({ length: rowCount }, () => false);
  planned.forEach((unit, i) => {
    if (unit.hasEvents) rowHasEvents[rowOf[i]] = true;
  });
  const rowTops: number[] = [];
  let y = rowsTop;
  for (let r = 0; r < rowCount; r++) {
    rowTops.push(y);
    y += (rowHasEvents[r] ? GEOMETRY.eventBand : 0) + GEOMETRY.pillH + GEOMETRY.below;
  }

  const segments: LaidSegment[] = [];
  const eventsByRow: LaidEvent[][] = Array.from({ length: rowCount }, () => []);
  planned.forEach((unit, i) => {
    const row = rowOf[i];
    const pillTop = rowTops[row] + (rowHasEvents[row] ? GEOMETRY.eventBand : 0);
    for (const segment of unit.segments) {
      const label = segment.label && { ...segment.label, y: pillTop + GEOMETRY.pillH / 2 + 4 };
      segments.push({ ...segment, row, y: pillTop, label });
      for (const event of segment.role.events) {
        let dotX: number;
        if (segment.shape === 'circle') dotX = (segment.left + segment.right) / 2;
        else {
          const lead = segment.kind === 'last' || segment.kind === 'mid' ? GEOMETRY.slant : 0;
          const at = xOf(monthIndex(event.date)) + pxPerMonth / 2;
          dotX = Math.max(segment.left - lead + 11, Math.min(segment.right - 8, at));
        }
        const ringY = pillTop - GEOMETRY.eventBand + GEOMETRY.ringD / 2 + 1;
        // The line rises at the same slant as a role-change cut.
        const ringX = dotX + (pillTop - ringY - GEOMETRY.ringD / 2) * (GEOMETRY.slant / GEOMETRY.pillH);
        eventsByRow[row].push({ role: segment.role, event, dotX, dotY: pillTop, ringX, ringY });
      }
    }
  });

  // Nudge rings in a row apart so they never touch.
  const events: LaidEvent[] = [];
  for (const rowEvents of eventsByRow) {
    rowEvents.sort((a, b) => a.ringX - b.ringX);
    let last = -Infinity;
    for (const e of rowEvents) {
      e.ringX = Math.max(e.ringX, last + GEOMETRY.ringD + GEOMETRY.ringGap);
      last = e.ringX;
      events.push(e);
    }
  }

  const floating: LaidFloating[] = lane.events.map((p) => {
    const fy = floatLaneTop + p.lane * GEOMETRY.floatLaneH + (GEOMETRY.floatLaneH - GEOMETRY.eventD) / 2;
    const label: Label | null = p.labelWidth
      ? {
          text: p.title,
          mode: 'beside',
          x: p.x + GEOMETRY.eventD + 6,
          y: fy + GEOMETRY.eventD - 2,
          width: p.labelWidth,
        }
      : null;
    return { event: p.event, x: p.x, y: fy, label };
  });

  const years: Layout['years'] = [];
  for (let month = firstMonth; month <= endMonth; month += 12) years.push({ year: month / 12, x: xOf(month) });

  return {
    width,
    height: y + GEOMETRY.bottomPad,
    rowCount,
    pxPerMonth,
    years,
    rowsTop,
    segments,
    events,
    floating,
    floatLaneTop,
    floatLaneRows: lane.rows,
  };
}

function groupIntoUnits(spans: Span[]): Span[][] {
  const chains = new Map<string, Span[]>();
  const units: Span[][] = [];
  for (const span of spans) {
    if (span.role.chain) {
      const chain = chains.get(span.role.chain) ?? [];
      chain.push(span);
      chains.set(span.role.chain, chain);
    } else units.push([span]);
  }
  for (const chain of chains.values()) units.push(chain.sort((a, b) => a.start - b.start || a.end - b.end));
  return units;
}

function planUnit(unit: Span[], { options, xOf, pxPerMonth }: Context): PlannedUnit {
  const count = unit.length;
  const segments: PlannedUnit['segments'] = [];
  let previousEnd = -Infinity;

  unit.forEach((span, i) => {
    const kind: SegKind = count === 1 ? 'solo' : i === 0 ? 'first' : i === count - 1 ? 'last' : 'mid';
    let x0 = xOf(span.start);
    let x1 = xOf(span.end);
    if (i > 0 && Math.abs(x0 - previousEnd) <= SNAP_MONTHS * pxPerMonth) x0 = previousEnd;
    x0 = Math.max(x0, previousEnd);
    x1 = Math.max(x1, x0 + GEOMETRY.minPillW + GEOMETRY.gap);
    previousEnd = x1;
    let left = x0 + GEOMETRY.gap / 2;
    let right = x1 - GEOMETRY.gap / 2;
    const threads = span.role.threads;

    let shape: Shape = 'pill';
    let dots: LaidSegment['dots'];
    let label: Label | null = null;
    if (kind === 'solo' && right - left < GEOMETRY.circleBelow) {
      // Short role: a circle centred on its dates, dots centred inside (up to 3).
      shape = 'circle';
      const centre = (x0 + x1) / 2;
      left = centre - GEOMETRY.circleD / 2;
      right = centre + GEOMETRY.circleD / 2;
      const shown = threads.slice(0, 3);
      const spread = (shown.length - 1) * GEOMETRY.dotStep;
      dots = shown.map((threadId, k) => ({ threadId, x: GEOMETRY.circleD / 2 - spread / 2 + k * GEOMETRY.dotStep }));
    } else {
      const lead = kind === 'last' || kind === 'mid' ? GEOMETRY.slant : 0;
      const tail = kind === 'first' || kind === 'mid' ? GEOMETRY.slant : 0;
      const width = right - left + lead;
      // Dots get at most the first half of the pill.
      const room = Math.max(GEOMETRY.dotD, (width - lead - tail) / 2);
      dots = dotCentres(threads.length, lead + GEOMETRY.dotLead, room).map((x, k) => ({ x, threadId: threads[k] }));
      if (options.showTitles) {
        const textStart =
          left - lead + (dots.length ? dots[dots.length - 1].x + GEOMETRY.dotD / 2 + GEOMETRY.textGap : lead + 10);
        const textEnd = right - tail - GEOMETRY.textPadRight;
        const text = fitTitle(span.role.title.trim(), textEnd - textStart, options.measure);
        if (text) label = { text, mode: 'in', x: textStart, y: 0, width: textEnd - textStart };
      }
    }
    segments.push({ role: span.role, kind, shape, x0, x1, left, right, dots, label });
  });

  const footprintStart = Math.min(segments[0].x0, segments[0].left - GEOMETRY.gap / 2);
  const lastSeg = segments[segments.length - 1];
  const footprintEnd = Math.max(lastSeg.x1, lastSeg.right + GEOMETRY.gap / 2);
  return {
    segments,
    footprintStart,
    footprintEnd,
    duration: unit[count - 1].end - unit[0].start,
    hasEvents: unit.some((s) => s.role.events.length > 0),
  };
}

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
 * Greedy first-fit, longest first when two units start together. A short
 * overlap (a quarter of the earlier pill at most, e.g. a same-month handover)
 * still shares the row: the earlier pill is trimmed to meet the later one.
 * Sorts `planned` in place; returns each unit's row in that order.
 */
function packIntoRows(planned: PlannedUnit[], measure: LayoutOptions['measure']) {
  planned.sort((a, b) => a.footprintStart - b.footprintStart || b.duration - a.duration);
  const rowEnds: number[] = [];
  const rowLast: (PlannedUnit | null)[] = [];
  const rowOf: number[] = [];

  const fits = (row: number, unit: PlannedUnit) => {
    if (row < 0) return false;
    if (row >= rowEnds.length) return true;
    return rowEnds[row] <= unit.footprintStart + 0.5 || canTrim(row, unit);
  };
  const canTrim = (row: number, unit: PlannedUnit) => {
    const last = rowLast[row];
    if (!last) return false;
    const tail = last.segments[last.segments.length - 1];
    const overlap = rowEnds[row] - unit.footprintStart;
    return (
      tail.shape === 'pill' &&
      unit.segments[0].shape === 'pill' &&
      overlap <= (tail.x1 - tail.x0) / 4 &&
      unit.footprintStart - tail.x0 >= GEOMETRY.minPillW + GEOMETRY.gap
    );
  };

  planned.forEach((unit) => {
    let row = rowEnds.findIndex((_, r) => fits(r, unit));
    if (row < 0) row = rowEnds.length;
    if (row >= rowEnds.length) {
      rowEnds[row] = -Infinity;
      rowLast[row] = null;
    } else if (rowEnds[row] > unit.footprintStart + 0.5 && rowLast[row]) {
      const tail = rowLast[row]!.segments[rowLast[row]!.segments.length - 1];
      tail.x1 = unit.footprintStart;
      tail.right = unit.footprintStart - GEOMETRY.gap / 2;
      if (tail.label) {
        // The title has less room now: fit it again.
        const width = tail.label.width - (rowEnds[row] - unit.footprintStart);
        const text = fitTitle(tail.role.title.trim(), width, measure);
        tail.label = text ? { ...tail.label, text, width } : null;
      }
    }
    rowEnds[row] = unit.footprintEnd;
    rowLast[row] = unit;
    rowOf.push(row);
  });
  return { rowOf, rowCount: rowEnds.length };
}
