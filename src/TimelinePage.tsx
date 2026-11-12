import { useEffect, useMemo, useState } from 'react';
import { sampleDoc } from './data/sample';
import { PALETTE_IDS } from './data/schema';
import { useTimeline } from './data/timelineContext';
import type { Selection } from './detail/selection';
import { SelectionDetail } from './detail/SelectionDetail';
import { PdfButton } from './import/PdfButton';
import { countWithoutThreads, toggleThread } from './paint/paint';
import { PaintBar } from './paint/PaintBar';
import { PALETTES } from './timeline/palettes';
import { ThreadSwatch } from './timeline/ThreadSwatch';
import { Timeline } from './timeline/Timeline';

const ZOOMS = [1, 1.6, 2.5, 4, 6];

export interface TimelinePageProps {
  onImport: (file: File) => void;
  /** Coloring mode: tapping a role adds or removes the chosen thread instead of opening it. */
  painting: boolean;
  onPaintingChange: (painting: boolean) => void;
}

/** The timeline screen: controls, the timeline, its key, the detail panel and coloring mode. */
export function TimelinePage({ onImport, painting, onPaintingChange }: TimelinePageProps) {
  const { doc, dispatch } = useTimeline();
  const [zoom, setZoom] = useState(0);
  const [chosen, setSelection] = useState<Selection | null>(null);
  // Coloring and reading details don't mix: while coloring, nothing is open.
  const selection = painting ? null : chosen;
  const [brush, setBrush] = useState<string>(() => doc.threads[0]?.id ?? '');
  const [announcement, setAnnouncement] = useState('');

  const withoutThreads = countWithoutThreads(doc);
  const brushThread = doc.threads.find((thread) => thread.id === brush) ?? doc.threads[0];
  const pressedRoleIds = useMemo(
    () =>
      painting && brushThread
        ? new Set(doc.roles.filter((r) => r.threads.includes(brushThread.id)).map((r) => r.id))
        : null,
    [painting, brushThread, doc.roles],
  );

  const setPainting = (on: boolean) => {
    if (on) setSelection(null);
    onPaintingChange(on);
  };

  // Escape leaves coloring.
  useEffect(() => {
    if (!painting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onPaintingChange(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [painting, onPaintingChange]);

  const onTimelineTap = (tapped: Selection) => {
    if (!painting) return setSelection(tapped);
    const role = tapped.kind === 'role' ? doc.roles.find((r) => r.id === tapped.id) : undefined;
    if (!role || !brushThread) return;
    const threads = toggleThread(role.threads, brushThread.id);
    dispatch({ type: 'updateRole', id: role.id, patch: { threads } });
    const added = threads.includes(brushThread.id);
    setAnnouncement(`${brushThread.name} ${added ? 'added to' : 'removed from'} ${role.title || 'untitled role'}`);
  };

  if (doc.roles.length === 0) {
    return (
      <main className="tl-page">
        <div className="tl-empty">
          <p>
            <b>Start with your LinkedIn profile</b>
          </p>
          <p className="muted">
            On LinkedIn, open your profile, choose More, then Save to PDF. It's read on this device and never uploaded.
          </p>
          <PdfButton className="btn pri" onFile={onImport}>
            Import LinkedIn PDF
          </PdfButton>
          <button className="btn ghost" onClick={() => dispatch({ type: 'replace', doc: sampleDoc() })}>
            Or look at a sample timeline
          </button>
          <p className="muted">You can also restore a backup from the Data tab.</p>
        </div>
      </main>
    );
  }

  return (
    <main className={`tl-page${selection ? ' has-detail' : ''}${painting ? ' painting' : ''}`}>
      <div className="tl-controls">
        <div className="seg-ctl" role="group" aria-label="Palette">
          {PALETTE_IDS.map((id) => (
            <button
              key={id}
              className={doc.settings.palette === id ? 'on' : ''}
              onClick={() => dispatch({ type: 'updateSettings', patch: { palette: id } })}
            >
              {PALETTES[id].name}
            </button>
          ))}
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={painting || doc.settings.showTitles}
            disabled={painting}
            onChange={(e) => dispatch({ type: 'updateSettings', patch: { showTitles: e.target.checked } })}
          />
          <span className="track" aria-hidden="true" />
          Titles
        </label>
        <button
          type="button"
          className={`btn small${painting ? ' pri' : ''}`}
          aria-pressed={painting}
          onClick={() => setPainting(!painting)}
        >
          Color
        </button>
        <div className="zoom" role="group" aria-label="Zoom">
          <button onClick={() => setZoom((z) => Math.max(0, z - 1))} disabled={zoom === 0} aria-label="Zoom out">
            −
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))}
            disabled={zoom === ZOOMS.length - 1}
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
      </div>

      {!painting && withoutThreads > 0 && (
        <p className="tl-nudge">
          {withoutThreads} {withoutThreads === 1 ? 'role has' : 'roles have'} no threads yet.{' '}
          <button type="button" className="linkish" onClick={() => setPainting(true)}>
            Color your timeline
          </button>
        </p>
      )}

      <Timeline
        doc={doc}
        zoom={ZOOMS[zoom]}
        selection={selection}
        onSelect={onTimelineTap}
        forceTitles={painting}
        pressedRoleIds={pressedRoleIds}
      />

      {!painting && (
        <ul className="tl-key" aria-label="Threads">
          {doc.threads.map((thread) =>
            doc.roles.some((r) => r.threads.includes(thread.id)) ? (
              <li key={thread.id}>
                <ThreadSwatch doc={doc} threadId={thread.id} />
                {thread.name}
              </li>
            ) : null,
          )}
        </ul>
      )}

      {painting && brushThread ? (
        <PaintBar
          doc={doc}
          brush={brushThread.id}
          onBrush={setBrush}
          onDone={() => onPaintingChange(false)}
          announcement={announcement}
        />
      ) : (
        <SelectionDetail doc={doc} selection={selection} onSelect={setSelection} onClose={() => setSelection(null)} />
      )}
    </main>
  );
}
