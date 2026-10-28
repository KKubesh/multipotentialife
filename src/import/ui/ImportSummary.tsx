import { useMemo, useState } from 'react';
import type { TimelineDoc } from '../../data/schema';
import type { ImportResult } from '../drafts';
import { buildImportedDoc, hasValidDates, type ImportMode, type ReviewItem } from '../review';

export interface ImportSummaryProps {
  doc: TimelineDoc;
  items: ReviewItem[];
  profile: ImportResult['profile'];
  onBack: () => void;
  /** Go back to one item, e.g. to add its missing dates. */
  onEdit: (index: number) => void;
  onDone: (doc: TimelineDoc) => void;
}

/** The last step: what will be added, and whether to add to or replace the current timeline. */
export function ImportSummary({ doc, items, profile, onBack, onEdit, onDone }: ImportSummaryProps) {
  const hasExisting = doc.roles.length > 0;
  const [mode, setMode] = useState<ImportMode>(hasExisting ? 'add' : 'replace');
  const [useProfile, setUseProfile] = useState(true);

  const kept = items.filter((item) => !item.excluded);
  const missingDates = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !item.excluded && !hasValidDates(item));
  const withThreads = kept.filter((item) => item.threads.length > 0).length;

  const next = useMemo(
    () => buildImportedDoc(doc, items, { mode, useProfile, profile }),
    [doc, items, mode, useProfile, profile],
  );

  return (
    <div className="imp-card">
      <h3>Ready to add</h3>
      <dl className="stats">
        <Stat label="Roles" value={kept.filter((item) => item.kind === 'work').length} />
        <Stat label="Education" value={kept.filter((item) => item.kind === 'education').length} />
        <Stat label="Left out" value={items.length - kept.length} />
        <Stat label="With threads" value={withThreads} />
      </dl>

      {missingDates.length > 0 && (
        <div className="note warn">
          {missingDates.length === 1 ? 'One still needs dates' : `${missingDates.length} still need dates`} and won't be
          added:
          <ul>
            {missingDates.map(({ item, index }) => (
              <li key={item.key}>
                <button type="button" className="linkish" onClick={() => onEdit(index)}>
                  {item.title || 'Untitled'} · {item.company}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {withThreads < kept.length && (
        <p className="muted">Roles without threads show as white pills. You can add threads any time.</p>
      )}

      {profile.name && (
        <label className="check">
          <input type="checkbox" checked={useProfile} onChange={(e) => setUseProfile(e.target.checked)} />
          Use “{profile.name}”{profile.headline ? ' and the headline' : ''}
          {profile.linkedin ? ' and LinkedIn link' : ''} from the PDF
        </label>
      )}

      {hasExisting && (
        <div className="field">
          <span>You already have {doc.roles.length} roles on your timeline.</span>
          <div className="seg-ctl wide" role="group" aria-label="Add or replace">
            <button type="button" className={mode === 'add' ? 'on' : ''} onClick={() => setMode('add')}>
              Add to it
            </button>
            <button type="button" className={mode === 'replace' ? 'on' : ''} onClick={() => setMode('replace')}>
              Replace it
            </button>
          </div>
          {mode === 'replace' && (
            <small className="muted">Download a backup first if you might want the current one back.</small>
          )}
        </div>
      )}

      <div className="imp-foot">
        <button className="btn" onClick={onBack}>
          Back
        </button>
        <span className="sp" />
        <button className="btn pri" disabled={next.roles.length === 0} onClick={() => onDone(next)}>
          {hasExisting && mode === 'add' ? 'Add to timeline' : 'Show my timeline'}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
