/**
 * Checks the importer against real LinkedIn PDFs on your machine, without
 * putting them in the repo. Skipped unless you point it at some:
 *
 *   MPL_PDFS="../kam-k.pdf ../guy-k.pdf" npm test -- realPdf
 *
 * It prints what it pulled from each file so you can compare by eye.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { profileToDrafts } from './drafts';
import { looksLikeLinkedIn, parseLinkedInLines } from './linkedin';
import { extractLines, type PdfDocLike } from './pdf';

const files = (process.env.MPL_PDFS ?? '').split(/\s+/).filter(Boolean);

describe.skipIf(!files.length)('real LinkedIn PDFs', () => {
  for (const file of files) {
    it(file, async () => {
      const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const doc = (await getDocument({ data: new Uint8Array(readFileSync(file)) }).promise) as unknown as PdfDocLike;
      const lines = await extractLines(doc);
      expect(looksLikeLinkedIn(lines)).toBe(true);
      const profile = parseLinkedInLines(lines);
      const { drafts } = profileToDrafts(profile);
      expect(drafts.length).toBeGreaterThan(0);

      const flag = (p: string) => (p === 'month' ? ' ' : p === 'year' ? '~' : '?');
      const out = [`${profile.name} · ${profile.headline}`, `${profile.linkedin || '(no link)'} · ${drafts.length} roles`];
      for (const d of drafts) {
        out.push(
          `${(d.start ?? '?').padEnd(7)}${flag(d.startPrecision)} – ${(d.end ?? '?').padEnd(7)}${flag(d.endPrecision)} ${d.kind === 'education' ? '🎓 ' : ''}${d.title} @ ${d.company}` +
            `${d.chain ? ' [chain]' : ''}${d.overlapsWith ? ' [overlap]' : ''} · ${d.details.length} details`,
        );
      }
      console.log(out.join('\n'));
    });
  }
});
