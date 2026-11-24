import { monthIndex } from '../data/months';
import type { Role, TimelineDoc } from '../data/schema';

/** How a role connects to others, shown as one line each in its detail. */
export interface Relation {
  kind: 'after' | 'before';
  /** The other role. */
  role: Role;
  /** e.g. "Role change · after UI Engineer". */
  text: string;
}

const titleOf = (role: Role) => role.title || 'an untitled role';

/** A role's place in a chain: the roles before and after it at the same company. */
export function relationsFor(role: Role, doc: TimelineDoc): Relation[] {
  const relations: Relation[] = [];

  if (role.chain) {
    const chain = doc.roles
      .filter((r) => r.chain === role.chain)
      .sort((a, b) => monthIndex(a.start) - monthIndex(b.start));
    const at = chain.findIndex((r) => r.id === role.id);
    const before = chain[at - 1];
    const after = chain[at + 1];
    if (before) relations.push({ kind: 'after', role: before, text: `Role change · after ${titleOf(before)}` });
    if (after) relations.push({ kind: 'before', role: after, text: `Role change · before ${titleOf(after)}` });
  }

  return relations;
}
