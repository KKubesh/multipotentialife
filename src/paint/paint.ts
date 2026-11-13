import type { Role, TimelineDoc } from '../data/schema';

/**
 * "Color your timeline": pick a thread, then tap roles to add it or take it
 * off. Tap order is kept, so the first two threads tapped still color the pill.
 */
export function toggleThread(threads: string[], threadId: string): string[] {
  return threads.includes(threadId) ? threads.filter((id) => id !== threadId) : [...threads, threadId];
}

/** How many roles carry each thread. */
export function roleCountsByThread(doc: TimelineDoc): Map<string, number> {
  const counts = new Map<string, number>();
  for (const role of doc.roles) for (const id of role.threads) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}

export const hasNoThreads = (role: Role) => role.threads.length === 0;

export const countWithoutThreads = (doc: TimelineDoc) => doc.roles.filter(hasNoThreads).length;
