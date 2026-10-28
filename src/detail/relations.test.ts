import { describe, expect, it } from 'vitest';
import { emptyDoc } from '../data/defaults';
import { blankRole } from '../data/reducer';
import { findSidecarHosts } from '../timeline/layout';
import { relationsFor } from './relations';

describe('relationsFor', () => {
  const doc = {
    ...emptyDoc(),
    roles: [
      blankRole({ id: 'ui', title: 'UI Engineer', company: 'Target', start: '2019-04', end: '2021-04', chain: 'tgt' }),
      blankRole({
        id: 'sr',
        title: 'Senior UI Engineer',
        company: 'Target',
        start: '2021-04',
        end: '2022-08',
        chain: 'tgt',
      }),
      blankRole({ id: 'dr', title: 'Consultant: Dragos', company: 'SDG', start: '2023-05', end: '2024-03' }),
      blankRole({
        id: 'cm',
        title: 'Committee Member',
        company: 'SDG',
        start: '2023-10',
        end: '2024-08',
        overlapStyle: 'sidecar',
      }),
    ],
  };
  const hosts = findSidecarHosts(doc, '2026-10');
  const texts = (id: string) =>
    relationsFor(
      doc.roles.find((r) => r.id === id)!,
      doc,
      hosts,
    ).map((r) => r.text);

  it('describes role changes in a chain', () => {
    expect(texts('ui')).toEqual(['Role change · before Senior UI Engineer']);
    expect(texts('sr')).toEqual(['Role change · after UI Engineer']);
  });

  it('describes a sidecar from both sides', () => {
    expect(hosts.get('cm')).toBe('dr');
    expect(texts('cm')).toEqual(['Sidecar · alongside Consultant: Dragos']);
    expect(texts('dr')).toEqual(['With Committee Member alongside']);
  });
});
