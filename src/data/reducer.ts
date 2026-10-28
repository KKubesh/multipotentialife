import { newId } from './defaults';
import type { FloatingEvent, Profile, Role, Settings, TimelineDoc } from './schema';

/** Every change to the timeline goes through one of these actions. */
export type Action =
  | { type: 'replace'; doc: TimelineDoc }
  | { type: 'updateProfile'; patch: Partial<Profile> }
  | { type: 'updateSettings'; patch: Partial<Settings> }
  | { type: 'addRole'; role?: Partial<Role> }
  | { type: 'updateRole'; id: string; patch: Partial<Omit<Role, 'id'>> }
  | { type: 'removeRole'; id: string }
  | { type: 'addThread'; name: string }
  | { type: 'renameThread'; id: string; name: string }
  | { type: 'removeThread'; id: string }
  | { type: 'addFloatingEvent'; event?: Partial<FloatingEvent> }
  | { type: 'updateFloatingEvent'; id: string; patch: Partial<Omit<FloatingEvent, 'id'>> }
  | { type: 'removeFloatingEvent'; id: string };

export function blankRole(partial: Partial<Role> = {}): Role {
  return {
    id: newId(),
    title: '',
    company: '',
    start: currentMonth(),
    end: 'now',
    threads: [],
    details: [],
    events: [],
    chain: null,
    overlapStyle: null,
    ...partial,
  };
}

export function currentMonth(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const slug = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'thread';

export function reducer(doc: TimelineDoc, action: Action): TimelineDoc {
  const next = apply(doc, action);
  if (next === doc) return doc;
  return action.type === 'replace' ? next : { ...next, updatedAt: new Date().toISOString() };
}

function apply(doc: TimelineDoc, a: Action): TimelineDoc {
  switch (a.type) {
    case 'replace':
      return a.doc;
    case 'updateProfile':
      return { ...doc, profile: { ...doc.profile, ...a.patch } };
    case 'updateSettings':
      return { ...doc, settings: { ...doc.settings, ...a.patch } };
    case 'addRole':
      return { ...doc, roles: [...doc.roles, blankRole(a.role)] };
    case 'updateRole': {
      if (!doc.roles.some((r) => r.id === a.id)) return doc;
      return { ...doc, roles: doc.roles.map((r) => (r.id === a.id ? { ...r, ...a.patch, id: r.id } : r)) };
    }
    case 'removeRole': {
      const removed = doc.roles.find((r) => r.id === a.id);
      if (!removed) return doc;
      let roles = doc.roles.filter((r) => r.id !== a.id);
      // A chain of one is no longer a chain.
      if (removed.chain && roles.filter((r) => r.chain === removed.chain).length < 2) {
        roles = roles.map((r) => (r.chain === removed.chain ? { ...r, chain: null } : r));
      }
      return { ...doc, roles };
    }
    case 'addThread': {
      const name = a.name.trim();
      if (!name) return doc;
      let id = slug(name);
      for (let n = 2; doc.threads.some((t) => t.id === id); n++) id = `${slug(name)}-${n}`;
      return { ...doc, threads: [...doc.threads, { id, name, order: doc.threads.length + 1 }] };
    }
    case 'renameThread': {
      const name = a.name.trim();
      if (!name) return doc;
      return { ...doc, threads: doc.threads.map((t) => (t.id === a.id ? { ...t, name } : t)) };
    }
    case 'removeThread': {
      if (!doc.threads.some((t) => t.id === a.id)) return doc;
      const { [a.id]: _dropped, ...threadSwatches } = doc.settings.threadSwatches;
      return {
        ...doc,
        threads: doc.threads.filter((t) => t.id !== a.id).map((t, i) => ({ ...t, order: i + 1 })),
        roles: doc.roles.map((r) => (r.threads.includes(a.id) ? { ...r, threads: r.threads.filter((t) => t !== a.id) } : r)),
        floatingEvents: doc.floatingEvents.map((e) =>
          e.threads.includes(a.id) ? { ...e, threads: e.threads.filter((t) => t !== a.id) } : e,
        ),
        settings: { ...doc.settings, threadSwatches },
      };
    }
    case 'addFloatingEvent':
      return {
        ...doc,
        floatingEvents: [
          ...doc.floatingEvents,
          { id: newId(), title: '', date: currentMonth(), threads: [], ...a.event },
        ],
      };
    case 'updateFloatingEvent':
      return {
        ...doc,
        floatingEvents: doc.floatingEvents.map((e) => (e.id === a.id ? { ...e, ...a.patch, id: e.id } : e)),
      };
    case 'removeFloatingEvent':
      return { ...doc, floatingEvents: doc.floatingEvents.filter((e) => e.id !== a.id) };
  }
}
