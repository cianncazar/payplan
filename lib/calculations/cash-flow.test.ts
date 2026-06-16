import { describe, it, expect } from 'vitest';
import { allocatableCash, projectCashFlow } from './cash-flow';
import type { CashFlowInput } from './cash-flow';

// ─── allocatableCash ──────────────────────────────────────────────────────────

describe('allocatableCash', () => {
  it('returns balance minus buffer', () => {
    expect(allocatableCash(10_000, 2_000)).toBe(8_000);
  });

  it('deducts external allowance reservation', () => {
    expect(allocatableCash(10_000, 2_000, 3_000)).toBe(5_000);
  });

  it('never returns negative', () => {
    expect(allocatableCash(1_000, 5_000)).toBe(0);
  });

  it('zero buffer returns full balance', () => {
    expect(allocatableCash(8_000, 0)).toBe(8_000);
  });

  it('zero balance always returns 0', () => {
    expect(allocatableCash(0, 0)).toBe(0);
  });
});

// ─── projectCashFlow helpers ──────────────────────────────────────────────────

const baseInput: CashFlowInput = {
  periodStart: '2026-07-01',
  periodEnd: '2026-07-03',
  openingCashMinor: 10_000,
  minimumCashBufferMinor: 0,
  incomeEvents: [],
  occurrences: [],
  allowanceReservations: [],
  manualAdjustments: [],
  includeExpectedIncome: false,
};

// ─── projectCashFlow ──────────────────────────────────────────────────────────

describe('projectCashFlow', () => {
  it('produces one timeline entry per day', () => {
    const result = projectCashFlow(baseInput);
    expect(result.timeline).toHaveLength(3);
    expect(result.timeline.map((d) => d.date)).toEqual([
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
    ]);
  });

  it('flat timeline when no events', () => {
    const result = projectCashFlow(baseInput);
    expect(result.closingCashMinor).toBe(10_000);
    expect(result.shortfalls).toHaveLength(0);
    expect(result.timeline[0].openingBalanceMinor).toBe(10_000);
    expect(result.timeline[2].closingBalanceMinor).toBe(10_000);
  });

  it('adds received income to balance on its date', () => {
    const result = projectCashFlow({
      ...baseInput,
      incomeEvents: [
        {
          id: 'i1',
          date: '2026-07-02',
          amountMinor: 5_000,
          isReceived: true,
          label: 'Salary',
        },
      ],
    });
    expect(result.timeline[1].inflowsMinor).toBe(5_000);
    expect(result.timeline[1].closingBalanceMinor).toBe(15_000);
    expect(result.closingCashMinor).toBe(15_000);
  });

  it('excludes expected income when flag is false', () => {
    const result = projectCashFlow({
      ...baseInput,
      includeExpectedIncome: false,
      incomeEvents: [
        {
          id: 'i1',
          date: '2026-07-02',
          amountMinor: 5_000,
          isReceived: false,
          label: 'Expected bonus',
        },
      ],
    });
    expect(result.closingCashMinor).toBe(10_000);
    expect(result.warnings).toHaveLength(0);
  });

  it('includes expected income when flag is true and adds warning', () => {
    const result = projectCashFlow({
      ...baseInput,
      includeExpectedIncome: true,
      incomeEvents: [
        {
          id: 'i1',
          date: '2026-07-01',
          amountMinor: 5_000,
          isReceived: false,
          label: 'Expected bonus',
        },
      ],
    });
    expect(result.closingCashMinor).toBe(15_000);
    expect(result.warnings.some((w) => w.code === 'EXPECTED_INCOME_INCLUDED')).toBe(true);
  });

  it('deducts daily allowance each day', () => {
    const result = projectCashFlow({
      ...baseInput,
      allowanceReservations: [
        {
          budgetId: 'b1',
          startDate: '2026-07-01',
          endDate: '2026-07-03',
          dailyAmountMinor: 500,
        },
      ],
    });
    // 3 days × 500 = 1500 deducted
    expect(result.closingCashMinor).toBe(8_500);
    expect(result.timeline[0].outflowsMinor).toBe(500);
  });

  it('only reserves allowance within the reservation date range', () => {
    const result = projectCashFlow({
      ...baseInput,
      allowanceReservations: [
        {
          budgetId: 'b1',
          startDate: '2026-07-02',
          endDate: '2026-07-02',
          dailyAmountMinor: 500,
        },
      ],
    });
    // Only 1 day deducted
    expect(result.closingCashMinor).toBe(9_500);
  });

  it('deducts payment on its due date', () => {
    const result = projectCashFlow({
      ...baseInput,
      occurrences: [
        {
          occurrenceId: 'o1',
          paymentName: 'Rent',
          dueDate: '2026-07-02',
          requiredAmountMinor: 8_000,
          feeAmountMinor: 0,
          amountIsEstimate: false,
        },
      ],
    });
    expect(result.timeline[1].outflowsMinor).toBe(8_000);
    expect(result.closingCashMinor).toBe(2_000);
    expect(result.shortfalls).toHaveLength(0);
  });

  it('includes fee in the outflow', () => {
    const result = projectCashFlow({
      ...baseInput,
      occurrences: [
        {
          occurrenceId: 'o1',
          paymentName: 'Loan',
          dueDate: '2026-07-01',
          requiredAmountMinor: 5_000,
          feeAmountMinor: 500,
          amountIsEstimate: false,
        },
      ],
    });
    expect(result.timeline[0].outflowsMinor).toBe(5_500);
    expect(result.closingCashMinor).toBe(4_500);
  });

  it('detects shortfall when payment exceeds balance', () => {
    const result = projectCashFlow({
      ...baseInput,
      openingCashMinor: 5_000,
      occurrences: [
        {
          occurrenceId: 'o1',
          paymentName: 'Rent',
          dueDate: '2026-07-01',
          requiredAmountMinor: 8_000,
          feeAmountMinor: 0,
          amountIsEstimate: false,
        },
      ],
    });
    expect(result.shortfalls).toHaveLength(1);
    expect(result.shortfalls[0].shortfallAmountMinor).toBe(3_000);
    expect(result.shortfalls[0].occurrenceId).toBe('o1');
  });

  it('respects cash buffer when detecting shortfall', () => {
    const result = projectCashFlow({
      ...baseInput,
      openingCashMinor: 10_000,
      minimumCashBufferMinor: 3_000,
      occurrences: [
        {
          occurrenceId: 'o1',
          paymentName: 'Bill',
          dueDate: '2026-07-01',
          requiredAmountMinor: 8_000,
          feeAmountMinor: 0,
          amountIsEstimate: false,
        },
      ],
    });
    // allocatable = 10000 - 3000 = 7000, need 8000 → shortfall = 1000
    expect(result.shortfalls).toHaveLength(1);
    expect(result.shortfalls[0].shortfallAmountMinor).toBe(1_000);
  });

  it('second payment shortfalls when first uses up available cash', () => {
    const result = projectCashFlow({
      ...baseInput,
      openingCashMinor: 8_000,
      occurrences: [
        {
          occurrenceId: 'o1',
          paymentName: 'Rent',
          dueDate: '2026-07-01',
          requiredAmountMinor: 8_000,
          feeAmountMinor: 0,
          amountIsEstimate: false,
        },
        {
          occurrenceId: 'o2',
          paymentName: 'Electricity',
          dueDate: '2026-07-01',
          requiredAmountMinor: 2_000,
          feeAmountMinor: 0,
          amountIsEstimate: false,
        },
      ],
    });
    // Rent paid in full (8000), then nothing left for electricity
    expect(result.shortfalls).toHaveLength(1);
    expect(result.shortfalls[0].occurrenceId).toBe('o2');
    expect(result.shortfalls[0].shortfallAmountMinor).toBe(2_000);
  });

  it('tracks lowest balance across the period', () => {
    const result = projectCashFlow({
      ...baseInput,
      openingCashMinor: 10_000,
      occurrences: [
        {
          occurrenceId: 'o1',
          paymentName: 'Payment',
          dueDate: '2026-07-01',
          requiredAmountMinor: 9_000,
          feeAmountMinor: 0,
          amountIsEstimate: false,
        },
      ],
      incomeEvents: [
        {
          id: 'i1',
          date: '2026-07-03',
          amountMinor: 5_000,
          isReceived: true,
          label: 'Salary',
        },
      ],
    });
    // Day 1: 10000 - 9000 = 1000 (lowest)
    // Day 2: 1000
    // Day 3: 1000 + 5000 = 6000
    expect(result.lowestCashBalanceMinor).toBe(1_000);
    expect(result.closingCashMinor).toBe(6_000);
  });

  it('adds warning for estimate amounts', () => {
    const result = projectCashFlow({
      ...baseInput,
      occurrences: [
        {
          occurrenceId: 'o1',
          paymentName: 'Electricity',
          dueDate: '2026-07-01',
          requiredAmountMinor: 2_500,
          feeAmountMinor: 0,
          amountIsEstimate: true,
        },
      ],
    });
    expect(result.warnings.some((w) => w.code === 'ESTIMATE_AMOUNT')).toBe(true);
  });

  it('manual inflow adds to balance', () => {
    const result = projectCashFlow({
      ...baseInput,
      manualAdjustments: [
        {
          date: '2026-07-02',
          amountMinor: 3_000,
          direction: 'inflow',
          label: 'Cash advance',
        },
      ],
    });
    expect(result.closingCashMinor).toBe(13_000);
  });

  it('manual outflow reduces balance', () => {
    const result = projectCashFlow({
      ...baseInput,
      manualAdjustments: [
        {
          date: '2026-07-01',
          amountMinor: 2_000,
          direction: 'outflow',
          label: 'Emergency',
        },
      ],
    });
    expect(result.closingCashMinor).toBe(8_000);
  });

  it('timeline satisfies opening + inflows - outflows = closing per day', () => {
    const result = projectCashFlow({
      ...baseInput,
      openingCashMinor: 20_000,
      incomeEvents: [
        {
          id: 'i1',
          date: '2026-07-02',
          amountMinor: 5_000,
          isReceived: true,
          label: 'Income',
        },
      ],
      occurrences: [
        {
          occurrenceId: 'o1',
          paymentName: 'Rent',
          dueDate: '2026-07-01',
          requiredAmountMinor: 8_000,
          feeAmountMinor: 0,
          amountIsEstimate: false,
        },
      ],
      allowanceReservations: [
        {
          budgetId: 'b1',
          startDate: '2026-07-01',
          endDate: '2026-07-03',
          dailyAmountMinor: 300,
        },
      ],
    });
    for (const point of result.timeline) {
      expect(
        point.openingBalanceMinor + point.inflowsMinor - point.outflowsMinor
      ).toBe(point.closingBalanceMinor);
    }
  });
});
