import { describe, it, expect } from 'vitest';
import { expandRecurrence } from './recurrence';
import { resolveMonthDay, daysInMonth, parseISODate, formatISODate } from '@/lib/dates';
import {
  RecurrenceRuleSchema,
  AllowanceBudgetCreateSchema,
  AllowanceBudgetUpdateSchema,
  PaymentObligationCreateSchema,
  isoDate,
} from '@/lib/validation';
import type { RecurrenceRule } from '@/types';

// ─── lib/dates helpers ────────────────────────────────────────────────────────

describe('daysInMonth', () => {
  it('returns 28 for February in a non-leap year', () => {
    expect(daysInMonth(2025, 2)).toBe(28);
  });

  it('returns 29 for February in a leap year', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
  });

  it('returns 31 for January', () => {
    expect(daysInMonth(2025, 1)).toBe(31);
  });

  it('returns 30 for April', () => {
    expect(daysInMonth(2025, 4)).toBe(30);
  });
});

describe('parseISODate / formatISODate round-trip', () => {
  it('round-trips a date correctly', () => {
    expect(formatISODate(parseISODate('2025-03-15'))).toBe('2025-03-15');
  });

  it('round-trips Feb 28 correctly', () => {
    expect(formatISODate(parseISODate('2025-02-28'))).toBe('2025-02-28');
  });
});

// ─── resolveMonthDay ──────────────────────────────────────────────────────────

describe('resolveMonthDay', () => {
  it('returns the date unchanged when day is within the month', () => {
    const d = resolveMonthDay(2025, 3, 15);
    expect(d).not.toBeNull();
    expect(formatISODate(d!)).toBe('2025-03-15');
  });

  // 29th, 30th, 31st edge cases

  it('day=29 in Feb 2025 (non-leap) — last_day → Feb 28', () => {
    expect(formatISODate(resolveMonthDay(2025, 2, 29, 'last_day')!)).toBe('2025-02-28');
  });

  it('day=29 in Feb 2024 (leap year) — no overflow, returns Feb 29', () => {
    expect(formatISODate(resolveMonthDay(2024, 2, 29, 'last_day')!)).toBe('2024-02-29');
  });

  it('day=30 in Feb 2025 — last_day → Feb 28', () => {
    expect(formatISODate(resolveMonthDay(2025, 2, 30, 'last_day')!)).toBe('2025-02-28');
  });

  it('day=31 in Feb 2025 — last_day → Feb 28', () => {
    expect(formatISODate(resolveMonthDay(2025, 2, 31, 'last_day')!)).toBe('2025-02-28');
  });

  it('day=31 in April — last_day → Apr 30', () => {
    expect(formatISODate(resolveMonthDay(2025, 4, 31, 'last_day')!)).toBe('2025-04-30');
  });

  it('day=31 in Feb 2025 — next_month → Mar 3', () => {
    expect(formatISODate(resolveMonthDay(2025, 2, 31, 'next_month')!)).toBe('2025-03-03');
  });

  it('day=30 in Feb 2025 — next_month → Mar 2', () => {
    expect(formatISODate(resolveMonthDay(2025, 2, 30, 'next_month')!)).toBe('2025-03-02');
  });

  it('day=31 in April — next_month → May 1', () => {
    expect(formatISODate(resolveMonthDay(2025, 4, 31, 'next_month')!)).toBe('2025-05-01');
  });

  it('day=31 in Feb — skip → null', () => {
    expect(resolveMonthDay(2025, 2, 31, 'skip')).toBeNull();
  });

  it('day=30 in Feb — skip → null', () => {
    expect(resolveMonthDay(2025, 2, 30, 'skip')).toBeNull();
  });

  it('default overflow policy is last_day', () => {
    expect(formatISODate(resolveMonthDay(2025, 2, 31)!)).toBe('2025-02-28');
  });
});

// ─── expandRecurrence — weekly / biweekly ─────────────────────────────────────

describe('expandRecurrence weekly', () => {
  const base: RecurrenceRule = { frequency: 'weekly', endType: 'never' };

  it('generates weekly dates', () => {
    const dates = expandRecurrence(base, '2026-01-01', '2026-01-29');
    expect(dates).toEqual([
      '2026-01-01',
      '2026-01-08',
      '2026-01-15',
      '2026-01-22',
      '2026-01-29',
    ]);
  });

  it('respects interval=2 (every 2 weeks)', () => {
    const dates = expandRecurrence(
      { ...base, interval: 2 },
      '2026-01-01',
      '2026-02-15'
    );
    expect(dates).toEqual(['2026-01-01', '2026-01-15', '2026-01-29', '2026-02-12']);
  });

  it('biweekly produces every 14 days', () => {
    const dates = expandRecurrence(
      { frequency: 'biweekly', endType: 'never' },
      '2026-01-06',
      '2026-03-01'
    );
    expect(dates[0]).toBe('2026-01-06');
    expect(dates[1]).toBe('2026-01-20');
    expect(dates[2]).toBe('2026-02-03');
    expect(dates[3]).toBe('2026-02-17');
  });
});

// ─── expandRecurrence — monthly, day 31 overflow ─────────────────────────────

describe('expandRecurrence monthly — 29th / 30th / 31st overflow', () => {
  it('day=31 with last_day: clamps to last day of each month', () => {
    const rule: RecurrenceRule = {
      frequency: 'monthly',
      daysOfMonth: [31],
      monthDayOverflow: 'last_day',
      endType: 'never',
    };
    const dates = expandRecurrence(rule, '2026-01-01', '2026-06-30');
    expect(dates).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
      '2026-06-30',
    ]);
  });

  it('day=31 with skip: omits months without a 31st', () => {
    const rule: RecurrenceRule = {
      frequency: 'monthly',
      daysOfMonth: [31],
      monthDayOverflow: 'skip',
      endType: 'never',
    };
    const dates = expandRecurrence(rule, '2026-01-01', '2026-06-30');
    expect(dates).toEqual(['2026-01-31', '2026-03-31', '2026-05-31']);
  });

  it('day=31 with next_month: rolls over into the next month', () => {
    const rule: RecurrenceRule = {
      frequency: 'monthly',
      daysOfMonth: [31],
      monthDayOverflow: 'next_month',
      endType: 'never',
    };
    const dates = expandRecurrence(rule, '2026-01-01', '2026-06-30');
    // Jan→Jan 31, Feb→Mar 3, Mar→Mar 31, Apr→May 1, May→May 31, Jun→Jul 1 (outside range)
    expect(dates).toContain('2026-01-31');
    expect(dates).toContain('2026-03-03'); // Feb overflow
    expect(dates).toContain('2026-03-31');
    expect(dates).toContain('2026-05-01'); // Apr overflow
    expect(dates).toContain('2026-05-31');
    expect(dates).not.toContain('2026-07-01'); // Jun overflow is outside range
  });

  it('day=30 with last_day: February becomes Feb 28', () => {
    const rule: RecurrenceRule = {
      frequency: 'monthly',
      daysOfMonth: [30],
      monthDayOverflow: 'last_day',
      endType: 'never',
    };
    const dates = expandRecurrence(rule, '2026-01-01', '2026-04-30');
    expect(dates).toEqual(['2026-01-30', '2026-02-28', '2026-03-30', '2026-04-30']);
  });

  it('day=29 in leap year Feb: no overflow needed', () => {
    const rule: RecurrenceRule = {
      frequency: 'monthly',
      daysOfMonth: [29],
      monthDayOverflow: 'last_day',
      endType: 'never',
    };
    const dates = expandRecurrence(rule, '2024-01-01', '2024-04-30');
    expect(dates).toContain('2024-02-29');
    expect(dates).toContain('2024-01-29');
  });

  it('day=29 in non-leap year Feb: last_day → Feb 28', () => {
    const rule: RecurrenceRule = {
      frequency: 'monthly',
      daysOfMonth: [29],
      monthDayOverflow: 'last_day',
      endType: 'never',
    };
    const dates = expandRecurrence(rule, '2025-01-01', '2025-04-30');
    expect(dates).toContain('2025-02-28');
    expect(dates).not.toContain('2025-02-29');
  });

  it('deduplicates when two target days resolve to the same date', () => {
    // day 28 and 31 in February: both resolve to Feb 28 with last_day
    const rule: RecurrenceRule = {
      frequency: 'monthly',
      daysOfMonth: [28, 31],
      monthDayOverflow: 'last_day',
      endType: 'never',
    };
    const dates = expandRecurrence(rule, '2025-02-01', '2025-02-28');
    const feb28Count = dates.filter((d) => d === '2025-02-28').length;
    expect(feb28Count).toBe(1);
  });

  it('anchor day from fromDate when daysOfMonth is absent', () => {
    const rule: RecurrenceRule = {
      frequency: 'monthly',
      monthDayOverflow: 'last_day',
      endType: 'never',
    };
    // fromDate is Jan 31 → anchor day = 31
    const dates = expandRecurrence(rule, '2026-01-31', '2026-04-30');
    expect(dates).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });
});

// ─── expandRecurrence — semimonthly ──────────────────────────────────────────

describe('expandRecurrence semimonthly', () => {
  it('[15, 31] with last_day: two dates per month, clamped correctly', () => {
    const rule: RecurrenceRule = {
      frequency: 'semimonthly',
      daysOfMonth: [15, 31],
      monthDayOverflow: 'last_day',
      endType: 'never',
    };
    const dates = expandRecurrence(rule, '2026-01-01', '2026-03-31');
    expect(dates).toEqual([
      '2026-01-15',
      '2026-01-31',
      '2026-02-15',
      '2026-02-28', // Feb 31 → last_day
      '2026-03-15',
      '2026-03-31',
    ]);
  });

  it('[15, 30] with last_day: February 30 → Feb 28', () => {
    const rule: RecurrenceRule = {
      frequency: 'semimonthly',
      daysOfMonth: [15, 30],
      monthDayOverflow: 'last_day',
      endType: 'never',
    };
    const dates = expandRecurrence(rule, '2026-02-01', '2026-02-28');
    expect(dates).toEqual(['2026-02-15', '2026-02-28']);
  });

  it('[15, 31] with skip: omits the 31st in short months', () => {
    const rule: RecurrenceRule = {
      frequency: 'semimonthly',
      daysOfMonth: [15, 31],
      monthDayOverflow: 'skip',
      endType: 'never',
    };
    const dates = expandRecurrence(rule, '2026-02-01', '2026-03-31');
    expect(dates).toEqual(['2026-02-15', '2026-03-15', '2026-03-31']);
  });

  it('defaults to [1, 15] when daysOfMonth is absent', () => {
    const rule: RecurrenceRule = {
      frequency: 'semimonthly',
      endType: 'never',
    };
    const dates = expandRecurrence(rule, '2026-01-01', '2026-02-28');
    expect(dates).toEqual(['2026-01-01', '2026-01-15', '2026-02-01', '2026-02-15']);
  });

  it('respects fromDate — skips dates before it', () => {
    const rule: RecurrenceRule = {
      frequency: 'semimonthly',
      daysOfMonth: [15, 31],
      monthDayOverflow: 'last_day',
      endType: 'never',
    };
    const dates = expandRecurrence(rule, '2026-01-20', '2026-02-28');
    expect(dates).toEqual(['2026-01-31', '2026-02-15', '2026-02-28']);
    expect(dates).not.toContain('2026-01-15');
  });
});

// ─── expandRecurrence — endType controls ─────────────────────────────────────

describe('expandRecurrence endType', () => {
  it('after_count: stops after the given number of occurrences', () => {
    const rule: RecurrenceRule = {
      frequency: 'monthly',
      daysOfMonth: [1],
      endType: 'after_count',
      occurrenceCount: 3,
    };
    const dates = expandRecurrence(rule, '2026-01-01', '2026-12-31');
    expect(dates).toHaveLength(3);
    expect(dates).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
  });

  it('on_date: stops on the endDate (inclusive)', () => {
    const rule: RecurrenceRule = {
      frequency: 'monthly',
      daysOfMonth: [1],
      endType: 'on_date',
      endDate: '2026-04-01',
    };
    const dates = expandRecurrence(rule, '2026-01-01', '2026-12-31');
    expect(dates).toEqual(['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01']);
  });

  it('on_date: respects the stricter of endDate and toDate', () => {
    const rule: RecurrenceRule = {
      frequency: 'monthly',
      daysOfMonth: [1],
      endType: 'on_date',
      endDate: '2026-12-01',
    };
    // Window only runs to March
    const dates = expandRecurrence(rule, '2026-01-01', '2026-03-31');
    expect(dates).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
  });

  it('never: generates until toDate', () => {
    const rule: RecurrenceRule = {
      frequency: 'monthly',
      daysOfMonth: [1],
      endType: 'never',
    };
    const dates = expandRecurrence(rule, '2026-01-01', '2026-05-01');
    expect(dates).toHaveLength(5);
  });
});

// ─── expandRecurrence — quarterly / yearly ───────────────────────────────────

describe('expandRecurrence quarterly', () => {
  it('generates one occurrence per quarter', () => {
    const rule: RecurrenceRule = {
      frequency: 'quarterly',
      daysOfMonth: [15],
      endType: 'after_count',
      occurrenceCount: 4,
    };
    const dates = expandRecurrence(rule, '2026-01-15', '2027-12-31');
    expect(dates).toEqual([
      '2026-01-15',
      '2026-04-15',
      '2026-07-15',
      '2026-10-15',
    ]);
  });

  it('quarterly with day=31 and last_day overflow', () => {
    const rule: RecurrenceRule = {
      frequency: 'quarterly',
      daysOfMonth: [31],
      monthDayOverflow: 'last_day',
      endType: 'after_count',
      occurrenceCount: 4,
    };
    const dates = expandRecurrence(rule, '2026-01-01', '2027-12-31');
    expect(dates).toEqual([
      '2026-01-31',
      '2026-04-30', // April has 30 days
      '2026-07-31',
      '2026-10-31',
    ]);
  });
});

describe('expandRecurrence yearly', () => {
  it('generates one occurrence per year', () => {
    const rule: RecurrenceRule = {
      frequency: 'yearly',
      daysOfMonth: [1],
      endType: 'after_count',
      occurrenceCount: 3,
    };
    const dates = expandRecurrence(rule, '2026-03-01', '2030-12-31');
    expect(dates).toEqual(['2026-03-01', '2027-03-01', '2028-03-01']);
  });
});

// ─── Validation — invalid date ranges ────────────────────────────────────────

describe('isoDate Zod validation', () => {
  it('accepts a valid date', () => {
    expect(isoDate.safeParse('2026-03-15').success).toBe(true);
  });

  it('accepts Feb 29 in a leap year', () => {
    expect(isoDate.safeParse('2024-02-29').success).toBe(true);
  });

  it('rejects Feb 30 (non-existent calendar date)', () => {
    expect(isoDate.safeParse('2025-02-30').success).toBe(false);
  });

  it('rejects Feb 29 in a non-leap year', () => {
    expect(isoDate.safeParse('2025-02-29').success).toBe(false);
  });

  it('rejects month 13', () => {
    expect(isoDate.safeParse('2025-13-01').success).toBe(false);
  });

  it('rejects day 32', () => {
    expect(isoDate.safeParse('2025-01-32').success).toBe(false);
  });

  it('rejects plain strings', () => {
    expect(isoDate.safeParse('not-a-date').success).toBe(false);
  });
});

describe('RecurrenceRuleSchema cross-field validation', () => {
  const base = {
    frequency: 'monthly' as const,
    endType: 'never' as const,
  };

  it('valid monthly never rule passes', () => {
    expect(RecurrenceRuleSchema.safeParse(base).success).toBe(true);
  });

  it('semimonthly requires exactly 2 daysOfMonth', () => {
    const result = RecurrenceRuleSchema.safeParse({
      frequency: 'semimonthly',
      endType: 'never',
      daysOfMonth: [15], // only 1
    });
    expect(result.success).toBe(false);
  });

  it('semimonthly with 2 daysOfMonth passes', () => {
    const result = RecurrenceRuleSchema.safeParse({
      frequency: 'semimonthly',
      endType: 'never',
      daysOfMonth: [15, 30],
    });
    expect(result.success).toBe(true);
  });

  it('endType on_date requires endDate', () => {
    const result = RecurrenceRuleSchema.safeParse({
      ...base,
      endType: 'on_date',
      // no endDate
    });
    expect(result.success).toBe(false);
  });

  it('endType on_date with endDate passes', () => {
    const result = RecurrenceRuleSchema.safeParse({
      ...base,
      endType: 'on_date',
      endDate: '2027-12-31',
    });
    expect(result.success).toBe(true);
  });

  it('endType after_count requires occurrenceCount', () => {
    const result = RecurrenceRuleSchema.safeParse({
      ...base,
      endType: 'after_count',
      // no occurrenceCount
    });
    expect(result.success).toBe(false);
  });

  it('endType after_count with occurrenceCount passes', () => {
    const result = RecurrenceRuleSchema.safeParse({
      ...base,
      endType: 'after_count',
      occurrenceCount: 12,
    });
    expect(result.success).toBe(true);
  });
});

describe('AllowanceBudgetCreateSchema date range validation', () => {
  const base = {
    name: 'Food',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    totalBudgetMinor: 300000,
    spentAmountMinor: 0,
    status: 'active',
  };

  it('valid budget passes', () => {
    expect(AllowanceBudgetCreateSchema.safeParse(base).success).toBe(true);
  });

  it('same start and end date passes', () => {
    expect(
      AllowanceBudgetCreateSchema.safeParse({ ...base, endDate: '2026-07-01' }).success
    ).toBe(true);
  });

  it('endDate before startDate fails', () => {
    expect(
      AllowanceBudgetCreateSchema.safeParse({ ...base, endDate: '2026-06-30' }).success
    ).toBe(false);
  });
});

describe('AllowanceBudgetUpdateSchema date range validation', () => {
  it('updating only endDate to a valid value passes', () => {
    expect(
      AllowanceBudgetUpdateSchema.safeParse({ endDate: '2026-08-31' }).success
    ).toBe(true);
  });

  it('both dates present and endDate < startDate fails', () => {
    expect(
      AllowanceBudgetUpdateSchema.safeParse({
        startDate: '2026-07-01',
        endDate: '2026-06-30',
      }).success
    ).toBe(false);
  });

  it('both dates present and endDate >= startDate passes', () => {
    expect(
      AllowanceBudgetUpdateSchema.safeParse({
        startDate: '2026-07-01',
        endDate: '2026-07-31',
      }).success
    ).toBe(true);
  });
});

describe('PaymentObligationCreateSchema date range validation', () => {
  const base = {
    name: 'Rent',
    category: 'rent',
    structure: 'fixed_recurring',
    currency: 'PHP',
  };

  it('passes when startDate and endDate are absent', () => {
    expect(PaymentObligationCreateSchema.safeParse(base).success).toBe(true);
  });

  it('passes when only startDate is present', () => {
    expect(
      PaymentObligationCreateSchema.safeParse({ ...base, startDate: '2026-01-01' }).success
    ).toBe(true);
  });

  it('fails when endDate is before startDate', () => {
    expect(
      PaymentObligationCreateSchema.safeParse({
        ...base,
        startDate: '2026-07-01',
        endDate: '2026-06-30',
      }).success
    ).toBe(false);
  });

  it('passes when endDate equals startDate', () => {
    expect(
      PaymentObligationCreateSchema.safeParse({
        ...base,
        startDate: '2026-07-01',
        endDate: '2026-07-01',
      }).success
    ).toBe(true);
  });
});
