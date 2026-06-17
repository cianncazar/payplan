import { parseISODate, formatISODate } from '@/lib/dates';
import {
  projectCashFlow,
  type CashFlowOccurrence,
  type CashFlowIncomeEvent,
  type CashFlowAllowanceReservation,
} from '@/lib/calculations/cash-flow';

export type ShortfallSummaryInput = {
  todayIso: string;
  horizonDays?: number;
  openingCashMinor: number;
  minimumCashBufferMinor: number;
  occurrences: CashFlowOccurrence[];
  incomeEvents: CashFlowIncomeEvent[];
  allowanceReservations: CashFlowAllowanceReservation[];
};

export type ShortfallSummary = {
  health: 'on_track' | 'tight' | 'shortfall' | 'not_enough_data';
  gapMinor: number;
  firstShortfallDate: string | null;
  lowestBalanceMinor: number;
  coversThroughDate: string | null;
};

function addDays(isoDate: string, n: number): string {
  const d = parseISODate(isoDate);
  d.setDate(d.getDate() + n);
  return formatISODate(d);
}

/**
 * Wraps projectCashFlow with a dashboard-friendly summary.
 * Pure — no side effects, no I/O.
 */
export function computeShortfallSummary(input: ShortfallSummaryInput): ShortfallSummary {
  const { todayIso, horizonDays = 30, openingCashMinor, minimumCashBufferMinor } = input;

  const hasData = openingCashMinor > 0 || input.occurrences.length > 0;
  if (!hasData) {
    return {
      health: 'not_enough_data',
      gapMinor: 0,
      firstShortfallDate: null,
      lowestBalanceMinor: openingCashMinor,
      coversThroughDate: null,
    };
  }

  const periodEnd = addDays(todayIso, horizonDays - 1);

  const result = projectCashFlow({
    periodStart: todayIso,
    periodEnd,
    openingCashMinor,
    minimumCashBufferMinor,
    incomeEvents: input.incomeEvents,
    occurrences: input.occurrences,
    allowanceReservations: input.allowanceReservations,
    manualAdjustments: [],
    includeExpectedIncome: true,
  });

  if (result.shortfalls.length > 0) {
    const sorted = [...result.shortfalls].sort((a, b) =>
      a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0
    );
    const firstShortfallDate = sorted[0].dueDate;
    const gapMinor = result.shortfalls.reduce((sum, s) => sum + s.shortfallAmountMinor, 0);

    // Last day in timeline before the first shortfall date
    const timelineBeforeShortfall = result.timeline.filter((p) => p.date < firstShortfallDate);
    const coversThroughDate =
      timelineBeforeShortfall.length > 0
        ? timelineBeforeShortfall[timelineBeforeShortfall.length - 1].date
        : null;

    return {
      health: 'shortfall',
      gapMinor,
      firstShortfallDate,
      lowestBalanceMinor: result.lowestCashBalanceMinor,
      coversThroughDate,
    };
  }

  // Tight = lowest balance within 10% above the buffer (or below buffer)
  const tightThreshold = minimumCashBufferMinor * 1.1;
  if (result.lowestCashBalanceMinor <= tightThreshold && minimumCashBufferMinor > 0) {
    return {
      health: 'tight',
      gapMinor: 0,
      firstShortfallDate: null,
      lowestBalanceMinor: result.lowestCashBalanceMinor,
      coversThroughDate: periodEnd,
    };
  }

  return {
    health: 'on_track',
    gapMinor: 0,
    firstShortfallDate: null,
    lowestBalanceMinor: result.lowestCashBalanceMinor,
    coversThroughDate: periodEnd,
  };
}
