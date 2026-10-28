import type { TimelineDoc } from './schema';
import { parseDoc, type ParseResult } from './validate';

/**
 * Backup files: the whole timeline as readable JSON, wrapped so the app can
 * recognize its own files. Restoring runs the same validation as device
 * storage, so a hand-edited or older backup is repaired where possible.
 */

export const BACKUP_KIND = 'multipotentialife-backup';
const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

export interface BackupFile {
  kind: typeof BACKUP_KIND;
  exportedAt: string;
  doc: TimelineDoc;
}

export function buildBackup(doc: TimelineDoc, now: Date = new Date()): BackupFile {
  return { kind: BACKUP_KIND, exportedAt: now.toISOString(), doc };
}

export function backupFilename(now: Date = new Date()): string {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `multipotentialife-backup-${d}.json`;
}

export function downloadBackup(doc: TimelineDoc): void {
  const blob = new Blob([JSON.stringify(buildBackup(doc), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = backupFilename();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseBackupText(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON, so it can't be a Multipotentialife backup." };
  }
  return parseDoc(json);
}

export async function readBackupFile(file: File): Promise<ParseResult> {
  if (file.size > MAX_BACKUP_BYTES) {
    return { ok: false, error: 'That file is too large to be a Multipotentialife backup.' };
  }
  return parseBackupText(await file.text());
}
