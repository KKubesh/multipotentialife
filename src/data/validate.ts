import { DEFAULT_PROFILE, DEFAULT_SETTINGS, DEFAULT_THREADS, newId } from './defaults';
import {
  PALETTE_IDS,
  SCHEMA_VERSION,
  type FloatingEvent,
  type OverlapStyle,
  type PaletteId,
  type Profile,
  type Role,
  type RoleEnd,
  type RoleEvent,
  type Settings,
  type Thread,
  type TimelineDoc,
  type YearMonth,
} from './schema';

/**
 * Turns untrusted JSON (from device storage or a backup file) into a valid
 * TimelineDoc. It is lenient: bad pieces are dropped or repaired and reported
 * as warnings. It only fails when the input isn't a timeline at all, or comes
 * from a newer version of the app than this one.
 */

export type ParseResult =
  | { ok: true; doc: TimelineDoc; warnings: string[] }
  | { ok: false; error: string };

const YM = /^\d{4}-(0[1-9]|1[0-2])$/;

export const isYearMonth = (v: unknown): v is YearMonth => typeof v === 'string' && YM.test(v);

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

/** Accepts a bare document or a backup file wrapper ({ kind: 'backup', doc }). */
function unwrap(input: unknown): unknown {
  if (isObj(input) && input.kind === 'multipotentialife-backup' && 'doc' in input) return input.doc;
  return input;
}

/** Placeholder for future schema upgrades: version N -> N + 1, step by step. */
function migrate(raw: Obj): Obj {
  const out = raw;
  // e.g. if (out.schemaVersion === 1) { ...upgrade to 2...; out.schemaVersion = 2; }
  return out;
}

export function parseDoc(input: unknown): ParseResult {
  const raw = unwrap(input);
  if (!isObj(raw)) return { ok: false, error: "This file isn't a Multipotentialife timeline." };
  if (!Array.isArray(raw.roles)) {
    return { ok: false, error: "This file isn't a Multipotentialife timeline (no roles found)." };
  }
  const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 1;
  if (version > SCHEMA_VERSION) {
    return {
      ok: false,
      error: 'This backup was made with a newer version of Multipotentialife. Update the app and try again.',
    };
  }

  const data = migrate({ ...raw, schemaVersion: version });
  const warnings: string[] = [];
  const usedIds = new Set<string>();
  const uniqueId = (v: unknown): string => {
    let id = typeof v === 'string' && v.trim() ? v : newId();
    while (usedIds.has(id)) id = newId();
    usedIds.add(id);
    return id;
  };

  const threads = readThreads(data.threads, warnings);
  const threadIds = new Set(threads.map((t) => t.id));
  const keepThreads = (v: unknown): string[] =>
    Array.isArray(v) ? [...new Set(v.filter((t): t is string => typeof t === 'string' && threadIds.has(t)))] : [];

  const roles: Role[] = [];
  (data.roles as unknown[]).forEach((r, i) => {
    const role = readRole(r, i, warnings, uniqueId, keepThreads);
    if (role) roles.push(role);
  });

  const floatingEvents: FloatingEvent[] = [];
  if (Array.isArray(data.floatingEvents)) {
    data.floatingEvents.forEach((e) => {
      if (!isObj(e) || !isYearMonth(e.date)) {
        warnings.push('Skipped a floating event with a missing or invalid date.');
        return;
      }
      floatingEvents.push({ id: uniqueId(e.id), title: str(e.title), date: e.date, threads: keepThreads(e.threads) });
    });
  }

  const doc: TimelineDoc = {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: typeof data.updatedAt === 'string' && !Number.isNaN(Date.parse(data.updatedAt))
      ? data.updatedAt
      : new Date().toISOString(),
    profile: readProfile(data.profile),
    settings: readSettings(data.settings, threadIds),
    threads,
    roles,
    floatingEvents,
  };
  return { ok: true, doc, warnings };
}

function readThreads(v: unknown, warnings: string[]): Thread[] {
  if (!Array.isArray(v) || v.length === 0) return DEFAULT_THREADS.map((t) => ({ ...t }));
  const seen = new Set<string>();
  const out: Thread[] = [];
  v.forEach((t, i) => {
    if (!isObj(t) || typeof t.id !== 'string' || !t.id.trim() || seen.has(t.id)) {
      warnings.push(`Skipped thread #${i + 1}: missing or duplicate id.`);
      return;
    }
    seen.add(t.id);
    out.push({
      id: t.id,
      name: str(t.name, t.id),
      order: typeof t.order === 'number' && t.order > 0 ? t.order : out.length + 1,
    });
  });
  return out.sort((a, b) => a.order - b.order).map((t, i) => ({ ...t, order: i + 1 }));
}

function readRole(
  r: unknown,
  i: number,
  warnings: string[],
  uniqueId: (v: unknown) => string,
  keepThreads: (v: unknown) => string[],
): Role | null {
  const label = isObj(r) && typeof r.title === 'string' && r.title ? `"${r.title}"` : `#${i + 1}`;
  if (!isObj(r) || !isYearMonth(r.start)) {
    warnings.push(`Skipped role ${label}: missing or invalid start date.`);
    return null;
  }
  let start = r.start;
  let end: RoleEnd = r.end === 'now' || isYearMonth(r.end) ? r.end : 'now';
  if (r.end !== end) warnings.push(`Role ${label} had no valid end date; set to present.`);
  if (end !== 'now' && end < start) {
    [start, end] = [end, start];
    warnings.push(`Role ${label} ended before it started; dates were swapped.`);
  }

  const events: RoleEvent[] = Array.isArray(r.events)
    ? r.events.flatMap((e) =>
        isObj(e) && isYearMonth(e.date) ? [{ id: uniqueId(e.id), title: str(e.title), date: e.date }] : [],
      )
    : [];
  const overlap: OverlapStyle | null =
    r.overlapStyle === 'sidecar' || r.overlapStyle === 'separate' ? r.overlapStyle : null;

  return {
    id: uniqueId(r.id),
    title: str(r.title),
    company: str(r.company),
    start,
    end,
    threads: keepThreads(r.threads),
    details: Array.isArray(r.details)
      ? r.details.filter((d): d is string => typeof d === 'string').map((d) => d.trim()).filter(Boolean)
      : [],
    events,
    chain: typeof r.chain === 'string' && r.chain ? r.chain : null,
    overlapStyle: overlap,
  };
}

function readProfile(v: unknown): Profile {
  const p = isObj(v) ? v : {};
  return {
    name: str(p.name),
    headline: str(p.headline),
    linkedin: str(p.linkedin),
    showLinkedInOnShare: bool(p.showLinkedInOnShare, DEFAULT_PROFILE.showLinkedInOnShare),
    includeLinkedInInExport: bool(p.includeLinkedInInExport, DEFAULT_PROFILE.includeLinkedInInExport),
  };
}

function readSettings(v: unknown, threadIds: Set<string>): Settings {
  const s = isObj(v) ? v : {};
  const palette = PALETTE_IDS.includes(s.palette as PaletteId) ? (s.palette as PaletteId) : DEFAULT_SETTINGS.palette;
  const threadSwatches: Record<string, number> = {};
  if (isObj(s.threadSwatches)) {
    for (const [k, n] of Object.entries(s.threadSwatches)) {
      if (threadIds.has(k) && Number.isInteger(n) && (n as number) >= 0) threadSwatches[k] = n as number;
    }
  }
  return { palette, threadSwatches, showTitles: bool(s.showTitles, DEFAULT_SETTINGS.showTitles) };
}
