import { describe, expect, it } from 'vitest';
import { blankRole, reducer } from '../data/reducer';
import { sampleDoc } from '../data/sample';
import type { Role, TimelineDoc } from '../data/schema';
import { chainNeighbour } from './chain';

const docWith = (roles: Role[]): TimelineDoc => ({ ...sampleDoc(), roles, floatingEvents: [] });
const role = (id: string, company: string, start: string, end: string, chain: string | null = null) =>
  blankRole({ id, company, start, end, chain });

describe('chainNeighbour', () => {
  it('finds the role just before at the same company', () => {
    const doc = docWith([role('a', 'Acme', '2019-01', '2020-06'), role('b', 'acme ', '2020-07', '2022-01')]);
    expect(chainNeighbour(doc.roles[1], doc)?.id).toBe('a');
    expect(chainNeighbour(doc.roles[0], doc)?.id).toBe('b');
  });

  it('ignores other companies and roles too far apart', () => {
    const doc = docWith([
      role('a', 'Acme', '2019-01', '2020-01'),
      role('b', 'Acme', '2020-07', '2022-01'),
      role('c', 'Other', '2022-02', '2023-01'),
    ]);
    expect(chainNeighbour(doc.roles[1], doc)).toBeNull();
    expect(chainNeighbour(doc.roles[2], doc)).toBeNull();
  });

  it('needs a company', () => {
    const doc = docWith([role('a', '', '2019-01', '2020-06'), role('b', '', '2020-07', '2022-01')]);
    expect(chainNeighbour(doc.roles[1], doc)).toBeNull();
  });
});

describe('setRoleChain', () => {
  it('joins and leaves a chain, dissolving a chain of one', () => {
    let doc = docWith([role('a', 'Acme', '2019-01', '2020-06', 'c1'), role('b', 'Acme', '2020-07', '2022-01')]);
    doc = reducer(doc, { type: 'setRoleChain', id: 'b', chain: 'c1' });
    expect(doc.roles.map((r) => r.chain)).toEqual(['c1', 'c1']);
    doc = reducer(doc, { type: 'setRoleChain', id: 'b', chain: null });
    expect(doc.roles.map((r) => r.chain)).toEqual([null, null]);
  });
});
