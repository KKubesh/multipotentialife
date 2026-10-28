import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { reducer, type Action } from './reducer';
import { loadDoc, saveDoc, type LoadResult } from './storage';
import { TimelineContext, type TimelineStore } from './timelineContext';

const SAVE_DELAY_MS = 400;

export function TimelineProvider({ children, initial }: { children: ReactNode; initial?: LoadResult }) {
  const [first] = useState<LoadResult>(() => initial ?? loadDoc());
  const [doc, rawDispatch] = useReducer(reducer, first.doc);
  const [saveStatus, setSaveStatus] = useState<TimelineStore['saveStatus']>(
    first.source === 'unavailable' ? 'unavailable' : 'saved',
  );
  const isFirstRender = useRef(true);
  /** A change that hasn't reached storage yet (the debounce is still waiting). */
  const unsaved = useRef<typeof doc | null>(null);

  const save = useCallback((toSave: typeof doc) => {
    unsaved.current = null;
    setSaveStatus(saveDoc(toSave));
  }, []);

  // Autosave, debounced, after every change (not on the initial load).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    unsaved.current = doc;
    setSaveStatus('pending');
    const timer = setTimeout(() => save(doc), SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [doc, save]);

  // If the tab is hidden or closed mid-debounce, save that change right away. Only a waiting
  // change: saving an unchanged timeline here would overwrite newer data from another tab.
  useEffect(() => {
    const flush = () => {
      if (unsaved.current) save(unsaved.current);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [save]);

  const dispatch = useCallback((action: Action) => rawDispatch(action), []);
  const value = useMemo<TimelineStore>(
    () => ({ doc, dispatch, loaded: { source: first.source, warnings: first.warnings }, saveStatus }),
    [doc, dispatch, first, saveStatus],
  );
  return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>;
}
