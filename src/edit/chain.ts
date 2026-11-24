import { monthIndex } from '../data/months';
import type { Role, TimelineDoc } from '../data/schema';

/** Roles at one company this close together (in months) can be combined as a role change. */
export const CHAIN_GAP = 2;

const companyKey = (role: Role) => role.company.trim().toLowerCase();
const endIndex = (role: Role, now: number) => (role.end === 'now' ? now : monthIndex(role.end));

/**
 * The role a role would join as a role change: same company, ending within
 * CHAIN_GAP months of this one starting (the role before), or else starting
 * within CHAIN_GAP months of this one ending (the role after). The closest wins.
 */
export function chainNeighbour(role: Role, doc: TimelineDoc, nowIndex = Number.MAX_SAFE_INTEGER): Role | null {
  const company = companyKey(role);
  if (!company) return null;
  const start = monthIndex(role.start);
  const end = endIndex(role, nowIndex);
  let best: Role | null = null;
  let bestGap = Infinity;
  for (const other of doc.roles) {
    if (other.id === role.id || companyKey(other) !== company) continue;
    const otherStart = monthIndex(other.start);
    const otherEnd = endIndex(other, nowIndex);
    const gap =
      otherStart < start ? Math.abs(start - otherEnd) : otherStart > start ? Math.abs(otherStart - end) : Infinity;
    if (gap <= CHAIN_GAP && gap < bestGap) {
      best = other;
      bestGap = gap;
    }
  }
  return best;
}

/** A role's dates are usable when the end is "now" or not before the start. */
export const datesOk = (start: string, end: Role['end']) => end === 'now' || monthIndex(end) >= monthIndex(start);
