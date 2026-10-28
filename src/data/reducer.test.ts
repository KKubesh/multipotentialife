import { describe, expect, it } from 'vitest';
import { emptyDoc } from './defaults';
import { reducer } from './reducer';

describe('reducer', () => {
  it('adds, updates and removes roles', () => {
    let doc = reducer(emptyDoc(), { type: 'addRole', role: { title: 'Designer', start: '2015-01' } });
    const id = doc.roles[0].id;
    doc = reducer(doc, { type: 'updateRole', id, patch: { company: 'HjS', details: ['Drew details'] } });
    expect(doc.roles[0]).toMatchObject({ title: 'Designer', company: 'HjS', details: ['Drew details'], id });
    doc = reducer(doc, { type: 'removeRole', id });
    expect(doc.roles).toEqual([]);
  });

  it('dissolves a chain when only one role is left in it', () => {
    let doc = emptyDoc();
    doc = reducer(doc, { type: 'addRole', role: { id: 'a', chain: 'tgt' } });
    doc = reducer(doc, { type: 'addRole', role: { id: 'b', chain: 'tgt' } });
    doc = reducer(doc, { type: 'removeRole', id: 'a' });
    expect(doc.roles[0].chain).toBeNull();
  });

  it('removing a thread clears it from roles, events and swatches', () => {
    let doc = emptyDoc();
    doc = reducer(doc, { type: 'addRole', role: { threads: ['design', 'software'] } });
    doc = reducer(doc, { type: 'addFloatingEvent', event: { threads: ['design'] } });
    doc = reducer(doc, { type: 'updateSettings', patch: { threadSwatches: { design: 2 } } });
    doc = reducer(doc, { type: 'removeThread', id: 'design' });
    expect(doc.threads.map((t) => [t.id, t.order])).toEqual([['software', 1], ['community', 2], ['coaching', 3], ['education', 4]]);
    expect(doc.roles[0].threads).toEqual(['software']);
    expect(doc.floatingEvents[0].threads).toEqual([]);
    expect(doc.settings.threadSwatches).toEqual({});
  });

  it('adds threads with unique ids in creation order', () => {
    let doc = reducer(emptyDoc(), { type: 'addThread', name: 'Design' });
    expect(doc.threads.at(-1)).toEqual({ id: 'design-2', name: 'Design', order: 6 });
    doc = reducer(doc, { type: 'addThread', name: '   ' });
    expect(doc.threads.length).toBe(6);
  });

  it('stamps updatedAt on change and leaves no-ops alone', () => {
    const start = { ...emptyDoc(), updatedAt: '2000-01-01T00:00:00.000Z' };
    expect(reducer(start, { type: 'removeRole', id: 'missing' })).toBe(start);
    const changed = reducer(start, { type: 'updateProfile', patch: { name: 'Kam' } });
    expect(changed.updatedAt).not.toBe(start.updatedAt);
  });
});
