import {
  parseISODate,
  formatISODate,
  resolveMonthDay,
  addMonthsToYearMonth,
} from '@/lib/dates';
import type { RecurrenceRule } from '@/types';

// Hard cap to prevent runaway generation regardless of endType.
const SAFETY_CAP = 500;

function computeCeiling(rule: RecurrenceRule, windowEnd: Date): Date {
  if (rule.endType === 'on_date' && rule.endDate) {
    const ruleEnd = parseISODate(rule.endDate);
    return ruleEnd < windowEnd ? ruleEnd : windowEnd;
  }
  return windowEnd;
}

function computeMax(rule: RecurrenceRule): number {
  if (rule.endType === 'after_count' && rule.occurrenceCount != null) {
    return Math.min(rule.occurrenceCount, SAFETY_CAP);
  }
  return SAFETY_CAP;
}

/**
 * Expand a RecurrenceRule into a sorted list of YYYY-MM-DD date strings
 * that fall within [fromDate, toDate].
 *
 * Pure function — deterministic, no side effects.
 */
export function expandRecurrence(
  rule: RecurrenceRule,
  fromDate: string,
  toDate: string
): string[] {
  const from = parseISODate(fromDate);
  const to = parseISODate(toDate);
  const ceiling = computeCeiling(rule, to);
  const max = computeMax(rule);
  const overflow = rule.monthDayOverflow ?? 'last_day';
  const interval = rule.interval ?? 1;

  if (rule.frequency === 'weekly' || rule.frequency === 'biweekly') {
    const stepDays = rule.frequency === 'weekly' ? 7 * interval : 14 * interval;
    return expandByDays(from, ceiling, max, stepDays);
  }

  const monthStep =
    rule.frequency === 'monthly'
      ? interval
      : rule.frequency === 'semimonthly'
        ? 1
        : rule.frequency === 'quarterly'
          ? 3 * interval
          : 12 * interval; // yearly

  const targetDays: number[] =
    rule.frequency === 'semimonthly'
      ? rule.daysOfMonth && rule.daysOfMonth.length >= 2
        ? [...rule.daysOfMonth].sort((a, b) => a - b).slice(0, 2)
        : [1, 15]
      : rule.daysOfMonth && rule.daysOfMonth.length > 0
        ? [...rule.daysOfMonth].sort((a, b) => a - b)
        : [from.getDate()];

  return expandByMonths(from, ceiling, max, monthStep, targetDays, overflow);
}

function expandByDays(
  from: Date,
  ceiling: Date,
  max: number,
  stepDays: number
): string[] {
  const results: string[] = [];
  let y = from.getFullYear();
  let m = from.getMonth();
  let d = from.getDate();

  while (results.length < max) {
    const current = new Date(y, m, d);
    if (current > ceiling) break;
    results.push(formatISODate(current));
    const next = new Date(y, m, d + stepDays);
    y = next.getFullYear();
    m = next.getMonth();
    d = next.getDate();
  }

  return results;
}

function expandByMonths(
  from: Date,
  ceiling: Date,
  max: number,
  monthStep: number,
  targetDays: number[],
  overflow: 'last_day' | 'next_month' | 'skip'
): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  let [year, month] = [from.getFullYear(), from.getMonth() + 1];

  // 1200 = 100 years of monthly iterations — safe upper bound.
  for (let i = 0; i < 1200 && results.length < max; i++) {
    if (new Date(year, month - 1, 1) > ceiling) break;

    for (const targetDay of targetDays) {
      if (results.length >= max) break;

      const resolved = resolveMonthDay(year, month, targetDay, overflow);
      if (resolved === null) continue; // skip overflow policy

      // targetDays are sorted ascending; a larger day always resolves to a date
      // that is the same or later. Once past ceiling we can stop this month.
      if (resolved > ceiling) break;

      if (resolved >= from) {
        const iso = formatISODate(resolved);
        if (!seen.has(iso)) {
          seen.add(iso);
          results.push(iso);
        }
      }
    }

    [year, month] = addMonthsToYearMonth(year, month, monthStep);
  }

  // 'next_month' overflow can produce out-of-calendar-order dates (e.g. a
  // February 31 → March 3 appears while processing February but lands in March).
  // Sort to guarantee a monotonically increasing result regardless of overflow
  // policy.
  return overflow === 'next_month' ? [...results].sort() : results;
}
