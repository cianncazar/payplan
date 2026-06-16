/**
 * Number of days in a month. month is 1–12.
 */
export function daysInMonth(year: number, month: number): number {
  // Day 0 of the following month equals the last day of the current month.
  return new Date(year, month, 0).getDate();
}

/**
 * Parse a YYYY-MM-DD string as a local midnight Date.
 * Does not validate the calendar date; pair with the Zod isoDate schema for
 * that.
 */
export function parseISODate(iso: string): Date {
  const parts = iso.split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

/**
 * Format a local Date as YYYY-MM-DD.
 */
export function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Resolve a target day within a specific month, applying the overflow policy
 * when the day exceeds the month's length (e.g. day=31 in February).
 *
 * - 'last_day': clamp to the last valid day of the month (default)
 * - 'next_month': allow JS Date to roll over naturally into the next month
 * - 'skip': return null — the caller should omit this occurrence
 *
 * month is 1–12.
 */
export function resolveMonthDay(
  year: number,
  month: number,
  targetDay: number,
  overflow: 'last_day' | 'next_month' | 'skip' = 'last_day'
): Date | null {
  const max = daysInMonth(year, month);
  if (targetDay <= max) {
    return new Date(year, month - 1, targetDay);
  }
  switch (overflow) {
    case 'last_day':
      return new Date(year, month - 1, max);
    case 'next_month':
      // JS Date rolls over automatically: new Date(2025, 1, 31) => 3 Mar 2025
      return new Date(year, month - 1, targetDay);
    case 'skip':
      return null;
  }
}

/**
 * Add delta months to a year/month pair.
 * Returns [year, month] where month is 1–12.
 */
export function addMonthsToYearMonth(
  year: number,
  month: number,
  delta: number
): [number, number] {
  const total = year * 12 + (month - 1) + delta;
  return [Math.floor(total / 12), (total % 12) + 1];
}
