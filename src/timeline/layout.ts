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

export const monthIndex = (ym: YearMonth) => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1;

const SNAP_MONTHS = 2;
const sameCompany = (a: Role, b: Role) =>
  a.company.trim().toLowerCase() !== '' && a.company.trim().toLowerCase() === b.company.trim().toLowerCase();

interface Span {
  role: Role;
  s: number;
  e: number;
}

/** Months shown for a document (January of the first year to a few months past the end). */
export function timeRange(doc: Pick<TimelineDoc, 'roles' | 'floatingEvents'>, now: YearMonth) {
  const nowIdx = monthIndex(now);
  const starts = [...doc.roles.map((r) => monthIndex(r.start)), ...doc.floatingEvents.map((e) => monthIndex(e.date))];
  const ends = [
    ...doc.roles.map((r) => Math.max((r.end === 'now' ? nowIdx : monthIndex(r.end)) + 1, monthIndex(r.start) + 1)),
    ...doc.floatingEvents.map((e) => monthIndex(e.date) + 1),
    nowIdx + 1,
  ];
  const startIdx = starts.length ? Math.floor(Math.min(...starts) / 12) * 12 : Math.floor(nowIdx / 12) * 12;
  return { startIdx, endIdx: Math.max(...ends) + 3 };
}

/** Pixels per month that fit the whole range in a given width. */
export function fitPxPerMonth(doc: Pick<TimelineDoc, 'roles' | 'floatingEvents'>, now: YearMonth, width: number) {
  const { startIdx, endIdx } = timeRange(doc, now);
  return (width - 2 * GEOMETRY.padX) / Math.max(1, endIdx - startIdx);
}

export function layoutTimeline(doc: Pick<TimelineDoc, 'roles' | 'floatingEvents'>, opt: LayoutOptions): Layout {
  const G = GEOMETRY;
  const nowIdx = monthIndex(opt.now);
  const spans: Span[] = doc.roles.map((role) => {
    const s = monthIndex(role.start);
    const e = (role.end === 'now' ? nowIdx : monthIndex(role.end)) + 1;
    return { role, s, e: Math.max(e, s + 1) };
  });

  const { startIdx, endIdx } = timeRange(doc, opt.now);
  const ppm = opt.pxPerMonth;
  const X = (m: number) => G.padX + (m - startIdx) * ppm;
  const width = X(endIdx) + G.padX;
  const maxX = width - G.padX;

  // Sidecars: a role marked "sidecar" rides under the same-company role it overlaps most.
  // One sidecar per host; any extra side role gets its own row instead.
  const sidecarOf = new Map<string, Span>(); // side role id -> host span
  const hostsUsed = new Set<Span>();
  for (const sp of [...spans].sort((a, b) => a.s - b.s)) {
    if (sp.role.overlapStyle !== 'sidecar') continue;
    let best: Span | null = null;
    let bestOverlap = 0;
    for (const other of spans) {
      if (other === sp || other.role.overlapStyle === 'sidecar' || hostsUsed.has(other) || !sameCompany(sp.role, other.role)) continue;
      const ov = Math.min(sp.e, other.e) - Math.max(sp.s, other.s);
      if (ov > bestOverlap) {
        best = other;
        bestOverlap = ov;
      }
    }
    if (best) {
      sidecarOf.set(sp.role.id, best);
      hostsUsed.add(best);
    }
  }

  // Units: chains (sorted by start) and single roles.
  const chains = new Map<string, Span[]>();
  const units: Span[][] = [];
  for (const sp of spans) {
    if (sidecarOf.has(sp.role.id)) continue;
    if (sp.role.chain) {
      const list = chains.get(sp.role.chain) ?? [];
      list.push(sp);
      chains.set(sp.role.chain, list);
    } else units.push([sp]);
  }
  for (const list of chains.values()) units.push(list.sort((a, b) => a.s - b.s || a.e - b.e));

  // With titles on, the row also holds sidecar labels under the pill, so it gets a little more air.
  const rowH = (opt.showTitles ? G.labelBand + 6 : 0) + G.pillH + G.below;
  const labelY = (top: number) => top + G.labelBand - 4; // baseline inside the label band
  const fit = (title: string, avail: number): 'in' | 'clip' | 'float' => {
    if (!title) return 'float';
    if (opt.measure(title) <= avail) return 'in';
    return opt.measure(title.slice(0, G.minChars) + '…') <= avail ? 'clip' : 'float';
  };

  // Lay out each unit relative to its row top (0); footprint = horizontal extent of everything it draws.
  interface Planned {
    segs: Omit<LaidSegment, 'row' | 'y'>[];
    side: { span: Span; hostId: string; left: number; right: number; label: Label | null } | null;
    fs: number;
    fe: number;
    /** Footprint starts / ends at a pill edge (not a label or sidecar). */
    headPill: boolean;
    tailPill: boolean;
    len: number;
  }
  const planned: Planned[] = units.map((unit) => {
    const n = unit.length;
    const segs: Planned['segs'] = [];
    let prevX1 = -Infinity;
    let upCursor = -Infinity; // right end of the last "up" label in this unit
    unit.forEach((sp, i) => {
      const kind: SegKind = n === 1 ? 'solo' : i === 0 ? 'first' : i === n - 1 ? 'last' : 'mid';
      let x0 = X(sp.s);
      let x1 = X(sp.e);
      if (i > 0 && Math.abs(x0 - prevX1) <= SNAP_MONTHS * ppm) x0 = prevX1; // handover snap
      x0 = Math.max(x0, prevX1);
      x1 = Math.max(x1, x0 + G.minPillW + G.gap);
      prevX1 = x1;
      const left = x0 + G.gap / 2;
      const right = x1 - G.gap / 2;

      let label: Label | null = null;
      const title = sp.role.title.trim();
      if (opt.showTitles && title) {
        const padL = G.textPad + (kind === 'last' || kind === 'mid' ? G.slant : 0);
        const padR = G.textPad + (kind === 'first' || kind === 'mid' ? G.slant : 0);
        // Keep inside text clear of event dots.
        const firstEvent = sp.role.events
          .map((e) => eventX(monthIndex(e.date), left, right))
          .sort((a, b) => a - b)[0];
        const textRight = firstEvent !== undefined ? Math.min(right - padR, firstEvent - 6) : right - padR;
        const avail = textRight - (left + padL);
        const mode = fit(title, avail);
        if (mode !== 'float') {
          label = { text: title, mode, x: left + padL, y: G.labelBand + G.pillH / 2 + 4, width: avail, tether: null };
        } else {
          // Floating titles sit in the label band above the row. A title that can't be
          // placed without touching another one is left off (it's still in the hover card).
          const w = opt.measure(title);
          if (kind === 'solo') {
            if (right + G.labelGap + w <= maxX) label = floatRight(title, w, right);
            else if (left - G.labelGap - w >= G.padX) label = floatLeft(title, w, left);
          } else {
            // Chains: titles run left to right in reading order and never overlap each other.
            let lx = kind === 'last' ? right + G.labelGap : left + G.textPad;
            lx = Math.max(lx, upCursor + G.labelGap);
            if (lx + w > maxX) lx = maxX - w;
            if (lx >= upCursor + G.labelGap && lx >= G.padX) {
              upCursor = lx + w;
              label =
                kind === 'last' && lx >= right
                  ? { text: title, mode: 'float', x: lx, y: labelY(0), width: w, tether: { x1: right - 4, y1: G.labelBand + 3, x2: lx - 3, y2: labelY(0) - 4 } }
                  : { text: title, mode: 'float', x: lx, y: labelY(0), width: w, tether: { x1: Math.min(left + G.textPad, right - 4), y1: G.labelBand + 2, x2: Math.max(lx - 3, Math.min(left + G.textPad, right - 4)), y2: labelY(0) - 4 } };
            }
          }
        }
      }
      segs.push({ role: sp.role, kind, x0, x1, left, right, label });

      function floatRight(text: string, w: number, r: number): Label {
        const lx = r + G.labelGap;
        return { text, mode: 'float', x: lx, y: labelY(0), width: w, tether: { x1: r - 4, y1: G.labelBand + 3, x2: lx - 3, y2: labelY(0) - 4 } };
      }
      function floatLeft(text: string, w: number, l: number): Label {
        const lx = l - G.labelGap - w;
        return { text, mode: 'float', x: lx, y: labelY(0), width: w, tether: { x1: l + 4, y1: G.labelBand + 3, x2: lx + w + 3, y2: labelY(0) - 4 } };
      }
    });

    // Sidecar under the host segment.
    let side: Planned['side'] = null;
    for (const [sideId, host] of sidecarOf) {
      if (!unit.includes(host)) continue;
      const sp = spans.find((x) => x.role.id === sideId)!;
      const left = X(sp.s) + G.gap / 2;
      const right = Math.max(X(sp.e) - G.gap / 2, left + G.minPillW);
      let label: Label | null = null;
      const title = sp.role.title.trim();
      if (opt.showTitles && title) {
        const w = opt.measure(title);
        const by = G.labelBand + G.pillH + G.sidecarGap + G.sidecarH;
        label = right + G.labelGap + w <= maxX
          ? { text: title, mode: 'float', x: right + 6, y: by + 1, width: w, tether: null }
          : { text: title, mode: 'float', x: left - 6 - w, y: by + 1, width: w, tether: null };
      }
      side = { span: sp, hostId: host.role.id, left, right, label };
      break;
    }

    // Footprint: pills edge to edge; labels plus breathing room so text never touches a neighbour.
    const pillStart = segs[0].x0;
    const pillEnd = segs[segs.length - 1].x1;
    const labels = [...segs.map((s) => s.label), side?.label ?? null].filter((l): l is Label => !!l && l.mode === 'float');
    const sideEnd = side ? side.right + G.gap / 2 : -Infinity;
    const sideStart = side ? side.left - G.gap / 2 : Infinity;
    const labelStart = Math.min(...labels.map((l) => l.x - G.labelGap));
    const labelEnd = Math.max(...labels.map((l) => l.x + l.width + G.labelGap));
    const fs = Math.min(pillStart, sideStart, labelStart);
    const fe = Math.max(pillEnd, sideEnd, labelEnd);
    return {
      segs,
      side,
      fs,
      fe,
      headPill: fs === pillStart,
      tailPill: fe === pillEnd,
      len: unit[n - 1].e - unit[0].s,
    };
  });

  // Floating events lane (packed into as many sub-rows as their labels need).
  const fevs = [...doc.floatingEvents].sort((a, b) => a.date.localeCompare(b.date));
  const laneEnds: number[] = [];
  const floatPlan = fevs.map((event) => {
    const m = monthIndex(event.date);
    const x = X(m) + ppm / 2 - G.eventD / 2;
    const title = event.title.trim();
    const w = opt.showTitles && title ? opt.measure(title) : 0;
    const fs = x;
    const fe = x + G.eventD + (w ? 6 + w : 0);
    let lane = laneEnds.findIndex((end) => end + G.labelGap <= fs);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(-Infinity);
    }
    laneEnds[lane] = fe;
    return { event, x, lane, title, w };
  });
  const floatLaneTop = G.axisH;
  const floatLaneRows = laneEnds.length;
  const rowsTop = floatLaneTop + floatLaneRows * G.floatLaneH + (floatLaneRows ? 4 : 0);

  // Greedy first-fit packing, longest first when two units start together.
  // A one-month overlap between pills (one role ends the month the next starts)
  // still shares the row: the earlier pill is trimmed to meet the later one.
  planned.sort((a, b) => a.fs - b.fs || b.len - a.len);
  const rows: { end: number; tailPill: boolean; last: Planned | null }[] = [];
  const rowOf = planned.map((p) => {
    let r = rows.findIndex((row) => {
      if (row.end <= p.fs + 0.5) return true;
      if (!row.tailPill || !p.headPill || !row.last) return false;
      const overlap = row.end - p.fs;
      const tail = row.last.segs[row.last.segs.length - 1];
      return overlap <= ppm + 0.5 && p.fs - tail.x0 >= G.minPillW + G.gap;
    });
    if (r < 0) {
      r = rows.length;
      rows.push({ end: -Infinity, tailPill: true, last: null });
    } else if (rows[r].end > p.fs + 0.5 && rows[r].last) {
      const tail = rows[r].last!.segs[rows[r].last!.segs.length - 1];
      const cut = tail.x1 - p.fs;
      tail.x1 = p.fs;
      tail.right = p.fs - G.gap / 2;
      if (tail.label && tail.label.mode !== 'float') tail.label = { ...tail.label, width: tail.label.width - cut };
    }
    rows[r] = { end: p.fe, tailPill: p.tailPill, last: p };
    return r;
  });
  const rowEnds = rows;

  const segments: LaidSegment[] = [];
  const events: LaidEvent[] = [];
  const sidecars: LaidSidecar[] = [];
  planned.forEach((p, i) => {
    const top = rowsTop + rowOf[i] * rowH;
    const bandOffset = opt.showTitles ? 0 : -G.labelBand; // labels are relative to a band of 16
    const shift = (l: Label | null): Label | null =>
      l && {
        ...l,
        y: top + l.y + bandOffset,
        tether: l.tether && { ...l.tether, y1: top + l.tether.y1 + bandOffset, y2: top + l.tether.y2 + bandOffset },
      };
    const pillY = top + (opt.showTitles ? G.labelBand : 0);
    for (const s of p.segs) {
      segments.push({ ...s, row: rowOf[i], y: pillY, label: shift(s.label) });
      for (const ev of s.role.events) {
        events.push({ role: s.role, event: ev, x: eventX(monthIndex(ev.date), s.left, s.right), y: pillY + (G.pillH - G.eventD) / 2 });
      }
    }
    if (p.side) {
      sidecars.push({
        role: p.side.span.role,
        hostId: p.side.hostId,
        left: p.side.left,
        right: p.side.right,
        y: pillY + G.pillH + G.sidecarGap,
        label: shift(p.side.label),
      });
    }
  });

  const floating: LaidFloating[] = floatPlan.map((f) => {
    const y = floatLaneTop + f.lane * G.floatLaneH + (G.floatLaneH - G.eventD) / 2;
    return {
      event: f.event,
      x: f.x,
      y,
      label: f.w ? { text: f.title, mode: 'float', x: f.x + G.eventD + 6, y: y + G.eventD - 2, width: f.w, tether: null } : null,
    };
  });

  const years: Layout['years'] = [];
  for (let m = startIdx; m <= endIdx; m += 12) years.push({ year: m / 12, x: X(m) });

  return {
    width,
    height: rowsTop + rowEnds.length * rowH + G.bottomPad,
    rowCount: rowEnds.length,
    pxPerMonth: ppm,
    years,
    rowsTop,
    rowH,
    segments,
    events,
    sidecars,
    floating,
    floatLaneTop,
    floatLaneRows,
  };

  function eventX(m: number, left: number, right: number) {
    const raw = X(m) + ppm / 2 - G.eventD / 2;
    return Math.max(left + 4, Math.min(right - G.eventD - 4, raw));
  }
}
