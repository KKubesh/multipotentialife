import type { FloatingEvent, TimelineDoc } from '../data/schema';
import { useTimeline } from '../data/timelineContext';
import { MonthField } from '../import/ui/MonthField';
import { ThreadPicker } from '../import/ui/ThreadPicker';
import '../import/ui/import.css';
import './edit.css';

export interface FloatingEventEditorProps {
  doc: TimelineDoc;
  event: FloatingEvent;
  headingId: string;
  onDelete: () => void;
  onDone: () => void;
}

/** Edit mode's form for a moment with no parent role. Saves as it's typed. */
export function FloatingEventEditor({ doc, event, headingId, onDelete, onDone }: FloatingEventEditorProps) {
  const { dispatch } = useTimeline();
  const change = (patch: Partial<Omit<FloatingEvent, 'id'>>) =>
    dispatch({ type: 'updateFloatingEvent', id: event.id, patch });

  return (
    <form className="edit-form" onSubmit={(e) => (e.preventDefault(), onDone())}>
      <h2 id={headingId} tabIndex={-1}>
        Edit moment
      </h2>
      <label className="field">
        <span>What happened</span>
        <input value={event.title} onChange={(e) => change({ title: e.target.value })} />
      </label>
      <MonthField label="When" value={event.date} onChange={(date) => change({ date })} />
      <div className="field">
        <span>Threads</span>
        <ThreadPicker doc={doc} value={event.threads} onChange={(threads) => change({ threads })} />
      </div>
      <div className="edit-foot">
        <button type="button" className="btn link-danger" onClick={onDelete}>
          Delete moment
        </button>
        <span className="sp" />
        <button type="submit" className="btn pri">
          Done
        </button>
      </div>
    </form>
  );
}
