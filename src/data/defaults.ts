import { SCHEMA_VERSION, type Profile, type Settings, type Thread, type TimelineDoc } from './schema';

export const DEFAULT_THREADS: Thread[] = [
  { id: 'design', name: 'Design', order: 1 },
  { id: 'software', name: 'Software', order: 2 },
  { id: 'community', name: 'Community', order: 3 },
  { id: 'coaching', name: 'Coaching', order: 4 },
  { id: 'education', name: 'Education', order: 5 },
];

export const DEFAULT_PROFILE: Profile = {
  name: '',
  headline: '',
  linkedin: '',
  showLinkedInOnShare: true,
  includeLinkedInInExport: true,
};

export const DEFAULT_SETTINGS: Settings = {
  palette: 'soft',
  threadSwatches: {},
  showTitles: false,
};

export function emptyDoc(now: Date = new Date()): TimelineDoc {
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: now.toISOString(),
    profile: { ...DEFAULT_PROFILE },
    settings: { ...DEFAULT_SETTINGS, threadSwatches: {} },
    threads: DEFAULT_THREADS.map((t) => ({ ...t })),
    roles: [],
    floatingEvents: [],
  };
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
