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

  // Autosave, debounced, after every change (not on the initial load).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSaveStatus('pending');
    const timer = setTimeout(() => setSaveStatus(saveDoc(doc)), SAVE_DELAY_MS);
    return () => clearTimeout(timer);
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

  const dispatch = useCallback((action: Action) => rawDispatch(action), []);
  const value = useMemo<TimelineStore>(
    () => ({ doc, dispatch, loaded: { source: first.source, warnings: first.warnings }, saveStatus }),
    [doc, dispatch, first, saveStatus],
  );
  return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>;
}
