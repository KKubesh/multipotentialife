import { useState } from 'react';
import { DataPanel } from './components/DataPanel';
import { sampleDoc } from './data/sample';
import { PALETTE_IDS } from './data/schema';
import { useTimeline } from './data/store';
import { HatchFill } from './timeline/hatches';
import { PALETTES, swatchForThread } from './timeline/palettes';
import { Timeline } from './timeline/Timeline';

const ZOOMS = [1, 1.6, 2.5, 4, 6];

/** Temporary shell for this build stage: the timeline preview plus the data tools. */
export function App() {
  const { doc, dispatch } = useTimeline();
  const [tab, setTab] = useState<'timeline' | 'data'>('timeline');
  const [zoom, setZoom] = useState(0);

  return (
    <div className="app">
      <header className="app-head">
        <h1>
          multipotential<span className="brand-i">i</span>life
        </h1>
        <nav className="seg-ctl" aria-label="Sections">
          <button className={tab === 'timeline' ? 'on' : ''} onClick={() => setTab('timeline')}>Timeline</button>
          <button className={tab === 'data' ? 'on' : ''} onClick={() => setTab('data')}>Data</button>
        </nav>
      </header>

      {tab === 'data' ? (
        <DataPanel />
      ) : (
        <main className="tl-page">
          <div className="tl-controls">
            <div className="seg-ctl" role="group" aria-label="Palette">
              {PALETTE_IDS.map((id) => (
                <button key={id} className={doc.settings.palette === id ? 'on' : ''} onClick={() => dispatch({ type: 'updateSettings', patch: { palette: id } })}>
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
              <button onClick={() => setZoom((z) => Math.max(0, z - 1))} disabled={zoom === 0} aria-label="Zoom out">−</button>
              <button onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))} disabled={zoom === ZOOMS.length - 1} aria-label="Zoom in">+</button>
            </div>
          </div>

          {doc.roles.length === 0 ? (
            <div className="tl-empty">
              <p>No roles yet.</p>
              <button className="btn pri" onClick={() => dispatch({ type: 'replace', doc: sampleDoc() })}>Load the sample timeline</button>
              <p className="muted">Or restore your own backup from the Data tab.</p>
            </div>
          ) : (
            <Timeline doc={doc} zoom={ZOOMS[zoom]} />
          )}

          {doc.roles.length > 0 && (
            <ul className="tl-key" aria-label="Threads">
              {doc.threads.map((t) => {
                const used = doc.roles.some((r) => r.threads.includes(t.id));
                return used ? (
                  <li key={t.id}>
                    <Swatch threadId={t.id} />
                    {t.name}
                  </li>
                ) : null;
              })}
            </ul>
          )}
        </main>
      )}
    </div>
  );
}


function Swatch({ threadId }: { threadId: string }) {
  const { doc } = useTimeline();
  const s = swatchForThread(doc, threadId);
  if (s.kind === 'hatch')
    return (
      <span className="key-sw hatched">
        <HatchFill className="key-fill" hatch={s.hatch} inverted={s.inverted} />
      </span>
    );
  return <span className="key-sw" style={{ background: s.fill, borderColor: s.edge }} />;
}
