import { monthIndex } from '../data/months';
import type { Role, TimelineDoc } from '../data/schema';

/** How a role connects to others, shown as one line each in its detail. */
export interface Relation {
  kind: 'after' | 'before' | 'alongside' | 'hosts';
  /** The other role. */
  role: Role;
  /** e.g. "Role change · after UI Engineer". */
  text: string;
}

const titleOf = (role: Role) => role.title || 'an untitled role';

/**
 * A role's place in a chain (the roles before and after it at the same
 * company) and any sidecar link. `sidecarHosts` maps side role id → host role
 * id, as the layout placed them.
 */
export function relationsFor(role: Role, doc: TimelineDoc, sidecarHosts: Map<string, string>): Relation[] {
  const relations: Relation[] = [];
  const byId = new Map(doc.roles.map((r) => [r.id, r]));

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

  const host = byId.get(sidecarHosts.get(role.id) ?? '');
  if (host) relations.push({ kind: 'alongside', role: host, text: `Sidecar · alongside ${titleOf(host)}` });

  for (const [sideId, hostId] of sidecarHosts) {
    const side = byId.get(sideId);
    if (hostId === role.id && side) {
      relations.push({ kind: 'hosts', role: side, text: `With ${titleOf(side)} alongside` });
    }
  }
  return relations;
}
