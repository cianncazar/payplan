import { describe, it, expect } from 'vitest';
import { estimateDailyFee, remainingAmount } from './fees';

describe('estimateDailyFee', () => {
  it('computes principal × rate × days', () => {
    // ₱1,000 (100,000 centavos) at 1%/day for 30 days = ₱300 (30,000 centavos)
    expect(estimateDailyFee(100_000, 1, 30)).toBe(30_000);
  });

  it('rounds fractional centavos', () => {
    // 100 × (0.5/100) × 3 = 1.5 → rounds to 2
    expect(estimateDailyFee(100, 0.5, 3)).toBe(2);
  });

  it('returns 0 for zero rate', () => {
    expect(estimateDailyFee(100_000, 0, 30)).toBe(0);
  });

  it('returns 0 for negative rate', () => {
    expect(estimateDailyFee(100_000, -1, 30)).toBe(0);
  });

  it('returns 0 for zero days', () => {
    expect(estimateDailyFee(100_000, 1, 0)).toBe(0);
  });

  it('returns 0 for negative days', () => {
    expect(estimateDailyFee(100_000, 1, -5)).toBe(0);
  });
});

describe('remainingAmount', () => {
  it('returns due minus paid', () => {
    expect(remainingAmount(10_000, 3_000)).toBe(7_000);
  });

  it('returns full amount when nothing paid', () => {
    expect(remainingAmount(10_000, 0)).toBe(10_000);
  });

  it('clamps to zero when overpaid', () => {
    expect(remainingAmount(10_000, 15_000)).toBe(0);
  });

  it('returns zero when exactly paid', () => {
    expect(remainingAmount(10_000, 10_000)).toBe(0);
  });

  it('deducts waived amount', () => {
    expect(remainingAmount(10_000, 3_000, 2_000)).toBe(5_000);
  });

  it('clamps to zero when paid plus waived exceeds due', () => {
    expect(remainingAmount(5_000, 4_000, 2_000)).toBe(0);
  });
});
