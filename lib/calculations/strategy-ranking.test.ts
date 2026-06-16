import { describe, it, expect } from 'vitest';
import { findNextIncomeDate, rankOccurrences } from './strategy-ranking';
import type { PlannerPaymentOccurrence, PlannerIncomeEvent } from '@/types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function occ(
  id: string,
  overrides: Partial<PlannerPaymentOccurrence> = {}
): PlannerPaymentOccurrence {
  return {
    id,
    paymentId: `pay-${id}`,
    dueDate: '2026-07-15',
    dueAmountMinor: 10_000,
    paidAmountMinor: 0,
    feeAmountMinor: 0,
    status: 'scheduled',
    essential: false,
    priority: 3,
    amountIsEstimate: false,
    manuallyOverridden: false,
    ...overrides,
  };
}

function income(
  id: string,
  expectedDate: string,
  status: PlannerIncomeEvent['status'] = 'expected'
): PlannerIncomeEvent {
  return { id, expectedDate, amountMinor: 10_000, status };
}

// ─── findNextIncomeDate ───────────────────────────────────────────────────────

describe('findNextIncomeDate', () => {
  it('returns undefined with no events', () => {
    expect(findNextIncomeDate([], '2026-07-01', true)).toBeUndefined();
  });

  it('returns earliest received income at or after fromDate', () => {
    const events = [
      income('i1', '2026-07-20', 'received'),
      income('i2', '2026-07-10', 'received'),
    ];
    expect(findNextIncomeDate(events, '2026-07-01', false)).toBe('2026-07-10');
  });

  it('includes expected income when flag is true', () => {
    const events = [income('i1', '2026-07-10', 'expected')];
    expect(findNextIncomeDate(events, '2026-07-01', true)).toBe('2026-07-10');
  });

  it('excludes expected income when flag is false', () => {
    const events = [income('i1', '2026-07-10', 'expected')];
    expect(findNextIncomeDate(events, '2026-07-01', false)).toBeUndefined();
  });

  it('excludes delayed events', () => {
    const events = [income('i1', '2026-07-10', 'delayed')];
    expect(findNextIncomeDate(events, '2026-07-01', true)).toBeUndefined();
  });

  it('excludes cancelled events', () => {
    const events = [income('i1', '2026-07-10', 'cancelled')];
    expect(findNextIncomeDate(events, '2026-07-01', true)).toBeUndefined();
  });

  it('excludes events before fromDate', () => {
    const events = [income('i1', '2026-06-30', 'received')];
    expect(findNextIncomeDate(events, '2026-07-01', false)).toBeUndefined();
  });

  it('includes event on fromDate itself', () => {
    const events = [income('i1', '2026-07-01', 'received')];
    expect(findNextIncomeDate(events, '2026-07-01', false)).toBe('2026-07-01');
  });
});

// ─── rankOccurrences — deadline_first ────────────────────────────────────────

describe('rankOccurrences — deadline_first', () => {
  it('sorts by due date ascending', () => {
    const result = rankOccurrences(
      [occ('b', { dueDate: '2026-07-15' }), occ('a', { dueDate: '2026-07-10' })],
      'deadline_first'
    );
    expect(result.map((o) => o.id)).toEqual(['a', 'b']);
  });

  it('puts essential first when dates are equal', () => {
    const result = rankOccurrences(
      [occ('b', { essential: false }), occ('a', { essential: true })],
      'deadline_first'
    );
    expect(result[0].id).toBe('a');
  });

  it('sorts by priority ascending as tiebreaker', () => {
    const result = rankOccurrences(
      [occ('b', { priority: 3 }), occ('a', { priority: 1 })],
      'deadline_first'
    );
    expect(result[0].id).toBe('a');
  });

  it('sorts by remaining amount descending as final tiebreaker', () => {
    const result = rankOccurrences(
      [occ('b', { dueAmountMinor: 5_000 }), occ('a', { dueAmountMinor: 10_000 })],
      'deadline_first'
    );
    expect(result[0].id).toBe('a');
  });

  it('does not mutate the input array', () => {
    const input = [occ('b', { dueDate: '2026-07-15' }), occ('a', { dueDate: '2026-07-10' })];
    const copy = [...input];
    rankOccurrences(input, 'deadline_first');
    expect(input).toEqual(copy);
  });
});

// ─── rankOccurrences — essential_first ───────────────────────────────────────

describe('rankOccurrences — essential_first', () => {
  it('puts essential before non-essential regardless of due date', () => {
    const result = rankOccurrences(
      [
        occ('a', { essential: false, dueDate: '2026-07-01' }),
        occ('b', { essential: true, dueDate: '2026-07-15' }),
      ],
      'essential_first'
    );
    expect(result[0].id).toBe('b');
  });

  it('sorts by due date within the same essentiality group', () => {
    const result = rankOccurrences(
      [
        occ('b', { essential: true, dueDate: '2026-07-15' }),
        occ('a', { essential: true, dueDate: '2026-07-05' }),
      ],
      'essential_first'
    );
    expect(result[0].id).toBe('a');
  });

  it('sorts by priority within same essentiality and date', () => {
    const result = rankOccurrences(
      [
        occ('b', { essential: true, priority: 3 }),
        occ('a', { essential: true, priority: 1 }),
      ],
      'essential_first'
    );
    expect(result[0].id).toBe('a');
  });
});

// ─── rankOccurrences — minimums_first ────────────────────────────────────────

describe('rankOccurrences — minimums_first', () => {
  it('puts occurrences with a minimum defined before those without', () => {
    const result = rankOccurrences(
      [occ('b', { minimumAmountMinor: undefined }), occ('a', { minimumAmountMinor: 500 })],
      'minimums_first'
    );
    expect(result[0].id).toBe('a');
  });

  it('sorts by due date within same minimum-presence group', () => {
    const result = rankOccurrences(
      [
        occ('b', { minimumAmountMinor: 500, dueDate: '2026-07-15' }),
        occ('a', { minimumAmountMinor: 500, dueDate: '2026-07-05' }),
      ],
      'minimums_first'
    );
    expect(result[0].id).toBe('a');
  });

  it('zero minimumAmountMinor counts as no minimum', () => {
    const result = rankOccurrences(
      [occ('b', { minimumAmountMinor: 0 }), occ('a', { minimumAmountMinor: 500 })],
      'minimums_first'
    );
    expect(result[0].id).toBe('a');
  });
});

// ─── rankOccurrences — lowest_cash_flow_risk ─────────────────────────────────

describe('rankOccurrences — lowest_cash_flow_risk', () => {
  it('prioritizes payments due before the next income date', () => {
    const result = rankOccurrences(
      [
        occ('b', { dueDate: '2026-07-20' }), // after income
        occ('a', { dueDate: '2026-07-05' }), // before income
      ],
      'lowest_cash_flow_risk',
      { nextIncomeDate: '2026-07-15' }
    );
    expect(result[0].id).toBe('a');
  });

  it('falls back to due-date order when all are before income', () => {
    const result = rankOccurrences(
      [
        occ('b', { dueDate: '2026-07-10' }),
        occ('a', { dueDate: '2026-07-05' }),
      ],
      'lowest_cash_flow_risk',
      { nextIncomeDate: '2026-07-15' }
    );
    expect(result[0].id).toBe('a');
  });

  it('treats all as pre-income when nextIncomeDate is undefined', () => {
    const result = rankOccurrences(
      [occ('b', { dueDate: '2026-07-20' }), occ('a', { dueDate: '2026-07-05' })],
      'lowest_cash_flow_risk',
      { nextIncomeDate: undefined }
    );
    expect(result[0].id).toBe('a');
  });
});

// ─── rankOccurrences — custom ─────────────────────────────────────────────────

describe('rankOccurrences — custom', () => {
  it('sorts by customPriority payment ID order', () => {
    const result = rankOccurrences(
      [
        occ('occ1', { paymentId: 'pay-b' }),
        occ('occ2', { paymentId: 'pay-a' }),
      ],
      'custom',
      { customPriority: ['pay-a', 'pay-b'] }
    );
    expect(result[0].id).toBe('occ2');
  });

  it('places unranked payment IDs at the end', () => {
    const result = rankOccurrences(
      [
        occ('occ1', { paymentId: 'pay-a' }),
        occ('occ2', { paymentId: 'pay-unknown' }),
      ],
      'custom',
      { customPriority: ['pay-a'] }
    );
    expect(result[0].id).toBe('occ1');
    expect(result[1].id).toBe('occ2');
  });

  it('sorts by due date for same payment ID (multiple occurrences)', () => {
    const result = rankOccurrences(
      [
        occ('b', { paymentId: 'pay-x', dueDate: '2026-07-15' }),
        occ('a', { paymentId: 'pay-x', dueDate: '2026-07-05' }),
      ],
      'custom',
      { customPriority: ['pay-x'] }
    );
    expect(result[0].id).toBe('a');
  });

  it('uses empty customPriority gracefully', () => {
    const result = rankOccurrences(
      [occ('a'), occ('b')],
      'custom',
      { customPriority: [] }
    );
    expect(result).toHaveLength(2);
  });
});

// ─── rankOccurrences — smallest_balance_first ────────────────────────────────

describe('rankOccurrences — smallest_balance_first', () => {
  it('sorts by currentBalanceMinor ascending when available', () => {
    const result = rankOccurrences(
      [
        occ('b', { currentBalanceMinor: 50_000 }),
        occ('a', { currentBalanceMinor: 10_000 }),
      ],
      'smallest_balance_first'
    );
    expect(result[0].id).toBe('a');
  });

  it('falls back to remaining amount when currentBalanceMinor is absent', () => {
    const result = rankOccurrences(
      [
        occ('b', { dueAmountMinor: 20_000, paidAmountMinor: 0 }),
        occ('a', { dueAmountMinor: 5_000, paidAmountMinor: 0 }),
      ],
      'smallest_balance_first'
    );
    expect(result[0].id).toBe('a');
  });

  it('puts occurrences with minimums first regardless of balance', () => {
    const result = rankOccurrences(
      [
        occ('b', { minimumAmountMinor: undefined, currentBalanceMinor: 100 }),
        occ('a', { minimumAmountMinor: 500, currentBalanceMinor: 100_000 }),
      ],
      'smallest_balance_first'
    );
    expect(result[0].id).toBe('a');
  });

  it('sorts by due date ascending as tiebreaker', () => {
    const result = rankOccurrences(
      [
        occ('b', { currentBalanceMinor: 10_000, dueDate: '2026-07-15' }),
        occ('a', { currentBalanceMinor: 10_000, dueDate: '2026-07-05' }),
      ],
      'smallest_balance_first'
    );
    expect(result[0].id).toBe('a');
  });
});

// ─── rankOccurrences — highest_interest_first ────────────────────────────────

describe('rankOccurrences — highest_interest_first', () => {
  it('sorts by annual interest rate descending', () => {
    const result = rankOccurrences(
      [
        occ('b', { annualInterestRate: '12' }),
        occ('a', { annualInterestRate: '36' }),
      ],
      'highest_interest_first'
    );
    expect(result[0].id).toBe('a');
  });

  it('places payments without a rate after those with a known rate', () => {
    const result = rankOccurrences(
      [
        occ('b', { annualInterestRate: undefined }),
        occ('a', { annualInterestRate: '24' }),
      ],
      'highest_interest_first'
    );
    expect(result[0].id).toBe('a');
  });

  it('puts occurrences with minimums first regardless of rate', () => {
    const result = rankOccurrences(
      [
        occ('b', { minimumAmountMinor: undefined, annualInterestRate: '99' }),
        occ('a', { minimumAmountMinor: 500, annualInterestRate: '5' }),
      ],
      'highest_interest_first'
    );
    expect(result[0].id).toBe('a');
  });

  it('sorts by remaining balance descending within same rate', () => {
    const result = rankOccurrences(
      [
        occ('b', { annualInterestRate: '24', dueAmountMinor: 5_000 }),
        occ('a', { annualInterestRate: '24', dueAmountMinor: 20_000 }),
      ],
      'highest_interest_first'
    );
    expect(result[0].id).toBe('a');
  });

  it('sorts by due date ascending as final tiebreaker', () => {
    const result = rankOccurrences(
      [
        occ('b', { annualInterestRate: '24', dueAmountMinor: 10_000, dueDate: '2026-07-15' }),
        occ('a', { annualInterestRate: '24', dueAmountMinor: 10_000, dueDate: '2026-07-05' }),
      ],
      'highest_interest_first'
    );
    expect(result[0].id).toBe('a');
  });
});
