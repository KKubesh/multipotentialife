import { useRef, useState } from 'react';
import { downloadBackup, readBackupFile } from '../data/backup';
import { emptyDoc } from '../data/defaults';
import type { TimelineDoc } from '../data/schema';
import { useTimeline } from '../data/store';

/**
 * Temporary screen for this build step: shows what's stored on the device and
 * exercises backup download and restore. The timeline UI replaces it later.
 */

const SAVE_LABEL = {
  saved: 'Saved on this device',
  pending: 'Saving…',
  unavailable: "Not saved: this browser isn't allowing storage. Download a backup to keep your work.",
  full: 'Not saved: device storage is full. Download a backup to keep your work.',
} as const;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export function DataPanel() {
  const { doc, dispatch, loaded, saveStatus } = useTimeline();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ doc: TimelineDoc; warnings: string[]; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setNotice(null);
    const result = await readBackupFile(file);
    if (!result.ok) setError(result.error);
    else setPending({ doc: result.doc, warnings: result.warnings, name: file.name });
  }

  function confirmRestore() {
    if (!pending) return;
    dispatch({ type: 'replace', doc: pending.doc });
    setNotice(`Restored ${pending.doc.roles.length} roles from ${pending.name}.`);
    setPending(null);
  }

  return (
    <main className="panel">
      <header className="panel-head">
        <p className={`status status-${saveStatus}`} role="status">
          {SAVE_LABEL[saveStatus]}
        </p>
      </header>

      {loaded.warnings.length > 0 && (
        <div className="note warn">
          <b>Some saved data needed repairs when loading.</b>
          <ul>
            {loaded.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="card">
        <h2>Your timeline</h2>
        <dl className="stats">
          <div>
            <dt>Roles</dt>
            <dd>{doc.roles.length}</dd>
          </div>
          <div>
            <dt>Threads</dt>
            <dd>{doc.threads.length}</dd>
          </div>
          <div>
            <dt>Events</dt>
            <dd>{doc.roles.reduce((n, r) => n + r.events.length, 0) + doc.floatingEvents.length}</dd>
          </div>
          <div>
            <dt>Last change</dt>
            <dd>{fmtDate(doc.updatedAt)}</dd>
          </div>
        </dl>
        {doc.roles.length > 0 ? (
          <ul className="roles">
            {doc.roles.map((r) => (
              <li key={r.id}>
                <span>{r.title || 'Untitled role'}</span>
                <small>
                  {r.company || 'No company'} · {r.start} – {r.end === 'now' ? 'Present' : r.end}
                </small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">No roles yet.</p>
        )}
        <div className="row">
          <button className="btn" onClick={() => dispatch({ type: 'addRole', role: { title: 'Sample role', company: 'Test Co.' } })}>
            + Add sample role
          </button>
          <span className="sp" />
          {confirmClear ? (
            <>
              <span className="muted">Clear everything?</span>
              <button className="btn danger" onClick={() => { dispatch({ type: 'replace', doc: emptyDoc() }); setConfirmClear(false); }}>
                Clear
              </button>
              <button className="btn" onClick={() => setConfirmClear(false)}>Cancel</button>
            </>
          ) : (
            <button className="btn link-danger" onClick={() => setConfirmClear(true)} disabled={!doc.roles.length}>
              Clear timeline
            </button>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Backup</h2>
        <p className="muted">
          Your timeline lives only in this browser. Download a backup to keep a copy or move it to another device.
        </p>
        <div className="row">
          <button className="btn pri" onClick={() => downloadBackup(doc)}>Download backup</button>
          <button className="btn" onClick={() => fileInput.current?.click()}>Restore from backup</button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={onFile} />
        </div>

        {error && <div className="note error" role="alert">{error}</div>}
        {notice && <div className="note ok" role="status">{notice}</div>}

        {pending && (
          <div className="note confirm">
            <p>
              <b>{pending.name}</b> has {pending.doc.roles.length} roles, last changed {fmtDate(pending.doc.updatedAt)}.
              {doc.roles.length > 0 && <> Restoring replaces your current timeline ({doc.roles.length} roles).</>}
            </p>
            {pending.warnings.length > 0 && (
              <ul>
                {pending.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
            <div className="row">
              <button className="btn pri" onClick={confirmRestore}>Restore</button>
              <button className="btn" onClick={() => setPending(null)}>Cancel</button>
            </div>
          </div>
        )}
      </section>

      <p className="muted support">
        Multipotentialife is free and runs entirely on your device. If you enjoy it, you can{' '}
        <a href="https://buymeacoffee.com/kkubesh" target="_blank" rel="noopener noreferrer">buy me a coffee &#9749;</a>. The code is
        open on{' '}
        <a href="https://github.com/KKubesh/multipotentialife" target="_blank" rel="noopener noreferrer">GitHub</a>, and feedback is
        welcome.
      </p>
    </main>
  );
}
