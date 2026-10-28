/**
 * The timeline document: everything a person's timeline needs, in one
 * JSON-safe object. It is what gets saved on the device, written to a
 * backup file, and (later) packed into a share link.
 */

export const SCHEMA_VERSION = 1;

/** Month precision, e.g. "2021-04". */
export type YearMonth = string;

/** End of a role: a month, or "now" for a current role. */
export type RoleEnd = YearMonth | 'now';

export type PaletteId = 'soft' | 'earth' | 'bloom' | 'mono';

export const PALETTE_IDS: readonly PaletteId[] = ['soft', 'earth', 'bloom', 'mono'];

/** How a long overlap with another role at the same company is drawn. */
export type OverlapStyle = 'sidecar' | 'separate';

export interface Profile {
  name: string;
  headline: string;
  /** e.g. "www.linkedin.com/in/kkubesh"; empty when not set. */
  linkedin: string;
  showLinkedInOnShare: boolean;
  includeLinkedInInExport: boolean;
}

export interface Thread {
  id: string;
  name: string;
  /** 1-based creation order; picks the default swatch from the palette. */
  order: number;
}

export interface Settings {
  palette: PaletteId;
  /** Optional per-thread swatch override: thread id -> swatch index in the palette. */
  threadSwatches: Record<string, number>;
  /** Show job titles on the timeline (off by default). */
  showTitles: boolean;
}

export interface RoleEvent {
  id: string;
  title: string;
  date: YearMonth;
}

export interface Role {
  id: string;
  title: string;
  company: string;
  start: YearMonth;
  end: RoleEnd;
  /** Ordered thread ids; the first two fill the pill. */
  threads: string[];
  /** Ordered bullet points. */
  details: string[];
  events: RoleEvent[];
  /** Roles sharing a chain id are drawn as one slanted, segmented pill. */
  chain: string | null;
  /** Only meaningful for a long overlap at the same company. */
  overlapStyle: OverlapStyle | null;
}

export interface FloatingEvent {
  id: string;
  title: string;
  date: YearMonth;
  threads: string[];
}

export interface TimelineDoc {
  schemaVersion: number;
  /** ISO timestamp of the last change. */
  updatedAt: string;
  profile: Profile;
  settings: Settings;
  threads: Thread[];
  roles: Role[];
  floatingEvents: FloatingEvent[];
}
