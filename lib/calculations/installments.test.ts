import { describe, it, expect } from 'vitest';
import {
  calculateAmortizingPayment,
  calculateZeroInterestInstallments,
  calculateRemainingBalance,
  amortizingPaymentSplit,
  estimateFixedInstallmentCost,
} from './installments';

describe('calculateAmortizingPayment', () => {
  it('returns 0 for zero or negative term', () => {
    expect(calculateAmortizingPayment(10000, 5, 0)).toBe(0);
    expect(calculateAmortizingPayment(10000, 5, -1)).toBe(0);
  });

  it('handles zero interest as simple division', () => {
    expect(calculateAmortizingPayment(12000, 0, 12)).toBe(1000);
    expect(calculateAmortizingPayment(10000, 0, 3)).toBe(3333);
  });

  it('applies standard PMT formula for non-zero rate', () => {
    // ₱100,000 at 12% annual (1%/month) over 12 months → ~₱8,885 = ~888,490 centavos
    const pmt = calculateAmortizingPayment(100_000_00, 12, 12);
    expect(pmt).toBeGreaterThan(880_000);
    expect(pmt).toBeLessThan(900_000);
  });

  it('computes a known value: $1000 at 6% annual over 12 months', () => {
    // PMT = 1000 * (0.005 * 1.005^12) / (1.005^12 - 1) ≈ 86.07
    const pmt = calculateAmortizingPayment(100000, 6, 12);
    expect(pmt).toBe(8607);
  });
});

describe('calculateZeroInterestInstallments', () => {
  it('splits evenly and adds remainder to last', () => {
    expect(calculateZeroInterestInstallments(10000, 3)).toEqual([3333, 3333, 3334]);
    expect(calculateZeroInterestInstallments(12000, 4)).toEqual([3000, 3000, 3000, 3000]);
  });

  it('sum equals principal', () => {
    const result = calculateZeroInterestInstallments(9999, 7);
    expect(result.reduce((a, b) => a + b, 0)).toBe(9999);
  });
});

describe('calculateRemainingBalance', () => {
  it('returns principal when no payments made', () => {
    expect(calculateRemainingBalance(100000, 0, 12, 0)).toBe(100000);
  });

  it('returns 0 when all payments made', () => {
    expect(calculateRemainingBalance(100000, 0, 12, 12)).toBe(0);
    expect(calculateRemainingBalance(100000, 12, 12, 12)).toBe(0);
  });

  it('decreases with each zero-interest payment', () => {
    const b1 = calculateRemainingBalance(9000, 0, 3, 1);
    const b2 = calculateRemainingBalance(9000, 0, 3, 2);
    expect(b1).toBe(6000);
    expect(b2).toBe(3000);
  });

  it('decreases with each amortizing payment', () => {
    const b0 = calculateRemainingBalance(100000, 12, 12, 0);
    const b1 = calculateRemainingBalance(100000, 12, 12, 1);
    const b12 = calculateRemainingBalance(100000, 12, 12, 12);
    expect(b0).toBe(100000);
    expect(b1).toBeLessThan(b0);
    expect(b12).toBe(0);
  });
});

describe('amortizingPaymentSplit', () => {
  it('zero-interest: all principal, no interest', () => {
    const split = amortizingPaymentSplit(12000, 0, 3, 0);
    expect(split.interestMinor).toBe(0);
    expect(split.principalMinor).toBe(4000);
  });

  it('interest component decreases over time for amortizing loan', () => {
    const s0 = amortizingPaymentSplit(100000, 12, 12, 0);
    const s6 = amortizingPaymentSplit(100000, 12, 12, 6);
    expect(s0.interestMinor).toBeGreaterThan(s6.interestMinor);
    expect(s0.principalMinor).toBeLessThan(s6.principalMinor);
  });

  it('principal + interest = PMT', () => {
    const pmt = calculateAmortizingPayment(100000, 12, 12);
    const split = amortizingPaymentSplit(100000, 12, 12, 3);
    expect(split.principalMinor + split.interestMinor).toBe(pmt);
  });
});

describe('estimateFixedInstallmentCost', () => {
  it('computes total financing cost', () => {
    // 12 × 1000 + 500 upfront - 10000 principal = 2500
    expect(estimateFixedInstallmentCost(1000, 12, 10000, 500)).toBe(2500);
  });

  it('returns 0 when installments cover only the principal', () => {
    expect(estimateFixedInstallmentCost(1000, 10, 10000, 0)).toBe(0);
  });

  it('returns 0 when total is less than principal (no-fee cases)', () => {
    expect(estimateFixedInstallmentCost(800, 10, 10000, 0)).toBe(0);
  });
});
