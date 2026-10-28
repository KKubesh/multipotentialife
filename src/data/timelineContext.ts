import { createContext, useContext } from 'react';
import type { Action } from './reducer';
import type { TimelineDoc } from './schema';
import type { LoadResult, SaveStatus } from './storage';

export interface TimelineStore {
  doc: TimelineDoc;
  dispatch: (action: Action) => void;
  /** How the timeline was loaded when the app opened. */
  loaded: Pick<LoadResult, 'source' | 'warnings'>;
  /** Result of the most recent save to the device. */
  saveStatus: SaveStatus | 'pending';
}

export const TimelineContext = createContext<TimelineStore | null>(null);

/** The timeline and its dispatch. Use inside <TimelineProvider>. */
export function useTimeline(): TimelineStore {
  const store = useContext(TimelineContext);
  if (!store) throw new Error('useTimeline must be used inside <TimelineProvider>');
  return store;
}
