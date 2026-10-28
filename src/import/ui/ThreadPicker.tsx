import type { TimelineDoc } from '../../data/schema';
import { ThreadSwatch } from '../../timeline/ThreadSwatch';

export interface ThreadPickerProps {
  doc: TimelineDoc;
  /** Picked thread ids, in the order picked; the first two color the pill. */
  value: string[];
  onChange: (value: string[]) => void;
}

export function ThreadPicker({ doc, value, onChange }: ThreadPickerProps) {
  return (
    <div className="chips">
      {doc.threads.map((thread) => {
        const position = value.indexOf(thread.id);
        const picked = position >= 0;
        return (
          <button
            key={thread.id}
            type="button"
            className={`chip-btn${picked ? ' on' : ''}`}
            aria-pressed={picked}
            onClick={() => onChange(picked ? value.filter((id) => id !== thread.id) : [...value, thread.id])}
          >
            <ThreadSwatch doc={doc} threadId={thread.id} />
            {thread.name}
            {picked && value.length > 1 && <small aria-label={`picked ${position + 1}`}>{position + 1}</small>}
          </button>
        );
      })}
    </div>
  );
}
