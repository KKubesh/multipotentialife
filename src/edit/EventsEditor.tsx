import { newId } from '../data/defaults';
import { monthIndex } from '../data/months';
import type { Role, RoleEvent } from '../data/schema';
import { MonthField } from '../import/ui/MonthField';

export interface EventsEditorProps {
  value: RoleEvent[];
  /** The role's dates, to start new events there and to flag ones outside them. */
  role: Pick<Role, 'start' | 'end'>;
  onChange: (value: RoleEvent[]) => void;
}

const outside = (date: string, role: Pick<Role, 'start' | 'end'>) =>
  monthIndex(date) < monthIndex(role.start) || (role.end !== 'now' && monthIndex(date) > monthIndex(role.end));

/** A role's events (graduation, launch): a name and a month each. */
export function EventsEditor({ value, role, onChange }: EventsEditorProps) {
  const edit = (id: string, patch: Partial<RoleEvent>) =>
    onChange(value.map((event) => (event.id === id ? { ...event, ...patch } : event)));

  return (
    <div className="field">
      <span>
        Events <small className="muted">{value.length ? 'moments during this role' : 'none yet'}</small>
      </span>
      <ul className="edit-events">
        {value.map((event, i) => (
          <li key={event.id}>
            <label className="field">
              <span className="sr-only">Event {i + 1} name</span>
              <input
                value={event.title}
                placeholder="What happened"
                onChange={(e) => edit(event.id, { title: e.target.value })}
              />
            </label>
            <MonthField
              label={`Event ${i + 1} date`}
              value={event.date}
              onChange={(date) => edit(event.id, { date })}
            />
            <button
              type="button"
              className="detail-x"
              aria-label={`Remove ${event.title || 'event'}`}
              onClick={() => onChange(value.filter((other) => other.id !== event.id))}
            >
              ✕
            </button>
            {outside(event.date, role) && <p className="note warn">This is outside the role's dates.</p>}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn small add-detail"
        onClick={() => onChange([...value, { id: newId(), title: '', date: role.start }])}
      >
        + Add event
      </button>
    </div>
  );
}
