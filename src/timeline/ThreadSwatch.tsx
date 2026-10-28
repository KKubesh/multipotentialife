import type { TimelineDoc } from '../data/schema';
import { HatchFill } from './hatches';
import { swatchForThread } from './palettes';

/** A small pill showing a thread's color or hatch, for keys and pickers. */
export function ThreadSwatch({ doc, threadId }: { doc: TimelineDoc; threadId: string }) {
  const swatch = swatchForThread(doc, threadId);
  if (swatch.kind === 'hatch') {
    return (
      <span className="key-sw hatched">
        <HatchFill className="key-fill" hatch={swatch.hatch} inverted={swatch.inverted} />
      </span>
    );
  }
  return <span className="key-sw" style={{ background: swatch.fill, borderColor: swatch.edge }} />;
}
