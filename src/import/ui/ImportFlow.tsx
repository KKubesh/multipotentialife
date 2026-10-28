import { useEffect, useRef, useState } from 'react';
import { useTimeline } from '../../data/timelineContext';
import type { ImportResult } from '../drafts';
import { PdfReadError } from '../pdf';
import { readLinkedInFile } from '../readLinkedInFile';
import { toReviewItems, type ReviewItem } from '../review';
import { ImportLoader } from './ImportLoader';
import { ImportSummary } from './ImportSummary';
import { RoleCard } from './RoleCard';
import './import.css';

/**
 * Import a LinkedIn PDF: read it on the device, then walk through the roles
 * one card at a time, then add them to the timeline.
 */

type Stage =
  { kind: 'reading' } | { kind: 'error'; message: string } | { kind: 'review'; index: number } | { kind: 'summary' };

/** Keep the loader up at least this long so it doesn't just flash. */
const MIN_LOADER_MS = 700;

export interface ImportFlowProps {
  file: File;
  onClose: () => void;
  /** Swappable in tests. */
  readFile?: (file: File) => Promise<ImportResult>;
}

export function ImportFlow({ file, onClose, readFile = readLinkedInFile }: ImportFlowProps) {
  const { doc, dispatch } = useTimeline();
  const [stage, setStage] = useState<Stage>({ kind: 'reading' });
  const [result, setResult] = useState<ImportResult | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    const started = Date.now();
    readFile(file)
      .then(async (read) => {
        const wait = MIN_LOADER_MS - (Date.now() - started);
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
        if (!live) return;
        setResult(read);
        setItems(toReviewItems(read.drafts));
        setStage({ kind: 'review', index: 0 });
      })
      .catch((error: unknown) => {
        if (!live) return;
        setStage({
          kind: 'error',
          message: error instanceof PdfReadError ? error.message : "That PDF couldn't be read.",
        });
      });
    return () => {
      live = false;
    };
  }, [file, readFile]);

  // Each new card starts at the top.
  useEffect(() => {
    top.current?.scrollIntoView?.({ block: 'start' });
  }, [stage]);

  const updateItem = (index: number, patch: Partial<ReviewItem>) =>
    setItems((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <div className="imp" ref={top}>
      <header className="imp-head">
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <h2>Import from LinkedIn</h2>
        <span className="imp-file" title={file.name}>
          {file.name}
        </span>
      </header>

      {stage.kind === 'reading' && <ImportLoader />}

      {stage.kind === 'error' && (
        <div className="imp-card">
          <div className="note error" role="alert">
            {stage.message}
          </div>
          <div className="row">
            <button className="btn" onClick={onClose}>
              Back
            </button>
          </div>
        </div>
      )}

      {stage.kind === 'review' && items[stage.index] && (
        <RoleCard
          key={items[stage.index].key}
          doc={doc}
          items={items}
          index={stage.index}
          onChange={(patch) => updateItem(stage.index, patch)}
          onBack={() => (stage.index === 0 ? onClose() : setStage({ kind: 'review', index: stage.index - 1 }))}
          onNext={() =>
            setStage(stage.index + 1 < items.length ? { kind: 'review', index: stage.index + 1 } : { kind: 'summary' })
          }
          onSkipToSummary={() => setStage({ kind: 'summary' })}
        />
      )}

      {stage.kind === 'summary' && result && (
        <ImportSummary
          doc={doc}
          items={items}
          profile={result.profile}
          onBack={() => setStage({ kind: 'review', index: items.length - 1 })}
          onEdit={(index) => setStage({ kind: 'review', index })}
          onDone={(next) => {
            dispatch({ type: 'replace', doc: next });
            onClose();
          }}
        />
      )}
    </div>
  );
}
