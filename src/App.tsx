import { useState } from 'react';
import { DataPanel } from './components/DataPanel';
import { ImportFlow } from './import/ui/ImportFlow';
import { countWithoutThreads } from './paint/paint';
import { TimelinePage } from './TimelinePage';

/** The app shell: header, sections, and the LinkedIn import when one is running. */
export function App() {
  const [tab, setTab] = useState<'timeline' | 'data'>('timeline');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [painting, setPainting] = useState(false);

  return (
    <div className="app">
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
          // Right after an import, open coloring if any role came in without threads.
          onImported={(imported) => setPainting(countWithoutThreads(imported) > 0)}
          onClose={() => {
            setImportFile(null);
            setTab('timeline');
          }}
        />
      ) : tab === 'data' ? (
        <DataPanel onImport={setImportFile} />
      ) : (
        <TimelinePage onImport={setImportFile} painting={painting} onPaintingChange={setPainting} />
      )}
    </div>
  );
}
