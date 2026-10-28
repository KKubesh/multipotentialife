import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { emptyDoc } from './defaults';
import { STORAGE_KEY } from './storage';
import { TimelineProvider } from './store';
import { useTimeline, type TimelineStore } from './timelineContext';

function renderStore() {
  const store: { current: TimelineStore | null } = { current: null };
  function Probe() {
    store.current = useTimeline();
    return null;
  }
  render(
    <TimelineProvider initial={{ doc: emptyDoc(), source: 'new', warnings: [] }}>
      <Probe />
    </TimelineProvider>,
  );
  return store;
}

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');

describe('autosave on leaving the page', () => {
  it("doesn't overwrite storage when nothing changed (e.g. another tab saved newer data)", () => {
    renderStore();
    const newer = { ...emptyDoc(), profile: { ...emptyDoc().profile, name: 'Saved in another tab' } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newer));

    window.dispatchEvent(new Event('pagehide'));
    expect(stored().profile.name).toBe('Saved in another tab');
  });

  it('saves a change that was still waiting when the page closes', () => {
    const store = renderStore();
    act(() => store.current!.dispatch({ type: 'updateProfile', patch: { name: 'Sam' } }));
    expect(stored()).toBeNull(); // still inside the debounce

    window.dispatchEvent(new Event('pagehide'));
    expect(stored().profile.name).toBe('Sam');
  });
});
