import { profileToDrafts, type ImportResult } from './drafts';
import { looksLikeLinkedIn, parseLinkedInLines } from './linkedin';
import { PdfReadError, readPdfLines } from './pdf';

/** Reads a LinkedIn "Save to PDF" file into draft roles for the review. */
export async function readLinkedInFile(file: File): Promise<ImportResult> {
  const lines = await readPdfLines(await file.arrayBuffer());
  if (!looksLikeLinkedIn(lines)) {
    throw new PdfReadError(
      'unreadable',
      "This doesn't look like a LinkedIn profile PDF. On LinkedIn, open the profile, choose More, then Save to PDF.",
    );
  }
  const result = profileToDrafts(parseLinkedInLines(lines));
  if (!result.drafts.length) throw new PdfReadError('unreadable', 'No roles were found in this PDF.');
  return result;
}
