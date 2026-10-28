import { monthIndex } from '../data/months';
import type { Profile, Role, RoleEnd, TimelineDoc, YearMonth } from '../data/schema';
import { draftToRole, type ImportDraft, type ImportResult } from './drafts';

/**
 * The state of the import review, and turning a finished review into a
 * timeline. Pure, so it's tested without a browser.
 */

/** A draft role as the person reviews it. */
export interface ReviewItem extends ImportDraft {
  threads: string[];
  overlapStyle: Role['overlapStyle'];
  excluded: boolean;
}

export type ImportMode = 'add' | 'replace';

export function toReviewItems(drafts: ImportDraft[]): ReviewItem[] {
  // Threads are chosen in the review; none are pre-picked.
  return drafts.map((draft) => ({ ...draft, threads: [], overlapStyle: null, excluded: false }));
}

/** Has a start and an end, and the end isn't before the start. */
export function hasValidDates(item: ReviewItem): boolean {
  if (!item.start || !item.end) return false;
  return item.end === 'now' || monthIndex(item.end) >= monthIndex(item.start);
}

/** True when the year was all LinkedIn gave, so the month is a guess. */
export const hasGuessedMonth = (item: ReviewItem) => item.startPrecision === 'year' || item.endPrecision === 'year';

export interface BuildOptions {
  mode: ImportMode;
  /** Use the name, headline and LinkedIn link from the PDF. */
  useProfile: boolean;
  profile: ImportResult['profile'];
  now?: Date;
}

/**
 * The timeline after the import. Roles left out or still missing dates are
 * skipped. Adding keeps the current roles; replacing starts from the import.
 * When adding, profile fields already filled in are kept.
 */
export function buildImportedDoc(doc: TimelineDoc, items: ReviewItem[], options: BuildOptions): TimelineDoc {
  const imported = items
    .filter((item) => !item.excluded && hasValidDates(item))
    .map((item) =>
      draftToRole(
        { ...item, start: item.start as YearMonth, end: item.end as RoleEnd },
        item.threads,
        item.overlapStyle,
      ),
    );

  // A chain left with one role (the rest left out) is just a role.
  const chainSizes = new Map<string, number>();
  for (const role of imported) if (role.chain) chainSizes.set(role.chain, (chainSizes.get(role.chain) ?? 0) + 1);
  for (const role of imported) if (role.chain && (chainSizes.get(role.chain) ?? 0) < 2) role.chain = null;

  const keepExisting = options.mode === 'add';
  return {
    ...doc,
    updatedAt: (options.now ?? new Date()).toISOString(),
    roles: keepExisting ? [...doc.roles, ...imported] : imported,
    floatingEvents: keepExisting ? doc.floatingEvents : [],
    profile: options.useProfile ? mergeProfile(doc.profile, options.profile, !keepExisting) : doc.profile,
  };
}

function mergeProfile(current: Profile, fromPdf: ImportResult['profile'], overwrite: boolean): Profile {
  const pick = (mine: string, theirs: string) => (overwrite || !mine ? theirs : mine);
  return {
    ...current,
    name: pick(current.name, fromPdf.name),
    headline: pick(current.headline, fromPdf.headline),
    linkedin: pick(current.linkedin, fromPdf.linkedin),
  };
}
