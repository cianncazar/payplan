/**
 * Non-compounding daily service fee estimate (spec §12.5).
 * serviceFee = principal × (dailyRate / 100) × chargeableDays
 * Do not use for compounding or declining-balance fee structures.
 */
export function estimateDailyFee(
  principalMinor: number,
  dailyRatePercent: number,
  chargeableDays: number
): number {
  if (dailyRatePercent <= 0 || chargeableDays <= 0) return 0;
  return Math.round(principalMinor * (dailyRatePercent / 100) * chargeableDays);
}

/**
 * Remaining amount owed on a payment occurrence (spec §12.1).
 * remaining = max(0, due - paid - waived)
 */
export function remainingAmount(
  dueAmountMinor: number,
  paidAmountMinor: number,
  waivedAmountMinor = 0
): number {
  return Math.max(0, dueAmountMinor - paidAmountMinor - waivedAmountMinor);
}
