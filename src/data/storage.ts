import { emptyDoc } from './defaults';
import type { TimelineDoc } from './schema';
import { parseDoc } from './validate';

/**
 * Device storage. The timeline lives only in this browser's localStorage.
 * Every access is wrapped: private windows, blocked site data or a full
 * quota must never break the app — it keeps working in memory and reports
 * that saving is unavailable.
 */

export const STORAGE_KEY = 'multipotentialife:timeline';

export interface LoadResult {
  doc: TimelineDoc;
  /** 'saved' = restored from the device; 'new' = nothing saved yet; 'recovered' = saved data needed repairs. */
  source: 'saved' | 'new' | 'recovered' | 'unavailable';
  warnings: string[];
}

function getStore(): Storage | null {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    const probe = `${STORAGE_KEY}:probe`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function loadDoc(): LoadResult {
  const store = getStore();
  if (!store) return { doc: emptyDoc(), source: 'unavailable', warnings: [] };
  let text: string | null = null;
  try {
    text = store.getItem(STORAGE_KEY);
  } catch {
    return { doc: emptyDoc(), source: 'unavailable', warnings: [] };
  }
  if (!text) return { doc: emptyDoc(), source: 'new', warnings: [] };

  try {
    const parsed = parseDoc(JSON.parse(text));
    if (parsed.ok) {
      return { doc: parsed.doc, source: parsed.warnings.length ? 'recovered' : 'saved', warnings: parsed.warnings };
    }
    keepCorruptCopy(store, text);
    return { doc: emptyDoc(), source: 'recovered', warnings: [parsed.error] };
  } catch {
    keepCorruptCopy(store, text);
    return { doc: emptyDoc(), source: 'recovered', warnings: ["Saved data couldn't be read; started fresh."] };
  }
}

/** Never silently destroy someone's data: park unreadable data under a side key. */
function keepCorruptCopy(store: Storage, text: string) {
  try {
    store.setItem(`${STORAGE_KEY}:unreadable:${Date.now()}`, text);
  } catch {
    /* nothing more we can do */
  }
}

export type SaveStatus = 'saved' | 'unavailable' | 'full';

export function saveDoc(doc: TimelineDoc): SaveStatus {
  const store = getStore();
  if (!store) return 'unavailable';
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(doc));
    return 'saved';
  } catch {
    return 'full';
  }
}

export function clearDoc(): void {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
