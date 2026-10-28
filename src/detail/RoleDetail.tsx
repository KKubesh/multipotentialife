import { formatDuration, formatMonth, monthsCovered } from '../data/months';
import type { Role, TimelineDoc } from '../data/schema';
import { ThreadSwatch } from '../timeline/ThreadSwatch';
import type { Relation } from './relations';
import type { Selection } from './selection';

export interface RoleDetailProps {
  doc: TimelineDoc;
  role: Role;
  relations: Relation[];
  /** An event to point out, when the panel was opened from its dot. */
  highlightEventId?: string;
  headingId: string;
  onSelect: (selection: Selection) => void;
  now?: string;
}

/** Everything about one role, read-only: what view mode shows when a role is tapped. */
export function RoleDetail({ doc, role, relations, highlightEventId, headingId, onSelect, now }: RoleDetailProps) {
  const duration = formatDuration(monthsCovered(role.start, role.end, now));
  const threads = role.threads
    .map((id) => doc.threads.find((thread) => thread.id === id))
    .filter((thread) => thread !== undefined);
  const events = [...role.events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <header className="detail-head">
        {role.company && <p className="detail-company">{role.company}</p>}
        <h2 id={headingId} tabIndex={-1}>
          {role.title || 'Untitled role'}
        </h2>
        <p className="detail-dates">
          {formatMonth(role.start)} – {formatMonth(role.end)} <span aria-hidden="true">·</span> {duration}
        </p>
      </header>

      {relations.length > 0 && (
        <ul className="detail-relations">
          {relations.map((relation) => (
            <li key={`${relation.kind}-${relation.role.id}`}>
              <button
                type="button"
                className="linkish"
                data-select
                onClick={() => onSelect({ kind: 'role', id: relation.role.id })}
              >
                {relation.text}
              </button>
            </li>
          ))}
        </ul>
      )}

      <section aria-label="Threads">
        <h3>Threads</h3>
        {threads.length ? (
          <ul className="detail-threads">
            {threads.map((thread) => (
              <li key={thread.id}>
                <ThreadSwatch doc={doc} threadId={thread.id} />
                {thread.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No threads yet.</p>
        )}
      </section>

      {role.details.length > 0 && (
        <section aria-label="Details">
          <h3>Details</h3>
          <ul className="detail-list">
            {role.details.map((detail, i) => (
              <li key={i}>{detail}</li>
            ))}
          </ul>
        </section>
      )}

      {events.length > 0 && (
        <section aria-label="Events">
          <h3>Events</h3>
          <ul className="detail-events">
            {events.map((event) => (
              <li key={event.id} className={event.id === highlightEventId ? 'highlight' : undefined}>
                <span className="detail-event-dot" aria-hidden="true" />
                <span>{event.title || 'Untitled event'}</span>
                <span className="muted">{formatMonth(event.date)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
