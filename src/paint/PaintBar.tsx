import type { TimelineDoc } from '../data/schema';
import { ThreadSwatch } from '../timeline/ThreadSwatch';
import { countWithoutThreads, roleCountsByThread } from './paint';
import './paint.css';

export interface PaintBarProps {
  doc: TimelineDoc;
  /** The thread being added to tapped roles. */
  brush: string;
  onBrush: (threadId: string) => void;
  onDone: () => void;
  /** The last change, read out to screen readers. */
  announcement: string;
}

/** The "Color your timeline" bar: pick a thread, then tap roles on the timeline. */
export function PaintBar({ doc, brush, onBrush, onDone, announcement }: PaintBarProps) {
  const counts = roleCountsByThread(doc);
  const remaining = countWithoutThreads(doc);
  const brushName = doc.threads.find((thread) => thread.id === brush)?.name ?? 'a thread';

  return (
    <section className="paint" aria-label="Color your timeline">
      <div className="paint-inner">
        <div className="paint-head">
          <p className="paint-hint">
            Tap roles to add <b>{brushName}</b>. Tap again to take it off.
          </p>
          <button type="button" className="btn pri small" onClick={onDone}>
            Done
          </button>
        </div>
        <div className="paint-threads" role="radiogroup" aria-label="Thread to add">
          {doc.threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              role="radio"
              aria-checked={thread.id === brush}
              className={`chip-btn${thread.id === brush ? ' on' : ''}`}
              onClick={() => onBrush(thread.id)}
            >
              <ThreadSwatch doc={doc} threadId={thread.id} />
              {thread.name}
              <small className="paint-count" aria-label={`${counts.get(thread.id) ?? 0} roles`}>
                {counts.get(thread.id) ?? 0}
              </small>
            </button>
          ))}
        </div>
        <p className="paint-remaining">
          {remaining === 0
            ? 'Every role has a thread.'
            : `${remaining} ${remaining === 1 ? 'role has' : 'roles have'} no threads yet.`}
        </p>
        <p className="visually-hidden" aria-live="polite">
          {announcement}
        </p>
      </div>
    </section>
  );
}
