import { describe, expect, it } from 'vitest';
import { emptyDoc } from '../data/defaults';
import { monthIndex } from '../data/months';
import { sampleDoc } from '../data/sample';
import type { Role } from '../data/schema';
import { dotCentres, fitTitle, GEOMETRY as G, layoutTimeline, type Layout, type LayoutOptions } from './layout';

const measure = (t: string) => t.length * 6.5;
const opts = (over: Partial<LayoutOptions> = {}): LayoutOptions => ({
  pxPerMonth: 5,
  showTitles: false,
  measure,
  now: '2026-10',
  ...over,
});

const role = (p: Partial<Role> & Pick<Role, 'id' | 'start' | 'end'>): Role => ({
  title: '',
  company: '',
  threads: [],
  details: [],
  events: [],
  chain: null,
  overlapStyle: null,
  ...p,
});

interface Box {
  owner: string;
  kind: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** Everything drawn, as rectangles. Slanted chain pills include their slant. */
function boxes(l: Layout): Box[] {
  const out: Box[] = [];
  for (const s of l.segments) {
    const unit = s.role.chain ?? s.role.id;
    const lead = s.shape === 'pill' && (s.kind === 'last' || s.kind === 'mid') ? G.slant : 0;
    out.push({ owner: unit, kind: 'pill', x0: s.left - lead, x1: s.right, y0: s.y, y1: s.y + G.pillH });
  }
  const r = G.ringD / 2;
  for (const e of l.events) {
    const unit = e.role.chain ?? e.role.id;
    out.push({ owner: unit, kind: 'ring', x0: e.ringX - r, x1: e.ringX + r, y0: e.ringY - r, y1: e.ringY + r });
  }
  for (const f of l.floating) {
    out.push({ owner: f.event.id, kind: 'fev', x0: f.x, x1: f.x + G.eventD, y0: f.y, y1: f.y + G.eventD });
    if (f.label)
      out.push({
        owner: f.event.id,
        kind: 'label',
        x0: f.label.x,
        x1: f.label.x + f.label.width,
        y0: f.label.y - 10,
        y1: f.label.y + 2,
      });
  }
  return out;
}

/** Anything from one unit touching anything from another, or two rings touching. */
function collisions(l: Layout) {
  const b = boxes(l);
  const hits: string[] = [];
  for (let i = 0; i < b.length; i++)
    for (let j = i + 1; j < b.length; j++) {
      const p = b[i],
        q = b[j];
      if (p.owner === q.owner && !(p.kind === 'ring' && q.kind === 'ring')) continue;
      if (p.x0 < q.x1 - 0.01 && q.x0 < p.x1 - 0.01 && p.y0 < q.y1 && q.y0 < p.y1)
        hits.push(`${p.owner}:${p.kind} × ${q.owner}:${q.kind}`);
    }
  return hits;
}

/** Titles sit inside their pill, after its dots. */
function labelsInside(l: Layout) {
  const bad: string[] = [];
  for (const s of l.segments) {
    if (!s.label) continue;
    const lead = s.kind === 'last' || s.kind === 'mid' ? G.slant : 0;
    const lastDot = s.dots.length ? s.left - lead + s.dots[s.dots.length - 1].x + G.dotD / 2 : -Infinity;
    if (s.shape !== 'pill') bad.push(`${s.role.id}: title on a circle`);
    if (s.label.x < lastDot) bad.push(`${s.role.id}: title over its dots`);
    if (s.label.x < s.left - lead || s.label.x + s.label.width > s.right) bad.push(`${s.role.id}: title outside`);
    if (measure(s.label.text) > s.label.width + 0.01) bad.push(`${s.role.id}: "${s.label.text}" doesn't fit`);
  }
  return bad;
}

const seg = (l: Layout, id: string) => l.segments.find((s) => s.role.id === id)!;

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
        expect(labelsInside(l), `titles=${showTitles} ppm=${pxPerMonth}`).toEqual([]);
      }
  });

  it('turning titles on never moves anything', () => {
    for (const pxPerMonth of [2, 5]) {
      const off = layoutTimeline(sampleDoc(), opts({ pxPerMonth }));
      const on = layoutTimeline(sampleDoc(), opts({ pxPerMonth, showTitles: true }));
      const place = (l: Layout) => l.segments.map((s) => [s.role.id, s.row, s.left, s.right, s.y, s.shape]);
      expect(place(on)).toEqual(place(off));
      expect(on.height).toBe(off.height);
    }
  });

  it('joins a chain with a 2px gap and snaps a same-month handover', () => {
    const l = layoutTimeline(sampleDoc(), opts());
    const fe = seg(l, 'fe');
    const sfe = seg(l, 'sfe');
    expect([fe.kind, sfe.kind]).toEqual(['first', 'last']);
    expect(fe.row).toBe(sfe.row);
    expect(sfe.x0).toBe(fe.x1);
    expect(sfe.left - fe.right).toBe(G.gap);
  });

  it('puts back-to-back roles at different companies in one row', () => {
    const doc = {
      ...emptyDoc(),
      roles: [
        role({ id: 'a', start: '2015-07', end: '2016-02', company: 'A' }),
        role({ id: 'b', start: '2016-02', end: '2018-02', company: 'B' }),
      ],
    };
    const l = layoutTimeline(doc, opts());
    const [a, b] = [seg(l, 'a'), seg(l, 'b')];
    expect(a.row).toBe(b.row);
    expect(b.left - a.right).toBeCloseTo(G.gap);
  });

  it('stacks real overlaps on separate rows', () => {
    const doc = {
      ...emptyDoc(),
      roles: [role({ id: 'a', start: '2015-01', end: '2016-12' }), role({ id: 'b', start: '2016-01', end: '2017-06' })],
    };
    const l = layoutTimeline(doc, opts());
    expect(l.rowCount).toBe(2);
  });

  it('draws an overlapping role at the same company as its own pill, even if marked "sidecar"', () => {
    const doc = sampleDoc();
    doc.roles = doc.roles.map((x) => (x.id === 'mentor' ? { ...x, overlapStyle: 'sidecar' as const } : x));
    const l = layoutTimeline(doc, opts());
    const mentor = seg(l, 'mentor');
    expect(mentor.kind).toBe('solo');
    expect(mentor.row).not.toBe(seg(l, 'sfe').row);
    expect(l.segments).toHaveLength(doc.roles.length);
  });

  it('draws a short role as a circle centred on its dates, with up to 3 dots', () => {
    const doc = {
      ...emptyDoc(),
      roles: [
        role({
          id: 'talk',
          start: '2018-10',
          end: '2018-11',
          threads: ['design', 'software', 'community', 'coaching'],
        }),
      ],
    };
    const l = layoutTimeline(doc, opts({ showTitles: true }));
    const c = seg(l, 'talk');
    expect(c.shape).toBe('circle');
    expect(c.right - c.left).toBe(G.circleD);
    expect((c.left + c.right) / 2).toBeCloseTo((c.x0 + c.x1) / 2);
    expect(c.dots.map((d) => d.threadId)).toEqual(['design', 'software', 'community']);
    expect(c.label).toBeNull();
  });

  it('keeps longer roles and chain links as pills', () => {
    const l = layoutTimeline(sampleDoc(), opts());
    expect(seg(l, 'pd').shape).toBe('pill');
    expect(seg(l, 'jd').shape).toBe('pill');
  });

  it('puts thread dots at the start, first thread first, squeezing to fit', () => {
    const l = layoutTimeline(sampleDoc(), opts());
    const board = seg(l, 'board');
    expect(board.dots.map((d) => d.threadId)).toEqual(['community', 'coaching', 'education', 'software']);
    expect(board.dots[0].x).toBe(G.dotLead);
    expect(board.dots[1].x - board.dots[0].x).toBe(G.dotStep);
    expect(
      dotCentres(4, 0, G.dotD + 9)
        .map((x, i, a) => (i ? x - a[i - 1] : 0))
        .slice(1),
    ).toEqual([G.dotStepMin, G.dotStepMin, G.dotStepMin]);
    expect(dotCentres(0, 0, 100)).toEqual([]);
  });

  it('puts events as rings above their pill, joined to a dot on its top edge', () => {
    const l = layoutTimeline(sampleDoc(), opts());
    const lib = l.events.find((e) => e.event.id === 'lib')!;
    const host = seg(l, 'sfe');
    expect(lib.dotY).toBe(host.y);
    expect(lib.dotX).toBeGreaterThanOrEqual(host.left - G.slant);
    expect(lib.dotX).toBeLessThanOrEqual(host.right);
    expect(lib.ringY + G.ringD / 2).toBeLessThan(host.y);
    // Near the event's month.
    const month = l.years[0].x + (monthIndex('2020-02') - l.years[0].year * 12) * l.pxPerMonth;
    expect(Math.abs(lib.dotX - month)).toBeLessThan(l.pxPerMonth * 2);
  });

  it('only rows with events get room for rings', () => {
    const doc = {
      ...emptyDoc(),
      roles: [
        role({ id: 'a', start: '2015-01', end: '2018-01', events: [{ id: 'e', title: 'Launch', date: '2016-01' }] }),
        role({ id: 'b', start: '2016-01', end: '2019-01' }),
      ],
    };
    const l = layoutTimeline(doc, opts());
    expect(seg(l, 'a').y - l.rowsTop).toBe(G.eventBand);
    expect(seg(l, 'b').y - seg(l, 'a').y).toBe(G.pillH + G.below);
  });

  it('nudges rings in a row apart', () => {
    const doc = {
      ...emptyDoc(),
      roles: [
        role({
          id: 'a',
          start: '2015-01',
          end: '2018-01',
          events: [
            { id: 'e1', title: 'One', date: '2016-01' },
            { id: 'e2', title: 'Two', date: '2016-01' },
            { id: 'e3', title: 'Three', date: '2016-02' },
          ],
        }),
      ],
    };
    const rings = layoutTimeline(doc, opts())
      .events.map((e) => e.ringX)
      .sort((a, b) => a - b);
    for (let i = 1; i < rings.length; i++) expect(rings[i] - rings[i - 1]).toBeGreaterThanOrEqual(G.ringD + G.ringGap);
  });

  it('puts floating events in their own lane above the roles', () => {
    const l = layoutTimeline(sampleDoc(), opts());
    expect(l.floating).toHaveLength(1);
    expect(l.floating[0].y + G.eventD).toBeLessThanOrEqual(l.rowsTop);
  });

  it('stays collision-free across 200 random careers', () => {
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pick = <T>(a: T[]) => a[Math.floor(rand() * a.length)];
    const ym = (m: number) => `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, '0')}`;
    const titles = [
      'Designer',
      'Coach',
      'Senior Frontend Developer',
      'Research Assistant',
      'Architectural Designer',
      'CEO',
      'Speaker Curator & Event Consultant',
    ];
    const threads = ['design', 'software', 'community', 'coaching', 'education'];
    for (let n = 0; n < 200; n++) {
      const roles: Role[] = [];
      const count = 3 + Math.floor(rand() * 18);
      for (let i = 0; i < count; i++) {
        const s = 2005 * 12 + Math.floor(rand() * 240);
        const len = 1 + Math.floor(rand() * 60);
        const company = pick(['A', 'B', 'C', 'D', 'E', 'F']);
        roles.push(
          role({
            id: `r${i}`,
            title: pick(titles),
            company,
            start: ym(s),
            end: rand() < 0.1 ? 'now' : ym(Math.min(s + len, 2026 * 12 + 9)),
            chain: rand() < 0.25 ? `c-${company}` : null,
            threads: threads.filter(() => rand() < 0.35),
            events: rand() < 0.3 ? [{ id: `e${i}`, title: 'Event', date: ym(s) }] : [],
          }),
        );
      }
      const doc = {
        ...emptyDoc(),
        roles,
        floatingEvents:
          rand() < 0.5
            ? [{ id: 'f', title: 'Moved', date: ym(2010 * 12 + Math.floor(rand() * 150)), threads: [] }]
            : [],
      };
      for (const showTitles of [false, true]) {
        const l = layoutTimeline(doc, opts({ showTitles, pxPerMonth: pick([2, 4, 6]) }));
        expect(collisions(l), `career ${n} titles=${showTitles}`).toEqual([]);
        expect(labelsInside(l), `career ${n} titles=${showTitles}`).toEqual([]);
        for (const s of l.segments) expect(s.right - s.left).toBeGreaterThan(0);
        expect(l.segments.length, `career ${n}: every role drawn`).toBe(roles.length);
      }
    }
  });
});

describe('fitTitle', () => {
  // Like a real font, the ellipsis is narrower than a letter.
  const width = (t: string) => [...t].reduce((w, ch) => w + (ch === '…' ? 4 : 6.5), 0);
  const fit = (title: string, room: number) => fitTitle(title, room, width);

  it('shows the full title when it fits', () => {
    expect(fit('Designer', 100)).toBe('Designer');
  });

  it('cuts with an ellipsis, keeping at least 3 letters', () => {
    expect(fit('Senior Frontend Developer', 60)).toBe('Senior F…');
    expect(fit('Designer', width('Des…'))).toBe('Des…');
  });

  it('falls back to initials, then one letter, then nothing', () => {
    expect(fit('Senior Engineer', width('Sen…') - 1)).toBe('SE');
    expect(fit('Senior Engineer', width('SE') - 1)).toBe('S…');
    expect(fit('Senior Engineer', width('S…') - 1)).toBeNull();
    expect(fit('Designer', width('Des…') - 1)).toBe('D…');
    expect(fit('', 100)).toBeNull();
  });
});
