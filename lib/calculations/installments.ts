import { allocateInstallments } from '@/lib/money';

/**
 * Standard PMT formula for an amortizing loan.
 * Returns the periodic payment amount in the same minor units as `principalMinor`.
 * When rate is 0, returns principal ÷ term (zero-interest).
 * Always labeled as an estimate per spec §12.3–12.4.
 */
export function calculateAmortizingPayment(
  principalMinor: number,
  annualRatePercent: number,
  termPayments: number
): number {
  if (termPayments <= 0) return 0;
  if (annualRatePercent === 0) {
    return Math.round(principalMinor / termPayments);
  }
  const r = annualRatePercent / 100 / 12;
  const pow = Math.pow(1 + r, termPayments);
  return Math.round((principalMinor * r * pow) / (pow - 1));
}

/**
 * Generate equal zero-interest installments.
 * The last installment absorbs any rounding remainder per spec §12.2.
 */
export function calculateZeroInterestInstallments(
  principalMinor: number,
  count: number
): number[] {
  return allocateInstallments(principalMinor, count);
}

/**
 * Estimate remaining balance on an amortizing loan after `paymentsMade` payments.
 */
export function calculateRemainingBalance(
  principalMinor: number,
  annualRatePercent: number,
  termPayments: number,
  paymentsMade: number
): number {
  if (paymentsMade <= 0) return principalMinor;
  if (paymentsMade >= termPayments) return 0;

  if (annualRatePercent === 0) {
    const installments = calculateZeroInterestInstallments(principalMinor, termPayments);
    const paid = installments.slice(0, paymentsMade).reduce((s, v) => s + v, 0);
    return Math.max(0, principalMinor - paid);
  }

  const r = annualRatePercent / 100 / 12;
  const pmt = calculateAmortizingPayment(principalMinor, annualRatePercent, termPayments);
  const balance =
    principalMinor * Math.pow(1 + r, paymentsMade) -
    pmt * ((Math.pow(1 + r, paymentsMade) - 1) / r);
  return Math.max(0, Math.round(balance));
}

/**
 * Estimate the interest component of a specific payment on an amortizing loan.
 * Returns {principal, interest} both in minor units.
 */
export function amortizingPaymentSplit(
  originalPrincipalMinor: number,
  annualRatePercent: number,
  termPayments: number,
  paymentIndex: number // 0-based
): { principalMinor: number; interestMinor: number } {
  const pmt = calculateAmortizingPayment(originalPrincipalMinor, annualRatePercent, termPayments);
  if (annualRatePercent === 0) {
    return { principalMinor: pmt, interestMinor: 0 };
  }
  const balanceBefore = calculateRemainingBalance(
    originalPrincipalMinor,
    annualRatePercent,
    termPayments,
    paymentIndex
  );
  const r = annualRatePercent / 100 / 12;
  const interestMinor = Math.round(balanceBefore * r);
  const principalMinor = Math.max(0, pmt - interestMinor);
  return { principalMinor, interestMinor };
}

/**
 * Estimated financing cost for a fixed installment plan (spec §12.3).
 * total scheduled + upfront fees - principal = estimated cost.
 */
export function estimateFixedInstallmentCost(
  installmentMinor: number,
  count: number,
  principalMinor: number,
  upfrontFeeMinor: number
): number {
  return Math.max(0, installmentMinor * count + upfrontFeeMinor - principalMinor);
}
