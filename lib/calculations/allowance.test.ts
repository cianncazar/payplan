import { describe, it, expect } from 'vitest';
import {
  remainingAllowance,
  recommendedDailyAmount,
  countInclusiveDays,
  reserveAllowanceForDays,
} from './allowance';

describe('remainingAllowance', () => {
  it('returns total minus spent', () => {
    expect(remainingAllowance(10000, 3000)).toBe(7000);
  });

  it('returns full budget when nothing spent', () => {
    expect(remainingAllowance(10000, 0)).toBe(10000);
  });

  it('clamps to zero when overspent', () => {
    expect(remainingAllowance(5000, 8000)).toBe(0);
  });

  it('returns zero when exactly spent', () => {
    expect(remainingAllowance(5000, 5000)).toBe(0);
  });
});

describe('recommendedDailyAmount', () => {
  it('divides remaining by days', () => {
    expect(recommendedDailyAmount(7000, 7)).toBe(1000);
  });

  it('floors fractional result to avoid overshooting', () => {
    // 10000 / 3 = 3333.33 → 3333 (3 × 3333 = 9999 ≤ 10000)
    expect(recommendedDailyAmount(10000, 3)).toBe(3333);
  });

  it('returns 0 for zero days', () => {
    expect(recommendedDailyAmount(5000, 0)).toBe(0);
  });

  it('returns 0 for negative days', () => {
    expect(recommendedDailyAmount(5000, -1)).toBe(0);
  });

  it('returns 0 when remaining is 0', () => {
    expect(recommendedDailyAmount(0, 7)).toBe(0);
  });
});

describe('countInclusiveDays', () => {
  it('same day is 1', () => {
    expect(countInclusiveDays('2026-07-01', '2026-07-01')).toBe(1);
  });

  it('consecutive days is 2', () => {
    expect(countInclusiveDays('2026-07-01', '2026-07-02')).toBe(2);
  });

  it('full month of June is 30', () => {
    expect(countInclusiveDays('2026-06-01', '2026-06-30')).toBe(30);
  });

  it('full month of July is 31', () => {
    expect(countInclusiveDays('2026-07-01', '2026-07-31')).toBe(31);
  });

  it('returns 0 when end is before start', () => {
    expect(countInclusiveDays('2026-07-05', '2026-07-01')).toBe(0);
  });

  it('crosses month boundary', () => {
    expect(countInclusiveDays('2026-06-28', '2026-07-03')).toBe(6);
  });
});

describe('reserveAllowanceForDays', () => {
  it('multiplies daily rate by days', () => {
    expect(reserveAllowanceForDays(1000, 7)).toBe(7000);
  });

  it('returns 0 for zero days', () => {
    expect(reserveAllowanceForDays(1000, 0)).toBe(0);
  });

  it('returns 0 for negative days', () => {
    expect(reserveAllowanceForDays(1000, -3)).toBe(0);
  });

  it('returns 0 when daily amount is 0', () => {
    expect(reserveAllowanceForDays(0, 7)).toBe(0);
  });
});
