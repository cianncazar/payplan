import { describe, it, expect } from 'vitest';
import { computeShortfallSummary } from '@/lib/calculations/shortfall-summary';
import type { ShortfallSummaryInput } from '@/lib/calculations/shortfall-summary';

const TODAY = '2026-06-17';

function base(): ShortfallSummaryInput {
  return {
    todayIso: TODAY,
    horizonDays: 7,
    openingCashMinor: 0,
    minimumCashBufferMinor: 0,
    occurrences: [],
    incomeEvents: [],
    allowanceReservations: [],
  };
}

describe('computeShortfallSummary', () => {
  it('returns not_enough_data when cash and occurrences are empty', () => {
    const result = computeShortfallSummary(base());
    expect(result.health).toBe('not_enough_data');
    expect(result.gapMinor).toBe(0);
    expect(result.firstShortfallDate).toBeNull();
    expect(result.coversThroughDate).toBeNull();
  });

  it('returns on_track when cash covers all payments', () => {
    const result = computeShortfallSummary({
      ...base(),
      openingCashMinor: 50_000_00, // ₱50,000
      occurrences: [
        {
          occurrenceId: 'occ-1',
          paymentName: 'Rent',
          dueDate: '2026-06-20',
          requiredAmountMinor: 8_000_00,
          feeAmountMinor: 0,
          amountIsEstimate: false,
        },
      ],
    });
    expect(result.health).toBe('on_track');
    expect(result.gapMinor).toBe(0);
    expect(result.firstShortfallDate).toBeNull();
    expect(result.lowestBalanceMinor).toBeLessThan(50_000_00);
  });

  it('returns shortfall when payment exceeds available cash', () => {
    const result = computeShortfallSummary({
      ...base(),
      openingCashMinor: 1_000_00, // ₱1,000
      occurrences: [
        {
          occurrenceId: 'occ-2',
          paymentName: 'Meralco',
          dueDate: '2026-06-19',
          requiredAmountMinor: 5_000_00, // ₱5,000 — more than available
          feeAmountMinor: 0,
          amountIsEstimate: false,
        },
      ],
    });
    expect(result.health).toBe('shortfall');
    expect(result.gapMinor).toBeGreaterThan(0);
    expect(result.firstShortfallDate).toBe('2026-06-19');
  });

  it('returns tight when lowest balance falls to within 10% of buffer', () => {
    const result = computeShortfallSummary({
      ...base(),
      openingCashMinor: 5_100_00, // ₱5,100 — just above buffer
      minimumCashBufferMinor: 5_000_00, // ₱5,000 buffer
      occurrences: [
        {
          occurrenceId: 'occ-3',
          paymentName: 'Subscription',
          dueDate: '2026-06-18',
          // 100 centavos — won't cause shortfall but will bring balance to exactly the buffer
          requiredAmountMinor: 100_00,
          feeAmountMinor: 0,
          amountIsEstimate: false,
        },
      ],
    });
    // After payment: ₱5,100 - ₱100 = ₱5,000 — exactly at buffer, which is ≤ 1.1 * buffer
    expect(result.health).toBe('tight');
    expect(result.gapMinor).toBe(0);
    expect(result.firstShortfallDate).toBeNull();
  });

  it('sums all shortfall amounts when multiple payments fail', () => {
    const result = computeShortfallSummary({
      ...base(),
      openingCashMinor: 1_000_00, // ₱1,000
      occurrences: [
        {
          occurrenceId: 'occ-4',
          paymentName: 'Bill A',
          dueDate: '2026-06-18',
          requiredAmountMinor: 3_000_00,
          feeAmountMinor: 0,
          amountIsEstimate: false,
        },
        {
          occurrenceId: 'occ-5',
          paymentName: 'Bill B',
          dueDate: '2026-06-20',
          requiredAmountMinor: 2_000_00,
          feeAmountMinor: 0,
          amountIsEstimate: false,
        },
      ],
    });
    expect(result.health).toBe('shortfall');
    expect(result.gapMinor).toBeGreaterThan(0);
  });

  it('includes income events in the projection', () => {
    // Without income: shortfall. With payday income: on_track.
    const withoutIncome = computeShortfallSummary({
      ...base(),
      openingCashMinor: 500_00,
      occurrences: [
        {
          occurrenceId: 'occ-6',
          paymentName: 'Rent',
          dueDate: '2026-06-20',
          requiredAmountMinor: 8_000_00,
          feeAmountMinor: 0,
          amountIsEstimate: false,
        },
      ],
    });
    expect(withoutIncome.health).toBe('shortfall');

    const withIncome = computeShortfallSummary({
      ...base(),
      openingCashMinor: 500_00,
      occurrences: [
        {
          occurrenceId: 'occ-6',
          paymentName: 'Rent',
          dueDate: '2026-06-20',
          requiredAmountMinor: 8_000_00,
          feeAmountMinor: 0,
          amountIsEstimate: false,
        },
      ],
      incomeEvents: [
        {
          id: 'income-1',
          date: '2026-06-19',
          amountMinor: 17_500_00,
          isReceived: false,
          label: 'Salary',
        },
      ],
    });
    expect(withIncome.health).toBe('on_track');
  });
});
