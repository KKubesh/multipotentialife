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

/** Months a role covers, counting both its first and last month (Apr–Apr is 1). */
export function monthsCovered(start: YearMonth, end: RoleEnd, now: YearMonth = currentMonth()): number {
  const last = end === 'now' ? now : end;
  return Math.max(1, monthIndex(last) - monthIndex(start) + 1);
}

/** "2 yrs 1 mo", "1 yr", "5 mos", the way LinkedIn writes durations. */
export function formatDuration(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [];
  if (years) parts.push(`${years} ${years === 1 ? 'yr' : 'yrs'}`);
  if (rest || !years) parts.push(`${rest} ${rest === 1 ? 'mo' : 'mos'}`);
  return parts.join(' ');
}
