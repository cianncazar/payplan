import type { PaymentObligation } from '@/types';
import { expandRecurrence } from './recurrence';
import {
  calculateAmortizingPayment,
  calculateZeroInterestInstallments,
  amortizingPaymentSplit,
} from './installments';
import { addMonthsToYearMonth, formatISODate, parseISODate } from '@/lib/dates';

export type OccurrencePreview = {
  sequenceNumber: number;
  dueDate: string;
  dueAmountMinor: number;
  principalAmountMinor?: number;
  interestAmountMinor?: number;
  feeAmountMinor: number;
  amountIsEstimate: boolean;
};

/**
 * Default preview horizon: 18 months from fromDate.
 */
function horizonEnd(fromDate: string): string {
  const from = parseISODate(fromDate);
  const [y, m] = addMonthsToYearMonth(from.getFullYear(), from.getMonth() + 1, 18);
  return `${y}-${String(m).padStart(2, '0')}-28`;
}

/**
 * Generate a preview of payment occurrences within [fromDate, toDate].
 * Pure function — no side effects. Custom schedules return [] (handled by caller).
 */
export function generateOccurrencePreviews(
  payment: PaymentObligation,
  fromDate: string,
  toDate?: string
): OccurrencePreview[] {
  const endDate = toDate ?? horizonEnd(fromDate);

  switch (payment.structure) {
    case 'one_time':
      return genOneTime(payment);
    case 'fixed_recurring':
      return genFixedRecurring(payment, fromDate, endDate);
    case 'variable_recurring':
      return genVariableRecurring(payment, fromDate, endDate);
    case 'fixed_installment':
      return genFixedInstallment(payment, fromDate, endDate);
    case 'amortizing_loan':
      return genAmortizingLoan(payment, fromDate, endDate);
    case 'revolving_credit':
      return genRevolvingCredit(payment);
    case 'no_interest_borrowing':
      return genNoInterestBorrowing(payment, fromDate, endDate);
    case 'custom_schedule':
      return [];
  }
}

function genOneTime(p: PaymentObligation): OccurrencePreview[] {
  const dueDate = p.firstDueDate ?? p.startDate;
  if (!dueDate) return [];
  return [
    {
      sequenceNumber: 0,
      dueDate,
      dueAmountMinor: p.statedInstallmentMinor ?? p.originalAmountMinor ?? 0,
      feeAmountMinor: p.upfrontFeeMinor ?? 0,
      amountIsEstimate: false,
    },
  ];
}

function genFixedRecurring(
  p: PaymentObligation,
  fromDate: string,
  toDate: string
): OccurrencePreview[] {
  if (!p.recurrence || !p.firstDueDate) return [];
  const dates = expandRecurrence(p.recurrence, p.firstDueDate, toDate).filter(
    (d) => d >= fromDate
  );
  return dates.map((date, i) => ({
    sequenceNumber: i,
    dueDate: date,
    dueAmountMinor: p.statedInstallmentMinor ?? 0,
    feeAmountMinor: 0,
    amountIsEstimate: false,
  }));
}

function genVariableRecurring(
  p: PaymentObligation,
  fromDate: string,
  toDate: string
): OccurrencePreview[] {
  if (!p.recurrence || !p.firstDueDate) return [];
  const dates = expandRecurrence(p.recurrence, p.firstDueDate, toDate).filter(
    (d) => d >= fromDate
  );
  return dates.map((date, i) => ({
    sequenceNumber: i,
    dueDate: date,
    dueAmountMinor: p.statedInstallmentMinor ?? 0,
    feeAmountMinor: 0,
    amountIsEstimate: true,
  }));
}

function genFixedInstallment(
  p: PaymentObligation,
  fromDate: string,
  toDate: string
): OccurrencePreview[] {
  if (!p.recurrence || !p.firstDueDate) return [];
  const count = p.installmentCount ?? 1;
  const allDates = expandRecurrence(p.recurrence, p.firstDueDate, toDate);
  const dates = allDates.slice(0, count).filter((d) => d >= fromDate);
  const installmentAmount = p.statedInstallmentMinor ?? 0;
  return dates.map((date, i) => ({
    sequenceNumber: i,
    dueDate: date,
    dueAmountMinor: installmentAmount,
    feeAmountMinor: i === 0 ? (p.upfrontFeeMinor ?? 0) : 0,
    amountIsEstimate: false,
  }));
}

function genAmortizingLoan(
  p: PaymentObligation,
  fromDate: string,
  toDate: string
): OccurrencePreview[] {
  if (!p.recurrence || !p.firstDueDate) return [];
  const count = p.installmentCount ?? 12;
  const principal = p.originalAmountMinor ?? p.currentBalanceMinor ?? 0;
  const rate = p.annualInterestRate ? parseFloat(p.annualInterestRate) : 0;
  const allDates = expandRecurrence(p.recurrence, p.firstDueDate, toDate);
  const dates = allDates.slice(0, count).filter((d) => d >= fromDate);
  const periodicPayment = calculateAmortizingPayment(principal, rate, count);

  return dates.map((date, i) => {
    const { principalMinor, interestMinor } =
      rate > 0
        ? amortizingPaymentSplit(principal, rate, count, i)
        : { principalMinor: periodicPayment, interestMinor: 0 };
    return {
      sequenceNumber: i,
      dueDate: date,
      dueAmountMinor: periodicPayment,
      principalAmountMinor: rate > 0 ? principalMinor : undefined,
      interestAmountMinor: rate > 0 ? interestMinor : undefined,
      feeAmountMinor: i === 0 ? (p.upfrontFeeMinor ?? 0) : 0,
      amountIsEstimate: true,
    };
  });
}

function genRevolvingCredit(p: PaymentObligation): OccurrencePreview[] {
  const dueDate = p.firstDueDate;
  if (!dueDate) return [];
  return [
    {
      sequenceNumber: 0,
      dueDate,
      dueAmountMinor: p.minimumPaymentMinor ?? 0,
      feeAmountMinor: 0,
      amountIsEstimate: false,
    },
  ];
}

function genNoInterestBorrowing(
  p: PaymentObligation,
  fromDate: string,
  toDate: string
): OccurrencePreview[] {
  if (!p.recurrence || !p.firstDueDate) return [];
  const count = p.installmentCount ?? 1;
  const principal = p.originalAmountMinor ?? 0;
  const allDates = expandRecurrence(p.recurrence, p.firstDueDate, toDate);
  const dates = allDates.slice(0, count).filter((d) => d >= fromDate);
  const amounts =
    p.statedInstallmentMinor && p.statedInstallmentMinor > 0
      ? Array(dates.length).fill(p.statedInstallmentMinor) as number[]
      : calculateZeroInterestInstallments(principal, count).slice(0, dates.length);

  return dates.map((date, i) => ({
    sequenceNumber: i,
    dueDate: date,
    dueAmountMinor: amounts[i] ?? 0,
    feeAmountMinor: 0,
    amountIsEstimate: false,
  }));
}

/**
 * Today's date as YYYY-MM-DD (for use as the default `fromDate`).
 */
export function today(): string {
  return formatISODate(new Date());
}
