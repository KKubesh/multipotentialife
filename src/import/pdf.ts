import type { PdfLine } from './linkedin';
import { SIDEBAR_MAX_X } from './linkedin';

/** The few pdf.js calls we use, so tests can pass Node's build and the app the browser's. */
export interface PdfDocLike {
  numPages: number;
  getPage(n: number): Promise<{ getTextContent(): Promise<{ items: unknown[] }> }>;
}

interface TextItem {
  str: string;
  transform: number[];
  height: number;
}
const isTextItem = (it: unknown): it is TextItem =>
  typeof it === 'object' && it !== null && typeof (it as TextItem).str === 'string' && Array.isArray((it as TextItem).transform);

/** Turns pdf.js text items into lines: one per column and baseline, in reading order. Footers are dropped. */
export async function extractLines(doc: PdfDocLike): Promise<PdfLine[]> {
  const lines: PdfLine[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const { items } = await page.getTextContent();
    const byKey = new Map<string, { line: PdfLine; parts: { x: number; str: string }[] }>();
    for (const it of items) {
      if (!isTextItem(it) || !it.str.trim()) continue;
      const x = it.transform[4];
      const y = Math.round(it.transform[5]);
      const col = x < SIDEBAR_MAX_X ? 'side' : 'main';
      const key = `${col}:${y}`;
      let entry = byKey.get(key);
      if (!entry) {
        entry = { line: { page: p, col, y, size: it.height, text: '' }, parts: [] };
        byKey.set(key, entry);
      }
      entry.parts.push({ x, str: it.str });
    }
    const pageLines = [...byKey.values()].map(({ line, parts }) => ({
      ...line,
      text: parts
        .sort((a, b) => a.x - b.x)
        .map((s) => s.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    }));
    // Sidebar first, then the main column; top to bottom within each.
    pageLines.sort((a, b) => (a.col === b.col ? b.y - a.y : a.col === 'side' ? -1 : 1));
    lines.push(...pageLines.filter((l) => Math.abs(l.size - 9) > 0.3));
  }
  return lines;
}

let pdfjs: Promise<typeof import('pdfjs-dist')> | null = null;
/** Loads pdf.js on first use, so it isn't part of the first page load. */
function loadPdfJs() {
  pdfjs ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([lib, worker]) => {
    lib.GlobalWorkerOptions.workerSrc = worker.default;
    return lib;
  });
  return pdfjs;
}

export class PdfReadError extends Error {
  constructor(
    readonly reason: 'not-pdf' | 'locked' | 'unreadable',
    message: string,
  ) {
    super(message);
  }
}

/** Reads a PDF in the browser into text lines. Nothing leaves the device. */
export async function readPdfLines(bytes: ArrayBuffer): Promise<PdfLine[]> {
  const head = new Uint8Array(bytes.slice(0, 5));
  if (String.fromCharCode(...head) !== '%PDF-') throw new PdfReadError('not-pdf', "That file isn't a PDF.");
  const lib = await loadPdfJs();
  const task = lib.getDocument({ data: new Uint8Array(bytes) });
  try {
    let doc;
    try {
      doc = await task.promise;
    } catch (e) {
      if (e instanceof Error && e.name === 'PasswordException') throw new PdfReadError('locked', 'That PDF is password protected.');
      throw new PdfReadError('unreadable', "That PDF couldn't be read.");
    }
    return await extractLines(doc);
  } finally {
    void task.destroy();
  }
}
