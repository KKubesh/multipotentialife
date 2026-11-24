import { describe, expect, it } from 'vitest';
import { emptyDoc } from '../data/defaults';
import { blankRole } from '../data/reducer';
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
      // An old backup can still say "sidecar"; roles aren't tied together any more.
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
  const texts = (id: string) =>
    relationsFor(
      doc.roles.find((r) => r.id === id)!,
      doc,
    ).map((r) => r.text);

  it('describes role changes in a chain', () => {
    expect(texts('ui')).toEqual(['Role change · before Senior UI Engineer']);
    expect(texts('sr')).toEqual(['Role change · after UI Engineer']);
  });

  it('does not tie together overlapping roles at the same company', () => {
    expect(texts('cm')).toEqual([]);
    expect(texts('dr')).toEqual([]);
  });
});
