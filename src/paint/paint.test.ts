import { describe, expect, it } from 'vitest';
import { emptyDoc } from '../data/defaults';
import { blankRole } from '../data/reducer';
import { countWithoutThreads, roleCountsByThread, toggleThread } from './paint';

describe('paint', () => {
  it('adds a thread at the end, and takes it off on the second tap', () => {
    expect(toggleThread([], 'design')).toEqual(['design']);
    expect(toggleThread(['software'], 'design')).toEqual(['software', 'design']);
    expect(toggleThread(['software', 'design'], 'software')).toEqual(['design']);
  });

  it('counts roles per thread and roles with none', () => {
    const doc = {
      ...emptyDoc(),
      roles: [
        blankRole({ threads: ['design'] }),
        blankRole({ threads: ['design', 'software'] }),
        blankRole({ threads: [] }),
      ],
    };
    expect(Object.fromEntries(roleCountsByThread(doc))).toEqual({ design: 2, software: 1 });
    expect(countWithoutThreads(doc)).toBe(1);
  });
});
