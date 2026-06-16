import { parseISODate, formatISODate } from '@/lib/dates';
import type { CashFlowPoint, Shortfall, PlannerWarning } from '@/types';

// ─── Input types ──────────────────────────────────────────────────────────────

export type CashFlowIncomeEvent = {
  id: string;
  date: string;
  amountMinor: number;
  isReceived: boolean;
  label: string;
};

export type CashFlowOccurrence = {
  occurrenceId: string;
  paymentName: string;
  dueDate: string;
  /** Remaining payment amount (due − paid). Fees are tracked separately. */
  requiredAmountMinor: number;
  feeAmountMinor: number;
  amountIsEstimate: boolean;
};

export type CashFlowAllowanceReservation = {
  budgetId: string;
  startDate: string;
  endDate: string;
  dailyAmountMinor: number;
};

export type CashFlowManualAdjustment = {
  date: string;
  amountMinor: number;
  direction: 'inflow' | 'outflow';
  label: string;
};

export type CashFlowInput = {
  periodStart: string;
  periodEnd: string;
  openingCashMinor: number;
  minimumCashBufferMinor: number;
  incomeEvents: CashFlowIncomeEvent[];
  occurrences: CashFlowOccurrence[];
  allowanceReservations: CashFlowAllowanceReservation[];
  manualAdjustments: CashFlowManualAdjustment[];
  /** When false, only isReceived income is added to the balance. */
  includeExpectedIncome: boolean;
};

export type CashFlowResult = {
  timeline: CashFlowPoint[];
  shortfalls: Shortfall[];
  warnings: PlannerWarning[];
  lowestCashBalanceMinor: number;
  closingCashMinor: number;
};

// ─── Standalone formulas ──────────────────────────────────────────────────────

/**
 * Cash available for payment allocation after reserving the buffer and
 * any per-period allowance already deducted externally (spec §12.8).
 * Never negative.
 */
export function allocatableCash(
  balanceMinor: number,
  minimumCashBufferMinor: number,
  allowanceAlreadyReservedMinor = 0
): number {
  return Math.max(0, balanceMinor - minimumCashBufferMinor - allowanceAlreadyReservedMinor);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function generateDays(startDate: string, endDate: string): string[] {
  const start = parseISODate(startDate);
  const end = parseISODate(endDate);
  const days: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(formatISODate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function groupByDate<T extends { date: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const list = map.get(item.date);
    if (list) {
      list.push(item);
    } else {
      map.set(item.date, [item]);
    }
  }
  return map;
}

// ─── Main projection ──────────────────────────────────────────────────────────

/**
 * Project cash balance day-by-day over a period, detecting shortfalls when
 * required payments cannot be made within the cash buffer constraint.
 *
 * Occurrences are processed in the order supplied — the caller is responsible
 * for ranking them before passing to this function. The Phase 4 planner
 * handles strategic ranking; this function only projects the balance.
 *
 * Pure function — no side effects, no mutations of input objects (spec §14).
 */
export function projectCashFlow(input: CashFlowInput): CashFlowResult {
  const days = generateDays(input.periodStart, input.periodEnd);

  // Normalise adjustments: split by direction so we can use one groupByDate map.
  const inflows = input.manualAdjustments.filter((a) => a.direction === 'inflow');
  const manualOutflows = input.manualAdjustments.filter((a) => a.direction === 'outflow');

  const incomeByDate = groupByDate(input.incomeEvents);
  const occurrencesByDate = groupByDate(
    input.occurrences.map((o) => ({ ...o, date: o.dueDate }))
  );
  const inflowsByDate = groupByDate(inflows);
  const manualOutflowsByDate = groupByDate(manualOutflows);

  let balance = input.openingCashMinor;
  let lowestBalance = balance;
  const timeline: CashFlowPoint[] = [];
  const shortfalls: Shortfall[] = [];
  const warnings: PlannerWarning[] = [];

  for (const date of days) {
    const opening = balance;
    let dayInflows = 0;
    let dayOutflows = 0;
    const events: string[] = [];

    // ── Income events ──
    for (const evt of incomeByDate.get(date) ?? []) {
      if (evt.isReceived || input.includeExpectedIncome) {
        dayInflows += evt.amountMinor;
        events.push(
          `${evt.isReceived ? 'Received' : 'Expected'} income: ${evt.label}`
        );
        if (!evt.isReceived) {
          warnings.push({
            code: 'EXPECTED_INCOME_INCLUDED',
            message: `Expected income "${evt.label}" on ${date} has not been received.`,
            date,
          });
        }
      }
    }

    // ── Manual inflows ──
    for (const adj of inflowsByDate.get(date) ?? []) {
      dayInflows += adj.amountMinor;
      events.push(`Inflow: ${adj.label}`);
    }

    // ── Daily allowance deduction ──
    let dailyAllowance = 0;
    for (const res of input.allowanceReservations) {
      if (date >= res.startDate && date <= res.endDate) {
        dailyAllowance += res.dailyAmountMinor;
      }
    }
    if (dailyAllowance > 0) {
      dayOutflows += dailyAllowance;
      events.push(`Daily allowance reserved`);
    }

    // ── Manual outflows ──
    for (const adj of manualOutflowsByDate.get(date) ?? []) {
      dayOutflows += adj.amountMinor;
      events.push(`Outflow: ${adj.label}`);
    }

    // Apply income and non-payment outflows first so the balance available
    // for payment allocation is known before processing occurrences.
    balance = opening + dayInflows - dayOutflows;

    // ── Payment occurrences ──
    for (const occ of occurrencesByDate.get(date) ?? []) {
      const total = occ.requiredAmountMinor + occ.feeAmountMinor;
      if (total <= 0) continue;

      // Allocatable cash respects the cash buffer (spec §12.8).
      const available = Math.max(0, balance - input.minimumCashBufferMinor);

      if (available < total) {
        const gap = total - available;
        shortfalls.push({
          occurrenceId: occ.occurrenceId,
          dueDate: date,
          shortfallAmountMinor: gap,
          reason: `"${occ.paymentName}" on ${date}: ${total} required, ${available} available after buffer.`,
        });
        // Apply partial payment — use everything above the buffer.
        balance -= available;
        dayOutflows += available;
        events.push(`Partial payment: ${occ.paymentName} (shortfall)`);
      } else {
        balance -= total;
        dayOutflows += total;
        events.push(
          `Payment: ${occ.paymentName}${occ.amountIsEstimate ? ' (estimate)' : ''}`
        );
      }

      if (occ.amountIsEstimate) {
        warnings.push({
          code: 'ESTIMATE_AMOUNT',
          message: `"${occ.paymentName}" on ${date} is an estimated amount.`,
          date,
          occurrenceId: occ.occurrenceId,
        });
      }
    }

    lowestBalance = Math.min(lowestBalance, balance);

    timeline.push({
      date,
      openingBalanceMinor: opening,
      closingBalanceMinor: balance,
      inflowsMinor: dayInflows,
      outflowsMinor: dayOutflows,
      events,
    });
  }

  return {
    timeline,
    shortfalls,
    warnings,
    lowestCashBalanceMinor: lowestBalance,
    closingCashMinor: balance,
  };
}
