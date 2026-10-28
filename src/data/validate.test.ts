import { describe, expect, it } from 'vitest';
import { emptyDoc } from './defaults';
import { SCHEMA_VERSION } from './schema';
import { isYearMonth, parseDoc } from './validate';

const role = (over: Record<string, unknown> = {}) => ({
  id: 'r1',
  title: 'UI Engineer',
  company: 'Acme',
  start: '2019-04',
  end: '2021-03',
  threads: ['software', 'design'],
  details: ['Built things'],
  events: [],
  chain: null,
  overlapStyle: null,
  ...over,
});

describe('parseDoc', () => {
  it('accepts a valid document unchanged', () => {
    const doc = { ...emptyDoc(), roles: [role()] };
    const res = parseDoc(JSON.parse(JSON.stringify(doc)));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.warnings).toEqual([]);
    expect(res.doc.roles[0]).toEqual(role());
  });

  it('rejects things that are not timelines', () => {
    expect(parseDoc(null).ok).toBe(false);
    expect(parseDoc([1, 2]).ok).toBe(false);
    expect(parseDoc({ hello: 'world' }).ok).toBe(false);
  });

  it('rejects backups from a newer app version', () => {
    const res = parseDoc({ ...emptyDoc(), schemaVersion: SCHEMA_VERSION + 1 });
    expect(res.ok).toBe(false);
  });

  it('unwraps backup files', () => {
    const res = parseDoc({
      kind: 'multipotentialife-backup',
      exportedAt: '2026-10-27T00:00:00Z',
      doc: { ...emptyDoc(), roles: [role()] },
    });
    expect(res.ok && res.doc.roles.length).toBe(1);
  });

  it('drops roles without a valid start and repairs the rest', () => {
    const res = parseDoc({
      roles: [
        role({ id: 'a', start: 'April 2019' }),
        role({ id: 'b', end: undefined }),
        role({ id: 'c', start: '2022-05', end: '2021-01' }),
        role({ id: 'd', threads: ['software', 'made-up', 'software'], details: ['  keep  ', '', 42] }),
      ],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.doc.roles.map((r) => r.id)).toEqual(['b', 'c', 'd']);
    expect(res.doc.roles[0].end).toBe('now');
    expect([res.doc.roles[1].start, res.doc.roles[1].end]).toEqual(['2021-01', '2022-05']);
    expect(res.doc.roles[2].threads).toEqual(['software']);
    expect(res.doc.roles[2].details).toEqual(['keep']);
    expect(res.warnings.length).toBe(3);
  });

  it('gives duplicate ids fresh ones', () => {
    const res = parseDoc({ roles: [role({ id: 'x' }), role({ id: 'x' })] });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const [a, b] = res.doc.roles;
    expect(a.id).toBe('x');
    expect(b.id).not.toBe('x');
  });

  it('fills defaults for missing profile, settings and threads', () => {
    const res = parseDoc({ roles: [], settings: { palette: 'neon', showTitles: 'yes' } });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.doc.settings.palette).toBe('soft');
    expect(res.doc.settings.showTitles).toBe(false);
    expect(res.doc.threads.map((t) => t.id)).toEqual(['design', 'software', 'community', 'coaching', 'education']);
    expect(res.doc.profile.showLinkedInOnShare).toBe(true);
  });

  it('keeps only swatch overrides for known threads', () => {
    const res = parseDoc({
      roles: [],
      settings: { palette: 'mono', threadSwatches: { design: 3, ghost: 1, software: -1 } },
    });
    expect(res.ok && res.doc.settings.threadSwatches).toEqual({ design: 3 });
  });
});

describe('isYearMonth', () => {
  it('checks month precision dates', () => {
    expect(isYearMonth('2021-04')).toBe(true);
    expect(isYearMonth('2021-13')).toBe(false);
    expect(isYearMonth('2021-4')).toBe(false);
    expect(isYearMonth('now')).toBe(false);
  });
});
