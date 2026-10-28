import { useState } from 'react';
import { MONTH_SHORT_NAMES, toYearMonth } from '../../data/months';
import type { YearMonth } from '../../data/schema';

export interface MonthFieldProps {
  label: string;
  value: YearMonth | null;
  onChange: (value: YearMonth) => void;
  /** Adds a "current" checkbox; when on, the field shows Present. */
  current?: { on: boolean; label: string; onToggle: (on: boolean) => void };
}

/**
 * A month as a month menu plus a year box. Works the same in every browser,
 * unlike <input type="month">, which desktop Safari doesn't support.
 */
export function MonthField({ label, value, onChange, current }: MonthFieldProps) {
  // While the year is being typed it may not be valid yet, so it's held here.
  const [typedYear, setTypedYear] = useState<string | null>(null);
  const year = typedYear ?? (value ? value.slice(0, 4) : '');
  const month = value ? Number(value.slice(5, 7)) : 0;

  const commit = (nextYear: string, nextMonth: number) => {
    if (/^\d{4}$/.test(nextYear) && Number(nextYear) > 1900 && nextMonth >= 1) {
      onChange(toYearMonth(Number(nextYear), nextMonth));
    }
  };

  return (
    <div className="field month">
      <span>{label}</span>
      {current?.on ? (
        <div className="month-now">Present</div>
      ) : (
        <div className="month-in">
          <select
            aria-label={`${label} month`}
            value={month || ''}
            onChange={(e) => commit(year, Number(e.target.value))}
          >
            <option value="" disabled>
              –
            </option>
            {MONTH_SHORT_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <input
            aria-label={`${label} year`}
            inputMode="numeric"
            placeholder="Year"
            maxLength={4}
            value={year}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '');
              setTypedYear(digits);
              commit(digits, month || 1);
            }}
            onBlur={() => setTypedYear(null)}
          />
        </div>
      )}
      {current && (
        <label className="check">
          <input type="checkbox" checked={current.on} onChange={(e) => current.onToggle(e.target.checked)} />
          {current.label}
        </label>
      )}
    </div>
  );
}
