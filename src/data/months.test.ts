import { describe, expect, it } from 'vitest';
import { currentMonth, formatMonth, MONTH_SHORT_NAMES, monthIndex, toYearMonth } from './months';

describe('months', () => {
  it('builds and reads month strings', () => {
    expect(toYearMonth(2021, 4)).toBe('2021-04');
    expect(currentMonth(new Date(2026, 9, 28))).toBe('2026-10');
    expect(MONTH_SHORT_NAMES[0]).toBe('Jan');
  });

  it('indexes months so they can be compared and subtracted', () => {
    expect(monthIndex('2021-01')).toBe(2021 * 12);
    expect(monthIndex('2021-04') - monthIndex('2020-12')).toBe(4);
  });

  it('formats months for display', () => {
    expect(formatMonth('2021-04')).toBe('Apr 2021');
    expect(formatMonth('now')).toBe('Present');
  });
});
