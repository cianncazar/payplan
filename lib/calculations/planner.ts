import type {
  PlannerInput,
  PlannerResult,
  PlannedAllocation,
  CashFlowPoint,
  Shortfall,
  PlannerWarning,
  PlannerSummary,
  PlannerPaymentOccurrence,
  PlannerIncomeEvent,
  PlanHealth,
  AllocationType,
} from '@/types';
import { parseISODate, formatISODate } from '@/lib/dates';
import { rankOccurrences, findNextIncomeDate } from './strategy-ranking';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function generateDays(start: string, end: string): string[] {
  const s = parseISODate(start);
  const e = parseISODate(end);
  const days: string[] = [];
  const cur = new Date(s);
  while (cur <= e) {
    days.push(formatISODate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function occRemaining(occ: PlannerPaymentOccurrence): number {
  return Math.max(0, occ.dueAmountMinor - occ.paidAmountMinor);
}

function buildSummary(
  allocations: PlannedAllocation[],
  shortfalls: Shortfall[],
  warnings: PlannerWarning[],
  lowestCashMinor: number,
  closingCashMinor: number
): PlannerSummary {
  const shortfallIds = new Set(shortfalls.map((s) => s.occurrenceId));
  // Include occurrences with shortfalls but zero partial allocation (not in allocations array)
  const allOccIds = new Set([
    ...allocations.filter((a) => a.plannedAmountMinor > 0).map((a) => a.occurrenceId),
    ...shortfalls.map((s) => s.occurrenceId),
  ]);

  let fullyFundedCount = 0;
  let underfundedCount = 0;
  let totalPlannedMinor = 0;

  for (const id of allOccIds) {
    const sum = allocations
      .filter((a) => a.occurrenceId === id)
      .reduce((acc, a) => acc + a.plannedAmountMinor, 0);
    totalPlannedMinor += sum;
    if (shortfallIds.has(id)) underfundedCount++;
    else fullyFundedCount++;
  }

  const shortfallCount = shortfalls.length;
  const earliestShortfallDate = shortfalls.map((s) => s.dueDate).sort()[0];

  let health: PlanHealth;
  if (shortfallCount > 0 || lowestCashMinor < 0) {
    health = 'shortfall';
  } else if (allOccIds.size === 0) {
    health = 'not_enough_data';
  } else if (warnings.some((w) => w.code === 'EXPECTED_INCOME_INCLUDED')) {
    health = 'tight';
  } else {
    health = 'on_track';
  }

  let reason: string;
  if (health === 'shortfall' && earliestShortfallDate) {
    const first = shortfalls.find((s) => s.dueDate === earliestShortfallDate);
    reason = first?.reason ?? `Shortfall detected on ${earliestShortfallDate}.`;
  } else if (health === 'tight') {
    reason = 'Plan includes expected income that has not yet been received.';
  } else if (health === 'not_enough_data') {
    reason = 'No unfunded payment occurrences found in this period.';
  } else {
    reason = 'All planned payments can be funded within the cash buffer.';
  }

  return {
    health,
    reason,
    totalPlannedMinor,
    fullyFundedCount,
    underfundedCount,
    shortfallCount,
    earliestShortfallDate,
    lowestCashBalanceMinor: lowestCashMinor,
    remainingCashMinor: closingCashMinor,
  };
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Generate a payment plan from the supplied input.
 *
 * Pure function: no side effects, no mutations of input, no I/O (spec §14).
 * Occurrences are processed on their due date (or locked planned date) in
 * strategy-ranked order. Income arrives before payments are allocated on
 * the same day.
 */
export function runPlanner(input: PlannerInput): PlannerResult {
  // Validate date range
  if (input.periodEnd < input.periodStart) {
    const summary: PlannerSummary = {
      health: 'not_enough_data',
      reason: 'Period end must be on or after period start.',
      totalPlannedMinor: 0,
      fullyFundedCount: 0,
      underfundedCount: 0,
      shortfallCount: 0,
      lowestCashBalanceMinor: input.openingCashMinor,
      remainingCashMinor: input.openingCashMinor,
    };
    return {
      allocations: [],
      timeline: [],
      shortfalls: [],
      warnings: [{ code: 'INVALID_DATE_RANGE', message: 'Period end must be on or after period start.' }],
      summary,
      explanations: [],
    };
  }

  // Eligible occurrences: not paid/waived/cancelled and have a remaining balance
  const eligible = input.occurrences.filter(
    (o) =>
      o.status !== 'paid' &&
      o.status !== 'waived' &&
      o.status !== 'cancelled' &&
      occRemaining(o) > 0
  );

  // Find next income date for lowest_cash_flow_risk ranking
  const nextIncomeDate = findNextIncomeDate(
    input.incomeEvents,
    input.periodStart,
    input.includeExpectedIncome
  );

  // Rank occurrences by strategy
  const ranked = rankOccurrences(eligible, input.strategy, {
    nextIncomeDate,
    customPriority: input.customPriority,
  });

  // Locked allocation map: occurrenceId → lock
  const lockMap = new Map(
    (input.manualLocks ?? []).map((lock) => [lock.occurrenceId, lock])
  );

  // Group occurrences by effective date (locked date overrides due date)
  const occsByDate = new Map<string, PlannerPaymentOccurrence[]>();
  for (const o of ranked) {
    const date = lockMap.get(o.id)?.plannedDate ?? o.dueDate;
    const list = occsByDate.get(date) ?? [];
    list.push(o);
    occsByDate.set(date, list);
  }

  // Index income by date
  const incomeByDate = new Map<string, PlannerIncomeEvent[]>();
  for (const evt of input.incomeEvents) {
    const list = incomeByDate.get(evt.expectedDate) ?? [];
    list.push(evt);
    incomeByDate.set(evt.expectedDate, list);
  }

  // Index manual adjustments by date and direction
  const inflowsByDate = new Map<string, typeof input.manualAdjustments>();
  const outflowsByDate = new Map<string, typeof input.manualAdjustments>();
  for (const adj of input.manualAdjustments) {
    if (adj.direction === 'inflow') {
      const list = inflowsByDate.get(adj.date) ?? [];
      list.push(adj);
      inflowsByDate.set(adj.date, list);
    } else {
      const list = outflowsByDate.get(adj.date) ?? [];
      list.push(adj);
      outflowsByDate.set(adj.date, list);
    }
  }

  // Day-by-day projection
  const days = generateDays(input.periodStart, input.periodEnd);
  let balance = input.openingCashMinor;
  let lowestBalance = balance;
  const timeline: CashFlowPoint[] = [];
  const shortfalls: Shortfall[] = [];
  const warnings: PlannerWarning[] = [];
  const allocations: PlannedAllocation[] = [];
  const explanations: string[] = [];

  for (const date of days) {
    const opening = balance;
    let dayInflows = 0;
    let dayOutflows = 0;
    const events: string[] = [];

    // ── Income events ──
    for (const evt of incomeByDate.get(date) ?? []) {
      if (evt.status === 'delayed' || evt.status === 'cancelled') continue;
      const isReceived = evt.status === 'received';
      if (!isReceived && !input.includeExpectedIncome) continue;
      dayInflows += evt.amountMinor;
      events.push(`${isReceived ? 'Received' : 'Expected'} income`);
      if (!isReceived) {
        warnings.push({
          code: 'EXPECTED_INCOME_INCLUDED',
          message: `Expected income of ${evt.amountMinor} on ${date} has not been received yet.`,
          date,
        });
      }
    }

    // ── Manual inflows ──
    for (const adj of inflowsByDate.get(date) ?? []) {
      dayInflows += adj.amountMinor;
      events.push(`Inflow: ${adj.label}`);
    }

    // ── Allowance deductions ──
    let allowanceToday = 0;
    for (const res of input.allowanceReservations) {
      if (date >= res.startDate && date <= res.endDate) {
        allowanceToday += res.dailyAmountMinor;
      }
    }
    if (allowanceToday > 0) {
      dayOutflows += allowanceToday;
      events.push('Daily allowance reserved');
    }

    // ── Manual outflows ──
    for (const adj of outflowsByDate.get(date) ?? []) {
      dayOutflows += adj.amountMinor;
      events.push(`Outflow: ${adj.label}`);
    }

    // Income and non-payment outflows settle before payments are processed
    balance = opening + dayInflows - dayOutflows;

    // ── Payment allocations ──
    for (const occ of occsByDate.get(date) ?? []) {
      const lock = lockMap.get(occ.id);
      const required = occRemaining(occ);
      const fee = occ.feeAmountMinor;
      const total = required + fee;
      const label = occ.paymentName ?? occ.id;

      if (total <= 0) continue;

      if (lock) {
        // Locked allocation — respect the user's amount without buffer enforcement
        const amount = lock.plannedAmountMinor;
        balance -= amount;
        dayOutflows += amount;
        events.push(`Locked: ${label}`);

        allocations.push({
          occurrenceId: occ.id,
          plannedDate: date,
          plannedAmountMinor: amount,
          allocationType: 'manual' as AllocationType,
          reason: `Manually locked at ${amount}.`,
          manuallyLocked: true,
        });

        if (amount < total) {
          const gap = total - amount;
          shortfalls.push({
            occurrenceId: occ.id,
            dueDate: date,
            shortfallAmountMinor: gap,
            reason: `"${label}" on ${date}: locked ${amount} covers only ${total - gap} of ${total} required.`,
          });
          warnings.push({
            code: 'LOCKED_ALLOCATION_UNDERFUNDED',
            message: `Locked allocation for "${label}" on ${date} leaves a shortfall of ${gap}.`,
            occurrenceId: occ.id,
            date,
          });
        }
        explanations.push(`${date}: ${amount} locked for "${label}".`);
        continue;
      }

      // Available cash after reserving the minimum buffer
      const available = Math.max(0, balance - input.minimumCashBufferMinor);

      if (available >= total) {
        // Full allocation
        balance -= total;
        dayOutflows += total;
        events.push(`Payment: ${label}`);
        allocations.push({
          occurrenceId: occ.id,
          plannedDate: date,
          plannedAmountMinor: total,
          allocationType: 'required' as AllocationType,
          reason: `Full amount of ${total} allocated.`,
          manuallyLocked: false,
        });
        explanations.push(`${date}: ${total} allocated for "${label}" (full).`);
      } else {
        const minimum = occ.minimumAmountMinor;
        if (minimum !== undefined && minimum > 0 && available >= minimum) {
          // Minimum-only allocation
          balance -= minimum;
          dayOutflows += minimum;
          events.push(`Minimum payment: ${label}`);
          allocations.push({
            occurrenceId: occ.id,
            plannedDate: date,
            plannedAmountMinor: minimum,
            allocationType: 'minimum' as AllocationType,
            reason: `Only minimum of ${minimum} allocated; ${total - minimum} short.`,
            manuallyLocked: false,
          });
          shortfalls.push({
            occurrenceId: occ.id,
            dueDate: date,
            shortfallAmountMinor: total - minimum,
            reason: `"${label}" on ${date}: minimum ${minimum} paid, ${total - minimum} short.`,
          });
          explanations.push(`${date}: Minimum ${minimum} allocated for "${label}"; ${total - minimum} unfunded.`);
        } else {
          // Partial (whatever is above the buffer) or nothing
          const partial = available;
          if (partial > 0) {
            balance -= partial;
            dayOutflows += partial;
            events.push(`Partial payment: ${label}`);
            allocations.push({
              occurrenceId: occ.id,
              plannedDate: date,
              plannedAmountMinor: partial,
              allocationType: 'minimum' as AllocationType,
              reason: `Partial ${partial} allocated; ${total - partial} short.`,
              manuallyLocked: false,
            });
          }
          shortfalls.push({
            occurrenceId: occ.id,
            dueDate: date,
            shortfallAmountMinor: total - partial,
            reason: `"${label}" on ${date}: ${partial} available after buffer, ${total - partial} short.`,
          });
          explanations.push(`${date}: ${partial > 0 ? `Partial ${partial}` : 'No allocation'} for "${label}"; ${total - partial} unfunded.`);
        }
      }

      if (occ.amountIsEstimate) {
        warnings.push({
          code: 'ESTIMATE_AMOUNT',
          message: `"${label}" on ${date} uses an estimated amount.`,
          date,
          occurrenceId: occ.id,
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

  const summary = buildSummary(allocations, shortfalls, warnings, lowestBalance, balance);

  return { allocations, timeline, shortfalls, warnings, summary, explanations };
}
