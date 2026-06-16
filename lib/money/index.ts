/**
 * Convert a major-unit value (e.g. 12.50) to integer minor units (centavos, 1250).
 * Uses Math.round to neutralise floating-point drift.
 */
export function convertMajorToMinor(major: number): number {
  return Math.round(major * 100);
}

export function convertMinorToMajor(minor: number): number {
  return minor / 100;
}

/**
 * Parse a user-entered money string to a major-unit float.
 * Strips currency symbols, commas, and spaces. Returns null if unparseable.
 */
export function parseMoneyInput(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.\-]/g, '').trim();
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  const value = parseFloat(cleaned);
  if (!isFinite(value)) return null;
  return value;
}

/**
 * Parse a user-entered money string to integer minor units.
 * Returns null if the string cannot be parsed as a valid amount.
 */
export function toMinorUnits(raw: string): number | null {
  const major = parseMoneyInput(raw);
  if (major === null) return null;
  return convertMajorToMinor(major);
}

/**
 * Format minor units as a localized currency string (e.g. "₱1,250.50").
 */
export function formatMoney(
  minor: number,
  currency = 'PHP',
  locale = 'en-PH'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(convertMinorToMajor(minor));
}

/**
 * Format minor units without the currency symbol (e.g. "1,250.50").
 */
export function formatMoneyPlain(minor: number, locale = 'en-PH'): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(convertMinorToMajor(minor));
}

export function addMoney(a: number, b: number): number {
  return a + b;
}

export function subtractMoney(a: number, b: number): number {
  return a - b;
}

export function multiplyMoney(minor: number, factor: number): number {
  return Math.round(minor * factor);
}

export function divideMoney(minor: number, divisor: number): number {
  return Math.round(minor / divisor);
}

/**
 * Split `totalMinor` into `count` equal integer installments.
 * Any rounding remainder is added to the final installment per spec §12.2.
 */
export function allocateInstallments(totalMinor: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(totalMinor / count);
  const remainder = totalMinor - base * count;
  const result = Array<number>(count).fill(base);
  result[count - 1] += remainder;
  return result;
}
