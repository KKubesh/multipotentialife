import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyDoc } from './defaults';
import { loadDoc, saveDoc, STORAGE_KEY } from './storage';

describe('device storage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('starts new when nothing is saved', () => {
    expect(loadDoc().source).toBe('new');
  });

  it('round-trips a saved timeline', () => {
    const doc = { ...emptyDoc(), profile: { ...emptyDoc().profile, name: 'Kam' } };
    expect(saveDoc(doc)).toBe('saved');
    const loaded = loadDoc();
    expect(loaded.source).toBe('saved');
    expect(loaded.doc).toEqual(doc);
  });

  it('keeps a copy of unreadable data instead of deleting it', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const loaded = loadDoc();
    expect(loaded.source).toBe('recovered');
    expect(loaded.doc.roles).toEqual([]);
    const kept = Object.keys(localStorage).filter((k) => k.startsWith(`${STORAGE_KEY}:unreadable:`));
    expect(kept.length).toBe(1);
  });

  it('reports a full device instead of throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string) => {
      if (key === STORAGE_KEY) throw new DOMException('full', 'QuotaExceededError');
    });
    expect(saveDoc(emptyDoc())).toBe('full');
  });

  it('works without storage at all', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadDoc().source).toBe('unavailable');
    expect(saveDoc(emptyDoc())).toBe('unavailable');
  });
});
