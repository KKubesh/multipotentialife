import type { RoleEnd, YearMonth } from './schema';

/**
 * Month helpers shared by the data model, the layout and the import.
 * Dates are month precision strings like "2021-04".
 */

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const MONTH_SHORT_NAMES = MONTH_NAMES.map((name) => name.slice(0, 3));

/** "2021-04" from a year and a 1-based month. */
export function toYearMonth(year: number, month: number): YearMonth {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** The current month, e.g. "2026-10". */
export function currentMonth(date: Date = new Date()): YearMonth {
  return toYearMonth(date.getFullYear(), date.getMonth() + 1);
}

/** Months since year 0 (January 2021 → 2021 × 12). Use it to compare or subtract months. */
export function monthIndex(value: YearMonth): number {
  return Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7)) - 1;
}

/** "Apr 2021", or "Present" for a current role. */
export function formatMonth(value: YearMonth | RoleEnd): string {
  if (value === 'now') return 'Present';
  return `${MONTH_SHORT_NAMES[Number(value.slice(5, 7)) - 1]} ${value.slice(0, 4)}`;
}
