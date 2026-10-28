import { useEffect, useMemo, useRef, useState } from 'react';
import type { Role, RoleEnd, TimelineDoc, YearMonth } from '../data/schema';
import { useTimeline } from '../data/store';
import { HatchFill } from '../timeline/hatches';
import { swatchForThread } from '../timeline/palettes';
import { draftToRole, profileToDrafts, type ImportDraft, type ImportResult } from './drafts';
import { looksLikeLinkedIn, parseLinkedInLines } from './linkedin';
import { PdfReadError, readPdfLines } from './pdf';
import './import.css';

/**
 * Import a LinkedIn PDF: read it on the device, then walk through the roles
 * one card at a time. Threads are optional and nothing is pre-picked.
 */

interface Item extends ImportDraft {
  threads: string[];
  overlapStyle: Role['overlapStyle'];
  excluded: boolean;
}

type Stage =
  | { kind: 'reading' }
  | { kind: 'error'; message: string }
  | { kind: 'review'; index: number }
  | { kind: 'finish' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ym = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;
const idx = (v: YearMonth) => Number(v.slice(0, 4)) * 12 + Number(v.slice(5, 7));

/** Reads a LinkedIn PDF into import drafts. */
export async function readLinkedInFile(file: File): Promise<ImportResult> {
  const lines = await readPdfLines(await file.arrayBuffer());
  if (!looksLikeLinkedIn(lines)) {
    throw new PdfReadError('unreadable', "This doesn't look like a LinkedIn profile PDF. On LinkedIn, open the profile, choose More, then Save to PDF.");
  }
  const result = profileToDrafts(parseLinkedInLines(lines));
  if (!result.drafts.length) throw new PdfReadError('unreadable', 'No roles were found in this PDF.');
  return result;
}

export function ImportFlow({ file, onClose }: { file: File; onClose: () => void }) {
  const { doc, dispatch } = useTimeline();
  const [stage, setStage] = useState<Stage>({ kind: 'reading' });
  const [result, setResult] = useState<ImportResult | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    const started = Date.now();
    readLinkedInFile(file)
      .then(async (r) => {
        // Let the loader be seen for a moment rather than flash.
        await new Promise((res) => setTimeout(res, Math.max(0, 700 - (Date.now() - started))));
        if (!live) return;
        setResult(r);
        setItems(r.drafts.map((d) => ({ ...d, threads: [], overlapStyle: null, excluded: false })));
        setStage({ kind: 'review', index: 0 });
      })
      .catch((e: unknown) => {
        if (live) setStage({ kind: 'error', message: e instanceof PdfReadError ? e.message : "That PDF couldn't be read." });
      });
    return () => {
      live = false;
    };
  }, [file]);

  useEffect(() => {
    top.current?.scrollIntoView({ block: 'start' });
  }, [stage]);

  const update = (i: number, patch: Partial<Item>) => setItems((list) => list.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  return (
    <div className="imp" ref={top}>
      <header className="imp-head">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <h2>Import from LinkedIn</h2>
        <span className="imp-file" title={file.name}>{file.name}</span>
      </header>

      {stage.kind === 'reading' && <Loader />}

      {stage.kind === 'error' && (
        <div className="imp-card">
          <div className="note error" role="alert">{stage.message}</div>
          <div className="row">
            <button className="btn" onClick={onClose}>Back</button>
          </div>
        </div>
      )}

      {stage.kind === 'review' && items[stage.index] && (
        <RoleCard
          key={items[stage.index].key}
          doc={doc}
          item={items[stage.index]}
          items={items}
          index={stage.index}
          total={items.length}
          onChange={(patch) => update(stage.index, patch)}
          onBack={() => (stage.index === 0 ? onClose() : setStage({ kind: 'review', index: stage.index - 1 }))}
          onNext={() => setStage(stage.index + 1 < items.length ? { kind: 'review', index: stage.index + 1 } : { kind: 'finish' })}
          onJumpToEnd={() => setStage({ kind: 'finish' })}
        />
      )}

      {stage.kind === 'finish' && result && (
        <Finish
          doc={doc}
          items={items}
          profile={result.profile}
          onBack={() => setStage({ kind: 'review', index: items.length - 1 })}
          onEdit={(i) => setStage({ kind: 'review', index: i })}
          onDone={(next) => {
            dispatch({ type: 'replace', doc: next });
            onClose();
          }}
        />
      )}
    </div>
  );
}

/** A pill that grows while the PDF is read. */
function Loader() {
  return (
    <div className="imp-card imp-loading" role="status">
      <div className="grow-pill" aria-hidden="true">
        <span />
      </div>
      <p>Reading your PDF…</p>
      <p className="muted">It stays on this device.</p>
    </div>
  );
}

const isReady = (it: Item) => !!it.start && !!it.end && (it.end === 'now' || idx(it.end) >= idx(it.start));

function RoleCard(props: {
  doc: TimelineDoc;
  item: Item;
  items: Item[];
  index: number;
  total: number;
  onChange: (patch: Partial<Item>) => void;
  onBack: () => void;
  onNext: () => void;
  onJumpToEnd: () => void;
}) {
  const { doc, item, items, index, total, onChange } = props;
  const other = item.overlapsWith ? items.find((o) => o.key === item.overlapsWith) : null;
  const ready = isReady(item);
  const guessed = item.startPrecision === 'year' || item.endPrecision === 'year';
  const reviewedAll = index === total - 1;

  return (
    <div className="imp-card">
      <div className="imp-progress" aria-hidden="true">
        <span style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>
      <div className="imp-count">
        <span>
          {item.kind === 'education' ? 'Education' : 'Role'} {index + 1} of {total}
        </span>
        <button className={`btn small ${item.excluded ? 'pri' : 'ghost'}`} onClick={() => onChange({ excluded: !item.excluded })}>
          {item.excluded ? 'Include it again' : 'Leave this one out'}
        </button>
      </div>

      <fieldset className={`imp-fields${item.excluded ? ' off' : ''}`} disabled={item.excluded}>
        <label className="field">
          <span>{item.kind === 'education' ? 'Degree or program' : 'Title'}</span>
          <GrowText value={item.title} onChange={(title) => onChange({ title })} />
        </label>
        <label className="field">
          <span>{item.kind === 'education' ? 'School' : 'Company'}</span>
          <input value={item.company} onChange={(e) => onChange({ company: e.target.value })} />
        </label>
        {item.location && <p className="muted imp-loc">{item.location}</p>}

        <div className="imp-dates">
          <MonthField label="Start" value={item.start} onChange={(v) => onChange({ start: v, startPrecision: 'month' })} />
          <MonthField
            label="End"
            value={item.end === 'now' ? null : item.end}
            current={item.end === 'now'}
            currentLabel={item.kind === 'education' ? 'Still studying' : 'Current role'}
            onCurrent={(on) => onChange({ end: on ? 'now' : item.start, endPrecision: 'month' })}
            onChange={(v) => onChange({ end: v, endPrecision: 'month' })}
          />
        </div>
        {guessed && (
          <div className="note warn">LinkedIn only shows the year here, so the month is a guess. Change it if you remember.</div>
        )}
        {!item.start || !item.end ? (
          <div className="note warn">LinkedIn didn't have dates for this one. Add them, or leave it out.</div>
        ) : !ready ? (
          <div className="note error">The end is before the start.</div>
        ) : null}

        <div className="field">
          <span>
            Threads <small className="muted">optional · the first two color the pill</small>
          </span>
          <ThreadPicker doc={doc} value={item.threads} onChange={(threads) => onChange({ threads })} />
        </div>

        {other && (
          <div className="field">
            <span>
              Overlaps <b>{other.title || 'another role'}</b> here. Show it…
            </span>
            <div className="seg-ctl wide" role="group" aria-label="How to show the overlap">
              <button type="button" className={item.overlapStyle === 'sidecar' ? 'on' : ''} onClick={() => onChange({ overlapStyle: 'sidecar' })}>
                Alongside
              </button>
              <button type="button" className={item.overlapStyle !== 'sidecar' ? 'on' : ''} onClick={() => onChange({ overlapStyle: 'separate' })}>
                Own row
              </button>
            </div>
            <small className="muted">Alongside draws it as a thin band under that role.</small>
          </div>
        )}

        <Details value={item.details} onChange={(details) => onChange({ details })} />
      </fieldset>

      <div className="imp-foot">
        <button className="btn" onClick={props.onBack}>Back</button>
        <span className="sp" />
        {!reviewedAll && (
          <button className="btn ghost" onClick={props.onJumpToEnd} disabled={!items.every((it) => it.excluded || isReady(it))} title="Skip to the summary">
            Finish
          </button>
        )}
        <button className="btn pri" onClick={props.onNext} disabled={!item.excluded && !ready}>
          {reviewedAll ? 'Review' : 'Next'}
        </button>
      </div>
    </div>
  );
}

function MonthField(props: {
  label: string;
  value: YearMonth | null;
  onChange: (v: YearMonth) => void;
  current?: boolean;
  onCurrent?: (on: boolean) => void;
  currentLabel?: string;
}) {
  const { value, current } = props;
  const [year, setYear] = useState(value ? value.slice(0, 4) : '');
  const month = value ? Number(value.slice(5, 7)) : 0;
  useEffect(() => {
    if (value) setYear(value.slice(0, 4));
  }, [value]);
  const commit = (y: string, m: number) => {
    if (/^\d{4}$/.test(y) && Number(y) > 1900 && m >= 1) props.onChange(ym(Number(y), m));
  };
  return (
    <div className="field month">
      <span>{props.label}</span>
      {current ? (
        <div className="month-now">Present</div>
      ) : (
        <div className="month-in">
          <select aria-label={`${props.label} month`} value={month || ''} onChange={(e) => commit(year, Number(e.target.value))}>
            <option value="" disabled>
              –
            </option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <input
            aria-label={`${props.label} year`}
            inputMode="numeric"
            placeholder="Year"
            maxLength={4}
            value={year}
            onChange={(e) => {
              const y = e.target.value.replace(/\D/g, '');
              setYear(y);
              commit(y, month || 1);
            }}
          />
        </div>
      )}
      {props.onCurrent && (
        <label className="check">
          <input type="checkbox" checked={!!current} onChange={(e) => props.onCurrent!(e.target.checked)} />
          {props.currentLabel ?? 'Current role'}
        </label>
      )}
    </div>
  );
}

function ThreadPicker({ doc, value, onChange }: { doc: TimelineDoc; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="chips">
      {doc.threads.map((t) => {
        const pos = value.indexOf(t.id);
        const on = pos >= 0;
        const s = swatchForThread(doc, t.id);
        return (
          <button
            key={t.id}
            type="button"
            className={`chip-btn${on ? ' on' : ''}`}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== t.id) : [...value, t.id])}
          >
            {s.kind === 'hatch' ? (
              <span className="key-sw hatched">
                <HatchFill className="key-fill" hatch={s.hatch} inverted={s.inverted} />
              </span>
            ) : (
              <span className="key-sw" style={{ background: s.fill, borderColor: s.edge }} />
            )}
            {t.name}
            {on && value.length > 1 && <small>{pos + 1}</small>}
          </button>
        );
      })}
    </div>
  );
}

/** Tap a detail to edit it; ✕ removes it with an Undo; + adds one. */
function Details({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [removed, setRemoved] = useState<{ text: string; at: number } | null>(null);

  const remove = (i: number) => {
    setRemoved({ text: value[i], at: i });
    setEditing(null);
    onChange(value.filter((_, j) => j !== i));
  };
  const set = (i: number, text: string) => onChange(value.map((v, j) => (j === i ? text : v)));
  const done = () => {
    if (editing != null && !value[editing]?.trim()) onChange(value.filter((_, j) => j !== editing));
    setEditing(null);
  };

  return (
    <div className="field">
      <span>
        Details <small className="muted">{value.length ? 'tap one to edit' : 'none yet'}</small>
      </span>
      <ul className="details">
        {value.map((d, i) => (
          <li key={i} className={editing === i ? 'editing' : ''}>
            {editing === i ? (
              <AutoText value={d} onChange={(t) => set(i, t)} onDone={done} />
            ) : (
              <button type="button" className="detail-text" onClick={() => setEditing(i)}>
                {d}
              </button>
            )}
            <button type="button" className="detail-x" aria-label="Remove detail" onClick={() => remove(i)}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      {removed && (
        <div className="undo" role="status">
          Detail removed.
          <button
            type="button"
            onClick={() => {
              const next = [...value];
              next.splice(Math.min(removed.at, next.length), 0, removed.text);
              onChange(next);
              setRemoved(null);
            }}
          >
            Undo
          </button>
        </div>
      )}
      <button
        type="button"
        className="btn small add-detail"
        onClick={() => {
          onChange([...value, '']);
          setEditing(value.length);
          setRemoved(null);
        }}
      >
        + Add detail
      </button>
    </div>
  );
}

/** A one-line field that wraps onto more lines for long titles. */
function GrowText({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      className="grow"
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
    />
  );
}

function AutoText({ value, onChange, onDone }: { value: string; onChange: (v: string) => void; onDone: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      onBlur={onDone}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          onDone();
        }
      }}
    />
  );
}

function Finish(props: {
  doc: TimelineDoc;
  items: Item[];
  profile: ImportResult['profile'];
  onBack: () => void;
  onEdit: (i: number) => void;
  onDone: (doc: TimelineDoc) => void;
}) {
  const { doc, items, profile } = props;
  const kept = items.filter((it) => !it.excluded);
  const notReady = items.map((it, i) => ({ it, i })).filter(({ it }) => !it.excluded && !isReady(it));
  const hasExisting = doc.roles.length > 0;
  const [mode, setMode] = useState<'replace' | 'add'>('add');
  const [useProfile, setUseProfile] = useState(true);

  const next = useMemo(() => {
    const roles = kept.filter(isReady).map((it) => draftToRole({ ...it, start: it.start!, end: it.end as RoleEnd }, it.threads, it.overlapStyle));
    // A chain left with one role (the rest left out) is just a role.
    const counts = new Map<string, number>();
    for (const r of roles) if (r.chain) counts.set(r.chain, (counts.get(r.chain) ?? 0) + 1);
    for (const r of roles) if (r.chain && counts.get(r.chain)! < 2) r.chain = null;

    const base = hasExisting && mode === 'add' ? doc.roles : [];
    const fill = !hasExisting || mode === 'replace';
    const p = doc.profile;
    return {
      ...doc,
      updatedAt: new Date().toISOString(),
      roles: [...base, ...roles],
      floatingEvents: hasExisting && mode === 'add' ? doc.floatingEvents : [],
      profile: useProfile
        ? {
            ...p,
            name: fill || !p.name ? profile.name : p.name,
            headline: fill || !p.headline ? profile.headline : p.headline,
            linkedin: fill || !p.linkedin ? profile.linkedin : p.linkedin,
          }
        : p,
    };
  }, [kept, mode, useProfile, doc, profile, hasExisting]);

  const threaded = kept.filter((it) => it.threads.length).length;

  return (
    <div className="imp-card">
      <h3>Ready to add</h3>
      <dl className="stats">
        <div>
          <dt>Roles</dt>
          <dd>{kept.filter((it) => it.kind === 'work').length}</dd>
        </div>
        <div>
          <dt>Education</dt>
          <dd>{kept.filter((it) => it.kind === 'education').length}</dd>
        </div>
        <div>
          <dt>Left out</dt>
          <dd>{items.length - kept.length}</dd>
        </div>
        <div>
          <dt>With threads</dt>
          <dd>{threaded}</dd>
        </div>
      </dl>

      {notReady.length > 0 && (
        <div className="note warn">
          {notReady.length === 1 ? 'One still needs dates' : `${notReady.length} still need dates`} and won't be added:
          <ul>
            {notReady.map(({ it, i }) => (
              <li key={it.key}>
                <button type="button" className="linkish" onClick={() => props.onEdit(i)}>
                  {it.title || 'Untitled'} · {it.company}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {threaded < kept.length && (
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
          {mode === 'replace' && <small className="muted">Download a backup first if you might want the current one back.</small>}
        </div>
      )}

      <div className="imp-foot">
        <button className="btn" onClick={props.onBack}>Back</button>
        <span className="sp" />
        <button className="btn pri" disabled={next.roles.length === 0} onClick={() => props.onDone(next)}>
          {hasExisting && mode === 'add' ? 'Add to timeline' : 'Show my timeline'}
        </button>
      </div>
    </div>
  );
}
