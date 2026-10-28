import { describe, expect, it } from 'vitest';
import { backupFilename, buildBackup, parseBackupText } from './backup';
import { emptyDoc } from './defaults';
import { reducer } from './reducer';

describe('backup files', () => {
  it('round-trips a timeline through a backup file', () => {
    let doc = emptyDoc();
    doc = reducer(doc, { type: 'addRole', role: { title: 'Trail Guide', company: 'Wilderness Inquiry', start: '2014-09', end: '2015-07', threads: ['coaching'], details: ['Guided canoe trips'] } });
    doc = reducer(doc, { type: 'updateSettings', patch: { palette: 'mono' } });
    const text = JSON.stringify(buildBackup(doc), null, 2);
    const res = parseBackupText(text);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.doc).toEqual(doc);
    expect(res.warnings).toEqual([]);
  });

  it('explains files that are not JSON', () => {
    const res = parseBackupText('hello');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/isn't valid JSON/);
  });

  it('names files by date', () => {
    expect(backupFilename(new Date(2026, 9, 27))).toBe('multipotentialife-backup-2026-10-27.json');
  });
});
