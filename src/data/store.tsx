import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { reducer, type Action } from './reducer';
import type { TimelineDoc } from './schema';
import { loadDoc, saveDoc, type LoadResult, type SaveStatus } from './storage';

interface TimelineStore {
  doc: TimelineDoc;
  dispatch: (action: Action) => void;
  /** How the timeline was loaded when the app opened. */
  loaded: Pick<LoadResult, 'source' | 'warnings'>;
  /** Result of the most recent save to the device. */
  saveStatus: SaveStatus | 'pending';
}

const Ctx = createContext<TimelineStore | null>(null);

const SAVE_DELAY_MS = 400;

export function TimelineProvider({ children, initial }: { children: ReactNode; initial?: LoadResult }) {
  const [first] = useState<LoadResult>(() => initial ?? loadDoc());
  const [doc, rawDispatch] = useReducer(reducer, first.doc);
  const [saveStatus, setSaveStatus] = useState<TimelineStore['saveStatus']>(
    first.source === 'unavailable' ? 'unavailable' : 'saved',
  );
  const isFirstRender = useRef(true);

  // Autosave, debounced, after every change (not on the initial load).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSaveStatus('pending');
    const t = setTimeout(() => setSaveStatus(saveDoc(doc)), SAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [doc]);

  // Save right away if the tab is closed or hidden mid-debounce.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') saveDoc(doc);
    };
    const onPageHide = () => saveDoc(doc);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [doc]);

  const dispatch = useCallback((a: Action) => rawDispatch(a), []);
  const value = useMemo<TimelineStore>(
    () => ({ doc, dispatch, loaded: { source: first.source, warnings: first.warnings }, saveStatus }),
    [doc, dispatch, first, saveStatus],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTimeline(): TimelineStore {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTimeline must be used inside <TimelineProvider>');
  return v;
}
