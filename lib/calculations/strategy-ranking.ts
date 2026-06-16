import type {
  PlannerPaymentOccurrence,
  PlannerStrategy,
  PlannerIncomeEvent,
} from '@/types';

function remaining(occ: PlannerPaymentOccurrence): number {
  return Math.max(0, occ.dueAmountMinor - occ.paidAmountMinor);
}

/**
 * Find the earliest income date at or after `fromDate` that will be included
 * in the projection. Delayed and cancelled events are always excluded.
 */
export function findNextIncomeDate(
  incomeEvents: PlannerIncomeEvent[],
  fromDate: string,
  includeExpected: boolean
): string | undefined {
  const dates = incomeEvents
    .filter((e) => {
      if (e.status === 'delayed' || e.status === 'cancelled') return false;
      if (e.status === 'expected' && !includeExpected) return false;
      return e.expectedDate >= fromDate;
    })
    .map((e) => e.expectedDate)
    .sort();
  return dates[0];
}

/**
 * Return a new array of occurrences sorted by the selected strategy.
 *
 * Phase 5 strategies (smallest_balance_first, highest_interest_first) fall
 * back to deadline_first until that phase is implemented (spec §31.5).
 * The input array is never mutated.
 */
export function rankOccurrences(
  occurrences: PlannerPaymentOccurrence[],
  strategy: PlannerStrategy,
  opts: { nextIncomeDate?: string; customPriority?: string[] } = {}
): PlannerPaymentOccurrence[] {
  const sorted = [...occurrences];

  switch (strategy) {
    case 'deadline_first':
      return sorted.sort((a, b) => {
        const byDate = a.dueDate.localeCompare(b.dueDate);
        if (byDate !== 0) return byDate;
        if (a.essential !== b.essential) return a.essential ? -1 : 1;
        if (a.priority !== b.priority) return a.priority - b.priority;
        return remaining(b) - remaining(a);
      });

    case 'essential_first':
      return sorted.sort((a, b) => {
        if (a.essential !== b.essential) return a.essential ? -1 : 1;
        const byDate = a.dueDate.localeCompare(b.dueDate);
        if (byDate !== 0) return byDate;
        return a.priority - b.priority;
      });

    case 'minimums_first':
      return sorted.sort((a, b) => {
        const aHasMin = (a.minimumAmountMinor ?? 0) > 0;
        const bHasMin = (b.minimumAmountMinor ?? 0) > 0;
        if (aHasMin !== bHasMin) return aHasMin ? -1 : 1;
        const byDate = a.dueDate.localeCompare(b.dueDate);
        if (byDate !== 0) return byDate;
        if (a.essential !== b.essential) return a.essential ? -1 : 1;
        return a.priority - b.priority;
      });

    case 'lowest_cash_flow_risk': {
      const next = opts.nextIncomeDate;
      return sorted.sort((a, b) => {
        // Payments due before the next confirmed income are higher priority
        const aBefore = next === undefined || a.dueDate < next;
        const bBefore = next === undefined || b.dueDate < next;
        if (aBefore !== bBefore) return aBefore ? -1 : 1;
        const byDate = a.dueDate.localeCompare(b.dueDate);
        if (byDate !== 0) return byDate;
        if (a.essential !== b.essential) return a.essential ? -1 : 1;
        return a.priority - b.priority;
      });
    }

    case 'custom': {
      const idxMap = new Map<string, number>();
      (opts.customPriority ?? []).forEach((pid, i) => idxMap.set(pid, i));
      return sorted.sort((a, b) => {
        const aIdx = idxMap.get(a.paymentId) ?? Infinity;
        const bIdx = idxMap.get(b.paymentId) ?? Infinity;
        if (aIdx !== bIdx) return aIdx - bIdx;
        return a.dueDate.localeCompare(b.dueDate);
      });
    }

    case 'smallest_balance_first':
      return sorted.sort((a, b) => {
        const aHasMin = (a.minimumAmountMinor ?? 0) > 0;
        const bHasMin = (b.minimumAmountMinor ?? 0) > 0;
        if (aHasMin !== bHasMin) return aHasMin ? -1 : 1;
        const aBal = a.currentBalanceMinor ?? remaining(a);
        const bBal = b.currentBalanceMinor ?? remaining(b);
        if (aBal !== bBal) return aBal - bBal;
        return a.dueDate.localeCompare(b.dueDate);
      });

    case 'highest_interest_first':
      return sorted.sort((a, b) => {
        const aHasMin = (a.minimumAmountMinor ?? 0) > 0;
        const bHasMin = (b.minimumAmountMinor ?? 0) > 0;
        if (aHasMin !== bHasMin) return aHasMin ? -1 : 1;
        // Payments without a rate go after those with a known rate
        const aRate = a.annualInterestRate != null ? parseFloat(a.annualInterestRate) : -Infinity;
        const bRate = b.annualInterestRate != null ? parseFloat(b.annualInterestRate) : -Infinity;
        if (aRate !== bRate) return bRate - aRate;
        const aRem = remaining(a);
        const bRem = remaining(b);
        if (aRem !== bRem) return bRem - aRem;
        return a.dueDate.localeCompare(b.dueDate);
      });

    default:
      return sorted.sort((a, b) => {
        const byDate = a.dueDate.localeCompare(b.dueDate);
        if (byDate !== 0) return byDate;
        if (a.essential !== b.essential) return a.essential ? -1 : 1;
        return a.priority - b.priority;
      });
  }
}
