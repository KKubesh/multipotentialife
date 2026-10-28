import { useState } from 'react';
import { newId } from '../../data/defaults';
import { GrowingTextarea } from './GrowingTextarea';

export interface DetailsEditorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

/**
 * The details of a role as an editable list: tap one to edit it, ✕ removes it
 * with an Undo, + adds one. Each detail gets a stable key for this editor, so
 * editing state stays with the right detail as the list changes.
 */
export function DetailsEditor({ value, onChange }: DetailsEditorProps) {
  const [keys, setKeys] = useState<string[]>(() => value.map(() => newId()));
  const [editing, setEditing] = useState<string | null>(null);
  const [removed, setRemoved] = useState<{ text: string; key: string; at: number } | null>(null);

  const change = (nextValue: string[], nextKeys: string[]) => {
    setKeys(nextKeys);
    onChange(nextValue);
  };

  const remove = (at: number) => {
    setRemoved({ text: value[at], key: keys[at], at });
    setEditing(null);
    change(
      value.filter((_, i) => i !== at),
      keys.filter((_, i) => i !== at),
    );
  };

  const undo = () => {
    if (!removed) return;
    const at = Math.min(removed.at, value.length);
    change(
      [...value.slice(0, at), removed.text, ...value.slice(at)],
      [...keys.slice(0, at), removed.key, ...keys.slice(at)],
    );
    setRemoved(null);
  };

  const add = () => {
    const key = newId();
    change([...value, ''], [...keys, key]);
    setEditing(key);
    setRemoved(null);
  };

  const edit = (at: number, text: string) => onChange(value.map((detail, i) => (i === at ? text : detail)));

  // Leaving an empty detail removes it.
  const finishEditing = () => {
    const at = keys.indexOf(editing ?? '');
    if (at >= 0 && !value[at]?.trim()) {
      change(
        value.filter((_, i) => i !== at),
        keys.filter((_, i) => i !== at),
      );
    }
    setEditing(null);
  };

  return (
    <div className="field">
      <span>
        Details <small className="muted">{value.length ? 'tap one to edit' : 'none yet'}</small>
      </span>
      <ul className="details">
        {value.map((detail, i) => {
          const key = keys[i];
          return (
            <li key={key} className={editing === key ? 'editing' : ''}>
              {editing === key ? (
                <GrowingTextarea
                  value={detail}
                  onChange={(text) => edit(i, text)}
                  onDone={finishEditing}
                  autoFocus
                  className=""
                />
              ) : (
                <button type="button" className="detail-text" onClick={() => setEditing(key)}>
                  {detail}
                </button>
              )}
              <button type="button" className="detail-x" aria-label="Remove detail" onClick={() => remove(i)}>
                ✕
              </button>
            </li>
          );
        })}
      </ul>
      {removed && (
        <div className="undo" role="status">
          Detail removed.
          <button type="button" onClick={undo}>
            Undo
          </button>
        </div>
      )}
      <button type="button" className="btn small add-detail" onClick={add}>
        + Add detail
      </button>
    </div>
  );
}
