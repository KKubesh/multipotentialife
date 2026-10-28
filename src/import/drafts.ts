import { newId } from '../data/defaults';
import type { Profile, Role, RoleEnd, YearMonth } from '../data/schema';
import type { LinkedInProfile, PdfDate } from './linkedin';

/**
 * One role as it comes out of a LinkedIn PDF, ready for the review
 * walkthrough. Everything is editable there; nothing here is final.
 */
export interface ImportDraft {
  key: string;
  kind: 'work' | 'education';
  title: string;
  company: string;
  /** null when the PDF had no date; the review asks for one. */
  start: YearMonth | null;
  end: RoleEnd | null;
  /** "year": LinkedIn only gave the year, so the month is a guess worth checking. */
  startPrecision: 'month' | 'year' | 'missing';
  endPrecision: 'month' | 'year' | 'missing';
  location: string;
  details: string[];
  /** Roles in a row at one company share a chain and draw as one slanted pill. */
  chain: string | null;
  /** Key of a role at the same company this one overlaps by more than 2 months, if any. */
  overlapsWith: string | null;
}

export interface ImportResult {
  profile: Pick<Profile, 'name' | 'headline' | 'linkedin'>;
  drafts: ImportDraft[];
}

const precision = (d: PdfDate | null | 'present'): 'month' | 'year' | 'missing' =>
  d == null ? 'missing' : d === 'present' || d.length === 7 ? 'month' : 'year';

const idx = (ym: YearMonth) => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1;

/**
 * Turns LinkedIn's dates into timeline months. A year-only start becomes
 * January. A year-only end becomes January of that year (so "1983 – 1987"
 * hands over cleanly to a role starting in 1987), or December when the role
 * starts and ends in the same year.
 */
export function toMonths(start: PdfDate | null, end: PdfDate | 'present' | null): { start: YearMonth | null; end: RoleEnd | null } {
  const s = start == null ? null : start.length === 4 ? `${start}-01` : start;
  let e: RoleEnd | null;
  if (end == null) e = null;
  else if (end === 'present') e = 'now';
  else if (end.length === 7) e = end;
  else e = s && s.slice(0, 4) === end ? `${end}-12` : `${end}-01`;
  if (s && e && e !== 'now' && idx(e) < idx(s)) e = s;
  return { start: s, end: e };
}

const CHAIN_GAP = 2; // months; matches the timeline's handover snap

export function profileToDrafts(p: LinkedInProfile, makeId: () => string = newId): ImportResult {
  const drafts: ImportDraft[] = [];

  for (const group of p.experience) {
    const roles: ImportDraft[] = group.roles.map((r) => ({
      key: makeId(),
      kind: 'work',
      title: r.title,
      company: group.company,
      ...toMonths(r.start, r.end),
      startPrecision: precision(r.start),
      endPrecision: precision(r.end),
      location: r.location,
      details: r.details,
      chain: null,
      overlapsWith: null,
    }));

    // Chain roles that follow one another at the same company (a promotion, a new
    // title): each role links to an earlier one that ends within 2 months of its start.
    const dated = roles.filter((r) => r.start && r.end).sort((a, b) => idx(a.start!) - idx(b.start!));
    const FAR = 1e9;
    const sIdx = (r: ImportDraft) => idx(r.start!);
    const eIdx = (r: ImportDraft) => (r.end === 'now' ? FAR : idx(r.end as YearMonth));
    const next = new Map<ImportDraft, ImportDraft>();
    const prev = new Map<ImportDraft, ImportDraft>();
    for (const r of dated) {
      const before = dated.filter((o) => o !== r && !next.has(o) && sIdx(o) < sIdx(r) && Math.abs(sIdx(r) - eIdx(o)) <= CHAIN_GAP);
      const pick = before.sort((a, b) => Math.abs(sIdx(r) - eIdx(a)) - Math.abs(sIdx(r) - eIdx(b)))[0];
      if (pick) {
        next.set(pick, r);
        prev.set(r, pick);
      }
    }
    for (const r of dated) {
      if (prev.has(r) || !next.has(r)) continue;
      const id = makeId();
      for (let c: ImportDraft | undefined = r; c; c = next.get(c)) c.chain = id;
    }
    // A long overlap with another role here: the review asks whether it rides
    // alongside that role or gets its own row. Point it at the role it overlaps most.
    for (const r of dated) {
      if (r.chain) continue;
      let best: ImportDraft | null = null;
      let most = CHAIN_GAP;
      for (const o of dated) {
        if (o === r) continue;
        const ov = Math.min(eIdx(r), eIdx(o)) - Math.max(sIdx(r), sIdx(o));
        if (ov > most) {
          best = o;
          most = ov;
        }
      }
      r.overlapsWith = best?.key ?? null;
    }
    drafts.push(...roles);
  }

  for (const e of p.education) {
    drafts.push({
      key: makeId(),
      kind: 'education',
      title: e.degree || 'Education',
      company: e.school,
      ...toMonths(e.start, e.end),
      startPrecision: precision(e.start),
      endPrecision: precision(e.end),
      location: '',
      details: [],
      chain: null,
      overlapsWith: null,
    });
  }

  return { profile: { name: p.name, headline: p.headline, linkedin: p.linkedin }, drafts };
}

/** A reviewed draft becomes a role. Threads are chosen in the review; none are pre-picked. */
export function draftToRole(d: ImportDraft & { start: YearMonth; end: RoleEnd }, threads: string[], overlapStyle: Role['overlapStyle'] = null): Role {
  return {
    id: d.key,
    title: d.title.trim(),
    company: d.company.trim(),
    start: d.start,
    end: d.end,
    threads,
    details: d.details.map((t) => t.trim()).filter(Boolean),
    events: [],
    chain: d.chain,
    overlapStyle: d.overlapsWith ? overlapStyle : null,
  };
}
