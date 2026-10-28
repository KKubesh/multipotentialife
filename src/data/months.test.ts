import { describe, expect, it } from 'vitest';
import {
  currentMonth,
  formatDuration,
  formatMonth,
  MONTH_SHORT_NAMES,
  monthIndex,
  monthsCovered,
  toYearMonth,
} from './months';

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

  it('counts and formats durations like LinkedIn', () => {
    expect(monthsCovered('2019-04', '2021-04')).toBe(25);
    expect(formatDuration(25)).toBe('2 yrs 1 mo');
    expect(monthsCovered('2025-11', 'now', '2026-10')).toBe(12);
    expect(formatDuration(12)).toBe('1 yr');
    expect(formatDuration(5)).toBe('5 mos');
    expect(formatDuration(1)).toBe('1 mo');
  });
});
