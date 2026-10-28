/**
 * What the detail panel shows: a role (optionally pointing at one of its
 * events, when a dot was tapped) or an event with no parent role.
 */
export type Selection = { kind: 'role'; id: string; eventId?: string } | { kind: 'floating'; id: string };
