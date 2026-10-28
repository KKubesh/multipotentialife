import { useState } from 'react';
import { DataPanel } from './components/DataPanel';
import { ImportFlow } from './import/ui/ImportFlow';
import { PdfButton } from './import/PdfButton';
import { sampleDoc } from './data/sample';
import type { Selection } from './detail/selection';
import { SelectionDetail } from './detail/SelectionDetail';
import { PALETTE_IDS } from './data/schema';
import { useTimeline } from './data/timelineContext';
import { PALETTES } from './timeline/palettes';
import { ThreadSwatch } from './timeline/ThreadSwatch';
import { Timeline } from './timeline/Timeline';

const ZOOMS = [1, 1.6, 2.5, 4, 6];

/** Temporary shell for this build stage: the timeline preview plus the data tools. */
export function App() {
  const { doc, dispatch } = useTimeline();
  const [tab, setTab] = useState<'timeline' | 'data'>('timeline');
  const [zoom, setZoom] = useState(0);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  return (
    <div className={`app${selection && !importFile && tab === 'timeline' ? ' has-detail' : ''}`}>
      <header className="app-head">
        <h1>
          multipotential<span className="brand-i">i</span>life
        </h1>
        <nav className="seg-ctl" aria-label="Sections">
          <button className={tab === 'timeline' ? 'on' : ''} onClick={() => setTab('timeline')}>
            Timeline
          </button>
          <button className={tab === 'data' ? 'on' : ''} onClick={() => setTab('data')}>
            Data
          </button>
        </nav>
      </header>

      {importFile ? (
        <ImportFlow
          file={importFile}
          onClose={() => {
            setImportFile(null);
            setTab('timeline');
          }}
        />
      ) : tab === 'data' ? (
        <DataPanel onImport={setImportFile} />
      ) : (
        <main className="tl-page">
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
                checked={doc.settings.showTitles}
                onChange={(e) => dispatch({ type: 'updateSettings', patch: { showTitles: e.target.checked } })}
              />
              <span className="track" aria-hidden="true" />
              Titles
            </label>
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

          {doc.roles.length === 0 ? (
            <div className="tl-empty">
              <p>
                <b>Start with your LinkedIn profile</b>
              </p>
              <p className="muted">
                On LinkedIn, open your profile, choose More, then Save to PDF. It's read on this device and never
                uploaded.
              </p>
              <PdfButton className="btn pri" onFile={setImportFile}>
                Import LinkedIn PDF
              </PdfButton>
              <button className="btn ghost" onClick={() => dispatch({ type: 'replace', doc: sampleDoc() })}>
                Or look at a sample timeline
              </button>
              <p className="muted">You can also restore a backup from the Data tab.</p>
            </div>
          ) : (
            <Timeline doc={doc} zoom={ZOOMS[zoom]} selection={selection} onSelect={setSelection} />
          )}

          {doc.roles.length > 0 && (
            <ul className="tl-key" aria-label="Threads">
              {doc.threads.map((t) => {
                const used = doc.roles.some((r) => r.threads.includes(t.id));
                return used ? (
                  <li key={t.id}>
                    <ThreadSwatch doc={doc} threadId={t.id} />
                    {t.name}
                  </li>
                ) : null;
              })}
            </ul>
          )}

          <SelectionDetail doc={doc} selection={selection} onSelect={setSelection} onClose={() => setSelection(null)} />
        </main>
      )}
    </div>
  );
}
