import { describe, it, expect } from 'vitest';
import { runPlanner } from './planner';
import type { PlannerInput, PlannerPaymentOccurrence } from '@/types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const base: PlannerInput = {
  periodStart: '2026-07-01',
  periodEnd: '2026-07-05',
  openingCashMinor: 20_000,
  minimumCashBufferMinor: 0,
  allowanceReservations: [],
  incomeEvents: [],
  occurrences: [],
  manualAdjustments: [],
  strategy: 'deadline_first',
  includeExpectedIncome: false,
};

function occ(
  id: string,
  overrides: Partial<PlannerPaymentOccurrence> = {}
): PlannerPaymentOccurrence {
  return {
    id,
    paymentId: `pay-${id}`,
    paymentName: `Payment ${id}`,
    dueDate: '2026-07-01',
    dueAmountMinor: 5_000,
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

// ─── Date range validation ────────────────────────────────────────────────────

describe('runPlanner — date range validation', () => {
  it('returns not_enough_data when end is before start', () => {
    const result = runPlanner({
      ...base,
      periodStart: '2026-07-10',
      periodEnd: '2026-07-01',
    });
    expect(result.summary.health).toBe('not_enough_data');
    expect(result.warnings.some((w) => w.code === 'INVALID_DATE_RANGE')).toBe(true);
    expect(result.timeline).toHaveLength(0);
  });
});

// ─── Empty period ─────────────────────────────────────────────────────────────

describe('runPlanner — no occurrences', () => {
  it('produces one timeline entry per day', () => {
    const result = runPlanner(base);
    expect(result.timeline).toHaveLength(5);
  });

  it('opening balance equals closing when nothing happens', () => {
    const result = runPlanner(base);
    expect(result.summary.remainingCashMinor).toBe(20_000);
  });

  it('reports not_enough_data when no eligible occurrences', () => {
    const result = runPlanner(base);
    expect(result.summary.health).toBe('not_enough_data');
  });
});

// ─── Full allocation ──────────────────────────────────────────────────────────

describe('runPlanner — full allocation', () => {
  it('allocates the full amount when cash is sufficient', () => {
    const result = runPlanner({ ...base, occurrences: [occ('o1')] });
    expect(result.allocations[0].plannedAmountMinor).toBe(5_000);
    expect(result.allocations[0].allocationType).toBe('required');
    expect(result.shortfalls).toHaveLength(0);
    expect(result.summary.health).toBe('on_track');
  });

  it('includes fees in the allocated amount', () => {
    const result = runPlanner({
      ...base,
      occurrences: [occ('o1', { dueAmountMinor: 5_000, feeAmountMinor: 500 })],
    });
    expect(result.allocations[0].plannedAmountMinor).toBe(5_500);
    expect(result.summary.totalPlannedMinor).toBe(5_500);
  });

  it('balance invariant: opening + inflows - outflows = closing per day', () => {
    const result = runPlanner({
      ...base,
      occurrences: [occ('o1')],
      incomeEvents: [{ id: 'i1', expectedDate: '2026-07-02', amountMinor: 3_000, status: 'received' }],
    });
    for (const pt of result.timeline) {
      expect(pt.openingBalanceMinor + pt.inflowsMinor - pt.outflowsMinor).toBe(
        pt.closingBalanceMinor
      );
    }
  });

  it('skips already-paid occurrences', () => {
    const result = runPlanner({
      ...base,
      occurrences: [occ('o1', { status: 'paid', paidAmountMinor: 5_000 })],
    });
    expect(result.allocations).toHaveLength(0);
  });

  it('skips waived occurrences', () => {
    const result = runPlanner({
      ...base,
      occurrences: [occ('o1', { status: 'waived' })],
    });
    expect(result.allocations).toHaveLength(0);
  });

  it('skips cancelled occurrences', () => {
    const result = runPlanner({
      ...base,
      occurrences: [occ('o1', { status: 'cancelled' })],
    });
    expect(result.allocations).toHaveLength(0);
  });

  it('skips occurrences with zero remaining balance', () => {
    const result = runPlanner({
      ...base,
      occurrences: [occ('o1', { dueAmountMinor: 5_000, paidAmountMinor: 5_000, status: 'partially_paid' })],
    });
    expect(result.allocations).toHaveLength(0);
  });
});

// ─── Shortfall detection ──────────────────────────────────────────────────────

describe('runPlanner — shortfall detection', () => {
  it('records a shortfall when cash is insufficient', () => {
    const result = runPlanner({
      ...base,
      openingCashMinor: 3_000,
      occurrences: [occ('o1', { dueAmountMinor: 5_000 })],
    });
    expect(result.shortfalls).toHaveLength(1);
    expect(result.shortfalls[0].shortfallAmountMinor).toBe(2_000);
    expect(result.summary.health).toBe('shortfall');
  });

  it('respects minimum cash buffer when checking available cash', () => {
    const result = runPlanner({
      ...base,
      openingCashMinor: 10_000,
      minimumCashBufferMinor: 7_000,
      occurrences: [occ('o1', { dueAmountMinor: 5_000 })],
    });
    // Available = 10000 - 7000 = 3000 < 5000 → shortfall of 2000
    expect(result.shortfalls[0].shortfallAmountMinor).toBe(2_000);
  });

  it('allocates minimum payment when available and records remaining shortfall', () => {
    const result = runPlanner({
      ...base,
      openingCashMinor: 2_000,
      occurrences: [occ('o1', { dueAmountMinor: 5_000, minimumAmountMinor: 1_500 })],
    });
    expect(result.allocations[0].allocationType).toBe('minimum');
    expect(result.allocations[0].plannedAmountMinor).toBe(1_500);
    expect(result.shortfalls[0].shortfallAmountMinor).toBe(3_500);
  });

  it('records partial allocation when below minimum too', () => {
    const result = runPlanner({
      ...base,
      openingCashMinor: 500,
      occurrences: [occ('o1', { dueAmountMinor: 5_000, minimumAmountMinor: 1_000 })],
    });
    // Available = 500, minimum = 1000 → partial of 500
    expect(result.shortfalls[0].shortfallAmountMinor).toBe(4_500);
    const alloc = result.allocations[0];
    expect(alloc?.plannedAmountMinor).toBe(500);
    expect(alloc?.allocationType).toBe('minimum');
  });
});

// ─── Locked allocations ───────────────────────────────────────────────────────

describe('runPlanner — locked allocations', () => {
  it('applies locked allocation at the locked date, not the due date', () => {
    const result = runPlanner({
      ...base,
      occurrences: [occ('o1', { dueDate: '2026-07-01', dueAmountMinor: 5_000 })],
      manualLocks: [{ occurrenceId: 'o1', plannedDate: '2026-07-03', plannedAmountMinor: 5_000 }],
    });
    const alloc = result.allocations.find((a) => a.occurrenceId === 'o1');
    expect(alloc?.plannedDate).toBe('2026-07-03');
    expect(alloc?.manuallyLocked).toBe(true);
    expect(alloc?.allocationType).toBe('manual');
  });

  it('records shortfall and warning when locked amount is less than required', () => {
    const result = runPlanner({
      ...base,
      occurrences: [occ('o1', { dueAmountMinor: 5_000 })],
      manualLocks: [{ occurrenceId: 'o1', plannedDate: '2026-07-01', plannedAmountMinor: 3_000 }],
    });
    expect(result.shortfalls[0].shortfallAmountMinor).toBe(2_000);
    expect(result.warnings.some((w) => w.code === 'LOCKED_ALLOCATION_UNDERFUNDED')).toBe(true);
  });

  it('no shortfall when locked amount equals required total', () => {
    const result = runPlanner({
      ...base,
      occurrences: [occ('o1', { dueAmountMinor: 5_000 })],
      manualLocks: [{ occurrenceId: 'o1', plannedDate: '2026-07-01', plannedAmountMinor: 5_000 }],
    });
    expect(result.shortfalls).toHaveLength(0);
  });
});

// ─── Income handling ──────────────────────────────────────────────────────────

describe('runPlanner — income handling', () => {
  it('adds received income to balance on its date', () => {
    const result = runPlanner({
      ...base,
      openingCashMinor: 0,
      incomeEvents: [{ id: 'i1', expectedDate: '2026-07-01', amountMinor: 10_000, status: 'received' }],
      occurrences: [occ('o1', { dueAmountMinor: 5_000 })],
    });
    expect(result.shortfalls).toHaveLength(0);
    expect(result.allocations[0].plannedAmountMinor).toBe(5_000);
  });

  it('excludes expected income when includeExpectedIncome is false', () => {
    const result = runPlanner({
      ...base,
      openingCashMinor: 0,
      includeExpectedIncome: false,
      incomeEvents: [{ id: 'i1', expectedDate: '2026-07-01', amountMinor: 10_000, status: 'expected' }],
      occurrences: [occ('o1', { dueAmountMinor: 5_000 })],
    });
    expect(result.shortfalls).toHaveLength(1);
  });

  it('includes expected income and emits warning when flag is true', () => {
    const result = runPlanner({
      ...base,
      openingCashMinor: 0,
      includeExpectedIncome: true,
      incomeEvents: [{ id: 'i1', expectedDate: '2026-07-01', amountMinor: 10_000, status: 'expected' }],
      occurrences: [occ('o1', { dueAmountMinor: 5_000 })],
    });
    expect(result.shortfalls).toHaveLength(0);
    expect(result.warnings.some((w) => w.code === 'EXPECTED_INCOME_INCLUDED')).toBe(true);
  });

  it('skips delayed income events', () => {
    const result = runPlanner({
      ...base,
      openingCashMinor: 0,
      includeExpectedIncome: true,
      incomeEvents: [{ id: 'i1', expectedDate: '2026-07-01', amountMinor: 10_000, status: 'delayed' }],
      occurrences: [occ('o1', { dueAmountMinor: 5_000 })],
    });
    expect(result.shortfalls).toHaveLength(1);
  });
});

// ─── Strategy ordering ────────────────────────────────────────────────────────

describe('runPlanner — strategy ordering on same-day conflicts', () => {
  it('deadline_first: allocates essential payment first when same date', () => {
    // Only enough for one payment; essential should win
    const result = runPlanner({
      ...base,
      openingCashMinor: 5_000,
      occurrences: [
        occ('non', { essential: false, dueDate: '2026-07-01', dueAmountMinor: 5_000 }),
        occ('ess', { essential: true, dueDate: '2026-07-01', dueAmountMinor: 5_000 }),
      ],
    });
    const funded = result.allocations.filter((a) => a.allocationType === 'required');
    expect(funded[0].occurrenceId).toBe('ess');
    expect(result.shortfalls.some((s) => s.occurrenceId === 'non')).toBe(true);
  });

  it('essential_first: essential occurrence gets cash before non-essential', () => {
    const result = runPlanner({
      ...base,
      openingCashMinor: 5_000,
      strategy: 'essential_first',
      occurrences: [
        occ('non', { essential: false, dueDate: '2026-07-01', dueAmountMinor: 5_000 }),
        occ('ess', { essential: true, dueDate: '2026-07-01', dueAmountMinor: 5_000 }),
      ],
    });
    const funded = result.allocations.filter((a) => a.allocationType === 'required');
    expect(funded[0].occurrenceId).toBe('ess');
  });

  it('minimums_first: occurrence with minimum defined gets allocated before one without', () => {
    const result = runPlanner({
      ...base,
      openingCashMinor: 1_500,
      strategy: 'minimums_first',
      occurrences: [
        occ('nomin', { dueDate: '2026-07-01', dueAmountMinor: 5_000 }),
        occ('hasmin', { dueDate: '2026-07-01', dueAmountMinor: 5_000, minimumAmountMinor: 1_000 }),
      ],
    });
    // hasmin gets its minimum (1000), nomin gets the remaining 500
    const hasminAlloc = result.allocations.find((a) => a.occurrenceId === 'hasmin');
    expect(hasminAlloc?.plannedAmountMinor).toBe(1_000);
    expect(hasminAlloc?.allocationType).toBe('minimum');
  });
});

// ─── Summary ──────────────────────────────────────────────────────────────────

describe('runPlanner — summary', () => {
  it('reports fully funded and underfunded counts', () => {
    const result = runPlanner({
      ...base,
      openingCashMinor: 5_000,
      occurrences: [
        occ('o1', { dueDate: '2026-07-01', dueAmountMinor: 5_000 }),
        occ('o2', { dueDate: '2026-07-02', dueAmountMinor: 5_000 }),
      ],
    });
    expect(result.summary.fullyFundedCount).toBe(1);
    expect(result.summary.underfundedCount).toBe(1);
    expect(result.summary.shortfallCount).toBe(1);
  });

  it('reports earliest shortfall date', () => {
    const result = runPlanner({
      ...base,
      openingCashMinor: 0,
      occurrences: [
        occ('o1', { dueDate: '2026-07-01', dueAmountMinor: 5_000 }),
        occ('o2', { dueDate: '2026-07-03', dueAmountMinor: 5_000 }),
      ],
    });
    expect(result.summary.earliestShortfallDate).toBe('2026-07-01');
  });

  it('tracks lowest cash balance across the period', () => {
    const result = runPlanner({
      ...base,
      openingCashMinor: 10_000,
      occurrences: [occ('o1', { dueDate: '2026-07-01', dueAmountMinor: 9_000 })],
      incomeEvents: [{ id: 'i1', expectedDate: '2026-07-05', amountMinor: 5_000, status: 'received' }],
    });
    // After paying 9000 on July 1, balance is 1000 (lowest)
    expect(result.summary.lowestCashBalanceMinor).toBe(1_000);
  });

  it('estimates total planned amount', () => {
    const result = runPlanner({
      ...base,
      occurrences: [
        occ('o1', { dueAmountMinor: 3_000 }),
        occ('o2', { dueDate: '2026-07-02', dueAmountMinor: 2_000 }),
      ],
    });
    expect(result.summary.totalPlannedMinor).toBe(5_000);
  });

  it('emits estimate warning for estimated amounts', () => {
    const result = runPlanner({
      ...base,
      occurrences: [occ('o1', { amountIsEstimate: true })],
    });
    expect(result.warnings.some((w) => w.code === 'ESTIMATE_AMOUNT')).toBe(true);
  });
});
