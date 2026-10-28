import type { TimelineDoc } from '../../data/schema';
import { hasGuessedMonth, hasValidDates, type ReviewItem } from '../review';
import { DetailsEditor } from './DetailsEditor';
import { GrowingTextarea } from './GrowingTextarea';
import { MonthField } from './MonthField';
import { ThreadPicker } from './ThreadPicker';

export interface RoleCardProps {
  doc: TimelineDoc;
  items: ReviewItem[];
  /** Which item this card shows. */
  index: number;
  onChange: (patch: Partial<ReviewItem>) => void;
  onBack: () => void;
  onNext: () => void;
  onSkipToSummary: () => void;
}

/** One role in the review: everything about it is editable, and it can be left out. */
export function RoleCard({ doc, items, index, onChange, onBack, onNext, onSkipToSummary }: RoleCardProps) {
  const item = items[index];
  const total = items.length;
  const isLast = index === total - 1;
  const isEducation = item.kind === 'education';
  const datesOk = hasValidDates(item);
  const overlapped = item.overlapsWith ? items.find((other) => other.key === item.overlapsWith) : undefined;
  const allReady = items.every((other) => other.excluded || hasValidDates(other));

  return (
    <div className="imp-card">
      <div className="imp-progress" aria-hidden="true">
        <span style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>
      <div className="imp-count">
        <span>
          {isEducation ? 'Education' : 'Role'} {index + 1} of {total}
        </span>
        <button
          className={`btn small ${item.excluded ? 'pri' : 'ghost'}`}
          onClick={() => onChange({ excluded: !item.excluded })}
        >
          {item.excluded ? 'Include it again' : 'Leave this one out'}
        </button>
      </div>

      <fieldset className={`imp-fields${item.excluded ? ' off' : ''}`} disabled={item.excluded}>
        <label className="field">
          <span>{isEducation ? 'Degree or program' : 'Title'}</span>
          <GrowingTextarea value={item.title} onChange={(title) => onChange({ title })} />
        </label>
        <label className="field">
          <span>{isEducation ? 'School' : 'Company'}</span>
          <input value={item.company} onChange={(e) => onChange({ company: e.target.value })} />
        </label>
        {item.location && <p className="muted imp-loc">{item.location}</p>}

        <div className="imp-dates">
          <MonthField
            label="Start"
            value={item.start}
            onChange={(start) => onChange({ start, startPrecision: 'month' })}
          />
          <MonthField
            label="End"
            value={item.end === 'now' ? null : item.end}
            onChange={(end) => onChange({ end, endPrecision: 'month' })}
            current={{
              on: item.end === 'now',
              label: isEducation ? 'Still studying' : 'Current role',
              onToggle: (on) => onChange({ end: on ? 'now' : item.start, endPrecision: 'month' }),
            }}
          />
        </div>
        <DateNotes item={item} datesOk={datesOk} />

        <div className="field">
          <span>
            Threads <small className="muted">optional · the first two color the pill</small>
          </span>
          <ThreadPicker doc={doc} value={item.threads} onChange={(threads) => onChange({ threads })} />
        </div>

        {overlapped && (
          <div className="field">
            <span>
              Overlaps <b>{overlapped.title || 'another role'}</b> here. Show it…
            </span>
            <div className="seg-ctl wide" role="group" aria-label="How to show the overlap">
              <button
                type="button"
                className={item.overlapStyle === 'sidecar' ? 'on' : ''}
                onClick={() => onChange({ overlapStyle: 'sidecar' })}
              >
                Alongside
              </button>
              <button
                type="button"
                className={item.overlapStyle !== 'sidecar' ? 'on' : ''}
                onClick={() => onChange({ overlapStyle: 'separate' })}
              >
                Own row
              </button>
            </div>
            <small className="muted">Alongside draws it as a thin band under that role.</small>
          </div>
        )}

        <DetailsEditor value={item.details} onChange={(details) => onChange({ details })} />
      </fieldset>

      <div className="imp-foot">
        <button className="btn" onClick={onBack}>
          Back
        </button>
        <span className="sp" />
        {!isLast && (
          <button className="btn ghost" onClick={onSkipToSummary} disabled={!allReady} title="Skip to the summary">
            Finish
          </button>
        )}
        <button className="btn pri" onClick={onNext} disabled={!item.excluded && !datesOk}>
          {isLast ? 'Review' : 'Next'}
        </button>
      </div>
    </div>
  );
}

function DateNotes({ item, datesOk }: { item: ReviewItem; datesOk: boolean }) {
  return (
    <>
      {hasGuessedMonth(item) && (
        <div className="note warn">
          LinkedIn only shows the year here, so the month is a guess. Change it if you remember.
        </div>
      )}
      {!item.start || !item.end ? (
        <div className="note warn">LinkedIn didn't have dates for this one. Add them, or leave it out.</div>
      ) : !datesOk ? (
        <div className="note error">The end is before the start.</div>
      ) : null}
    </>
  );
}
