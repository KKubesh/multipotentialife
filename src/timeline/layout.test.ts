import { describe, expect, it } from 'vitest';
import { emptyDoc } from '../data/defaults';
import { sampleDoc } from '../data/sample';
import type { Role } from '../data/schema';
import { GEOMETRY as G, layoutTimeline, type Layout, type LayoutOptions } from './layout';

const measure = (t: string) => t.length * 6.5;
const opts = (over: Partial<LayoutOptions> = {}): LayoutOptions => ({ pxPerMonth: 5, showTitles: false, measure, now: '2026-10', ...over });

const role = (p: Partial<Role> & Pick<Role, 'id' | 'start' | 'end'>): Role => ({
  title: '', company: '', threads: [], details: [], events: [], chain: null, overlapStyle: null, ...p,
});

interface Box { owner: string; kind: string; x0: number; x1: number; y0: number; y1: number }

/** Everything drawn, as rectangles. Slanted chain pills include their slant. */
function boxes(l: Layout): Box[] {
  const out: Box[] = [];
  for (const s of l.segments) {
    const unit = s.role.chain ?? s.role.id;
    const lead = s.kind === 'last' || s.kind === 'mid' ? G.slant : 0;
    out.push({ owner: unit, kind: 'pill', x0: s.left - lead, x1: s.right, y0: s.y, y1: s.y + G.pillH });
    if (s.label?.mode === 'float') out.push({ owner: unit, kind: 'label', x0: s.label.x, x1: s.label.x + s.label.width, y0: s.label.y - 10, y1: s.label.y + 2 });
  }
  for (const c of l.sidecars) {
    const host = l.segments.find((s) => s.role.id === c.hostId)!;
    const unit = host.role.chain ?? host.role.id;
    out.push({ owner: unit, kind: 'sidecar', x0: c.left, x1: c.right, y0: c.y, y1: c.y + G.sidecarH });
    if (c.label) out.push({ owner: unit, kind: 'label', x0: c.label.x, x1: c.label.x + c.label.width, y0: c.label.y - 10, y1: c.label.y + 2 });
  }
  for (const f of l.floating) {
    out.push({ owner: f.event.id, kind: 'fev', x0: f.x, x1: f.x + G.eventD, y0: f.y, y1: f.y + G.eventD });
    if (f.label) out.push({ owner: f.event.id, kind: 'label', x0: f.label.x, x1: f.label.x + f.label.width, y0: f.label.y - 10, y1: f.label.y + 2 });
  }
  return out;
}

function collisions(l: Layout) {
  const b = boxes(l);
  const hits: string[] = [];
  for (let i = 0; i < b.length; i++)
    for (let j = i + 1; j < b.length; j++) {
      const p = b[i], q = b[j];
      if (p.owner === q.owner && !(p.kind === 'label' && q.kind === 'label')) continue;
      if (p.x0 < q.x1 - 0.01 && q.x0 < p.x1 - 0.01 && p.y0 < q.y1 && q.y0 < p.y1) hits.push(`${p.owner}:${p.kind} × ${q.owner}:${q.kind}`);
    }
  return hits;
}

describe('layoutTimeline', () => {
  it('lays out an empty timeline', () => {
    const l = layoutTimeline(emptyDoc(), opts());
    expect(l.segments).toEqual([]);
    expect(l.rowCount).toBe(0);
    expect(l.width).toBeGreaterThan(0);
  });

  it('never overlaps anything, titles off or on, at several zoom levels', () => {
    for (const showTitles of [false, true])
      for (const pxPerMonth of [2, 5, 9]) {
        const l = layoutTimeline(sampleDoc(), opts({ showTitles, pxPerMonth }));
        expect(collisions(l), `titles=${showTitles} ppm=${pxPerMonth}`).toEqual([]);
      }
  });

  it('keeps every drawn label inside the timeline', () => {
    const l = layoutTimeline(sampleDoc(), opts({ showTitles: true, pxPerMonth: 2 }));
    for (const s of l.segments) if (s.label) {
      expect(s.label.x).toBeGreaterThanOrEqual(0);
      expect(s.label.x + s.label.width).toBeLessThanOrEqual(l.width);
    }
  });

  it('joins a chain with a 2px gap and snaps a same-month handover', () => {
    const l = layoutTimeline(sampleDoc(), opts());
    const fe = l.segments.find((s) => s.role.id === 'fe')!;
    const sfe = l.segments.find((s) => s.role.id === 'sfe')!;
    expect([fe.kind, sfe.kind]).toEqual(['first', 'last']);
    expect(fe.row).toBe(sfe.row);
    expect(sfe.x0).toBe(fe.x1);
    expect(sfe.left - fe.right).toBe(G.gap);
  });

  it('puts back-to-back roles at different companies in one row', () => {
    const doc = { ...emptyDoc(), roles: [role({ id: 'a', start: '2015-07', end: '2016-02', company: 'A' }), role({ id: 'b', start: '2016-02', end: '2018-02', company: 'B' })] };
    const l = layoutTimeline(doc, opts());
    const [a, b] = ['a', 'b'].map((id) => l.segments.find((s) => s.role.id === id)!);
    expect(a.row).toBe(b.row);
    expect(b.left - a.right).toBeCloseTo(G.gap);
  });

  it('stacks real overlaps on separate rows', () => {
    const doc = { ...emptyDoc(), roles: [role({ id: 'a', start: '2015-01', end: '2016-12' }), role({ id: 'b', start: '2016-01', end: '2017-06' })] };
    const l = layoutTimeline(doc, opts());
    expect(l.rowCount).toBe(2);
  });

  it('attaches a sidecar under its host and reserves its space', () => {
    const l = layoutTimeline(sampleDoc(), opts());
    expect(l.sidecars).toHaveLength(1);
    expect(l.sidecars[0].hostId).toBe('sfe');
    expect(l.segments.some((s) => s.role.id === 'mentor')).toBe(false);
  });

  it('uses separate rows when the overlap is not a sidecar', () => {
    const doc = sampleDoc();
    doc.roles = doc.roles.map((x) => (x.id === 'mentor' ? { ...x, overlapStyle: 'separate' as const } : x));
    const l = layoutTimeline(doc, opts());
    expect(l.sidecars).toHaveLength(0);
    expect(l.segments.some((s) => s.role.id === 'mentor')).toBe(true);
  });

  it('places titles inside, trimmed, or floating by available room', () => {
    const doc = { ...emptyDoc(), roles: [
      role({ id: 'wide', title: 'Designer', start: '2010-01', end: '2015-01' }),
      role({ id: 'mid', title: 'Senior Frontend Developer', start: '2016-01', end: '2018-01' }),
      role({ id: 'tiny', title: 'Swim Coach', start: '2019-01', end: '2019-03' }),
    ] };
    const l = layoutTimeline(doc, opts({ showTitles: true, pxPerMonth: 5 }));
    const mode = (id: string) => l.segments.find((s) => s.role.id === id)!.label!.mode;
    expect(mode('wide')).toBe('in');
    expect(mode('mid')).toBe('clip');
    expect(mode('tiny')).toBe('float');
  });

  it('turning titles on can only add rows, never overlap', () => {
    const off = layoutTimeline(sampleDoc(), opts({ pxPerMonth: 3 }));
    const on = layoutTimeline(sampleDoc(), opts({ pxPerMonth: 3, showTitles: true }));
    expect(on.rowCount).toBeGreaterThanOrEqual(off.rowCount);
  });

  it('puts events on their pill and floating events in their own lane', () => {
    const l = layoutTimeline(sampleDoc(), opts());
    const lib = l.events.find((e) => e.event.id === 'lib')!;
    const host = l.segments.find((s) => s.role.id === 'sfe')!;
    expect(lib.x).toBeGreaterThanOrEqual(host.left);
    expect(lib.x + G.eventD).toBeLessThanOrEqual(host.right);
    expect(l.floating).toHaveLength(1);
    expect(l.floating[0].y + G.eventD).toBeLessThanOrEqual(l.rowsTop);
  });

  it('stays collision-free across 200 random careers', () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
    const ym = (m: number) => `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, '0')}`;
    const titles = ['Designer', 'Coach', 'Senior Frontend Developer', 'Research Assistant', 'Architectural Designer', 'CEO', 'Speaker Curator & Event Consultant'];
    for (let n = 0; n < 200; n++) {
      const roles: Role[] = [];
      const count = 3 + Math.floor(rand() * 18);
      for (let i = 0; i < count; i++) {
        const s = 2005 * 12 + Math.floor(rand() * 240);
        const len = 1 + Math.floor(rand() * 60);
        const company = pick(['A', 'B', 'C', 'D', 'E', 'F']);
        roles.push(role({
          id: `r${i}`, title: pick(titles), company, start: ym(s), end: rand() < 0.1 ? 'now' : ym(Math.min(s + len, 2026 * 12 + 9)),
          chain: rand() < 0.25 ? `c-${company}` : null,
          overlapStyle: rand() < 0.15 ? 'sidecar' : null,
          events: rand() < 0.3 ? [{ id: `e${i}`, title: 'Event', date: ym(s) }] : [],
        }));
      }
      const doc = { ...emptyDoc(), roles, floatingEvents: rand() < 0.5 ? [{ id: 'f', title: 'Moved', date: ym(2010 * 12 + Math.floor(rand() * 150)), threads: [] }] : [] };
      for (const showTitles of [false, true]) {
        const l = layoutTimeline(doc, opts({ showTitles, pxPerMonth: pick([2, 4, 6]) }));
        expect(collisions(l), `career ${n} titles=${showTitles}`).toEqual([]);
        for (const s of l.segments) expect(s.right - s.left).toBeGreaterThan(0);
        expect(l.segments.length + l.sidecars.length, `career ${n}: every role drawn`).toBe(roles.length);
      }
    }
  });
});
