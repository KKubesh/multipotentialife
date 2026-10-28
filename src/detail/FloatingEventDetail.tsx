import { formatMonth } from '../data/months';
import type { FloatingEvent, TimelineDoc } from '../data/schema';
import { ThreadSwatch } from '../timeline/ThreadSwatch';

/** An event with no parent role, read-only. */
export function FloatingEventDetail({
  doc,
  event,
  headingId,
}: {
  doc: TimelineDoc;
  event: FloatingEvent;
  headingId: string;
}) {
  const threads = event.threads
    .map((id) => doc.threads.find((thread) => thread.id === id))
    .filter((thread) => thread !== undefined);
  return (
    <>
      <header className="detail-head">
        <p className="detail-company">Event</p>
        <h2 id={headingId} tabIndex={-1}>
          {event.title || 'Untitled event'}
        </h2>
        <p className="detail-dates">{formatMonth(event.date)}</p>
      </header>
      {threads.length > 0 && (
        <section aria-label="Threads">
          <h3>Threads</h3>
          <ul className="detail-threads">
            {threads.map((thread) => (
              <li key={thread.id}>
                <ThreadSwatch doc={doc} threadId={thread.id} />
                {thread.name}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
