import { describe, expect, it } from 'vitest';
import { emptyDoc } from '../data/defaults';
import { blankRole } from '../data/reducer';
import type { ImportDraft } from './drafts';
import { buildImportedDoc, hasValidDates, toReviewItems, type ReviewItem } from './review';

const draft = (over: Partial<ImportDraft>): ImportDraft => ({
  key: 'k',
  kind: 'work',
  title: 'Role',
  company: 'Co',
  start: '2020-01',
  end: '2021-01',
  startPrecision: 'month',
  endPrecision: 'month',
  location: '',
  details: [],
  chain: null,
  overlapsWith: null,
  ...over,
});

const profile = { name: 'Sam Example', headline: 'Maker', linkedin: 'www.linkedin.com/in/sam' };
const now = new Date('2026-10-28T12:00:00Z');

describe('hasValidDates', () => {
  const item = (start: string | null, end: string | null) => toReviewItems([draft({ start, end })])[0];
  it('needs both dates, in order', () => {
    expect(hasValidDates(item('2020-01', '2021-01'))).toBe(true);
    expect(hasValidDates(item('2020-01', '2020-01'))).toBe(true);
    expect(hasValidDates(item('2020-01', 'now'))).toBe(true);
    expect(hasValidDates(item('2021-01', '2020-12'))).toBe(false);
    expect(hasValidDates(item(null, '2020-12'))).toBe(false);
  });
});

describe('buildImportedDoc', () => {
  const items: ReviewItem[] = toReviewItems([
    draft({ key: 'a', chain: 'c1' }),
    draft({ key: 'b', chain: 'c1', start: '2021-01', end: 'now' }),
    draft({ key: 'c', start: null, end: null }),
    draft({ key: 'd' }),
  ]);

  it('replaces: imports the reviewed roles and uses the profile from the PDF', () => {
    const doc = buildImportedDoc(emptyDoc(now), items, { mode: 'replace', useProfile: true, profile, now });
    expect(doc.roles.map((r) => r.id)).toEqual(['a', 'b', 'd']); // c has no dates
    expect(doc.roles.every((r) => r.threads.length === 0)).toBe(true);
    expect(doc.profile).toMatchObject(profile);
    expect(doc.updatedAt).toBe(now.toISOString());
  });

  it('adds: keeps current roles and filled-in profile fields', () => {
    const current = { ...emptyDoc(now), roles: [blankRole({ id: 'mine' })] };
    current.profile = { ...current.profile, name: 'Kept Name' };
    const doc = buildImportedDoc(current, items, { mode: 'add', useProfile: true, profile, now });
    expect(doc.roles.map((r) => r.id)).toEqual(['mine', 'a', 'b', 'd']);
    expect(doc.profile.name).toBe('Kept Name');
    expect(doc.profile.headline).toBe('Maker');
  });

  it('dissolves a chain when the rest of it is left out', () => {
    const leftOut = items.map((item) => (item.key === 'b' ? { ...item, excluded: true } : item));
    const doc = buildImportedDoc(emptyDoc(now), leftOut, { mode: 'replace', useProfile: false, profile, now });
    expect(doc.roles.find((r) => r.id === 'a')?.chain).toBeNull();
    expect(doc.profile.name).toBe('');
  });
});
