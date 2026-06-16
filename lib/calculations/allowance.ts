import { parseISODate } from '@/lib/dates';

/**
 * Remaining allowance after deducting what has been spent (spec §12.6).
 * Clamped to zero — never negative.
 */
export function remainingAllowance(
  totalBudgetMinor: number,
  spentAmountMinor: number
): number {
  return Math.max(0, totalBudgetMinor - spentAmountMinor);
}

/**
 * How much to spend per remaining day to stay within budget (spec §12.6).
 * Uses floor division to avoid recommending more than the budget allows.
 */
export function recommendedDailyAmount(
  remainingMinor: number,
  remainingInclusiveDays: number
): number {
  if (remainingInclusiveDays <= 0) return 0;
  return Math.floor(remainingMinor / remainingInclusiveDays);
}

/**
 * Inclusive calendar-day count between two ISO dates.
 * Returns 0 when endDate is before startDate.
 */
export function countInclusiveDays(startDate: string, endDate: string): number {
  const start = parseISODate(startDate);
  const end = parseISODate(endDate);
  const ms = end.getTime() - start.getTime();
  return ms < 0 ? 0 : Math.round(ms / 86_400_000) + 1;
}

/**
 * Total allowance to reserve for a given number of calendar days.
 */
export function reserveAllowanceForDays(
  dailyAmountMinor: number,
  days: number
): number {
  return days <= 0 ? 0 : dailyAmountMinor * days;
}
