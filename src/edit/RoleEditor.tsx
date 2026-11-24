import { useState } from 'react';
import { newId } from '../data/defaults';
import type { Role, RoleEvent, TimelineDoc } from '../data/schema';
import { useTimeline } from '../data/timelineContext';
import { DetailsEditor } from '../import/ui/DetailsEditor';
import { MonthField } from '../import/ui/MonthField';
import { ThreadPicker } from '../import/ui/ThreadPicker';
import { chainNeighbour, datesOk } from './chain';
import { EventsEditor } from './EventsEditor';
import '../import/ui/import.css';
import './edit.css';

export interface RoleEditorProps {
  doc: TimelineDoc;
  role: Role;
  headingId: string;
  onDelete: () => void;
  onDone: () => void;
}

type Draft = Omit<Role, 'id' | 'chain' | 'overlapStyle'>;

/**
 * Edit mode's form for one role. Every change is saved as it's made, so closing
 * the panel never loses work; only dates that don't make sense yet (an end
 * before the start) wait until they're fixed.
 */
export function RoleEditor({ doc, role, headingId, onDelete, onDone }: RoleEditorProps) {
  const { dispatch } = useTimeline();
  const [draft, setDraft] = useState<Draft>(() => ({
    title: role.title,
    company: role.company,
    start: role.start,
    end: role.end,
    threads: role.threads,
    details: role.details,
    events: role.events,
  }));
  const ok = datesOk(draft.start, draft.end);

  const change = (patch: Partial<Draft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (datesOk(next.start, next.end)) dispatch({ type: 'updateRole', id: role.id, patch: next });
  };

  const neighbour = chainNeighbour({ ...role, ...draft }, doc);
  const chained = role.chain !== null;
  const toggleChain = (on: boolean) => {
    if (!on) return dispatch({ type: 'setRoleChain', id: role.id, chain: null });
    if (!neighbour) return;
    const chain = neighbour.chain ?? newId();
    if (!neighbour.chain) dispatch({ type: 'setRoleChain', id: neighbour.id, chain });
    dispatch({ type: 'setRoleChain', id: role.id, chain });
  };

  return (
    <form className="edit-form" onSubmit={(e) => (e.preventDefault(), onDone())}>
      <h2 id={headingId} tabIndex={-1}>
        Edit role
      </h2>

      <label className="field">
        <span>Title</span>
        <input value={draft.title} onChange={(e) => change({ title: e.target.value })} />
      </label>
      <label className="field">
        <span>Company</span>
        <input value={draft.company} onChange={(e) => change({ company: e.target.value })} />
      </label>

      <div className="imp-dates">
        <MonthField label="Start" value={draft.start} onChange={(start) => change({ start })} />
        <MonthField
          label="End"
          value={draft.end === 'now' ? null : draft.end}
          onChange={(end) => change({ end })}
          current={{
            on: draft.end === 'now',
            label: 'Current role',
            onToggle: (on) => change({ end: on ? 'now' : draft.start }),
          }}
        />
      </div>
      {!ok && (
        <div className="note error" role="alert">
          The end is before the start. Other changes keep saving; the dates save once this is fixed.
        </div>
      )}

      <div className="field">
        <span>
          Threads <small className="muted">the first two color the pill</small>
        </span>
        <ThreadPicker doc={doc} value={draft.threads} onChange={(threads) => change({ threads })} />
      </div>

      {(chained || neighbour) && (
        <label className="check edit-chain">
          <input type="checkbox" checked={chained} onChange={(e) => toggleChain(e.target.checked)} />
          Combined as a role change
          {!chained && neighbour && <small className="muted"> with {neighbour.title || 'an untitled role'}</small>}
        </label>
      )}

      <DetailsEditor value={draft.details} onChange={(details) => change({ details })} />

      <EventsEditor
        value={draft.events}
        role={{ start: draft.start, end: draft.end }}
        onChange={(events: RoleEvent[]) => change({ events })}
      />

      <div className="edit-foot">
        <button type="button" className="btn link-danger" onClick={onDelete}>
          Delete role
        </button>
        <span className="sp" />
        <button type="submit" className="btn pri">
          Done
        </button>
      </div>
    </form>
  );
}
