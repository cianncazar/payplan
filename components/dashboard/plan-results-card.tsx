'use client';

import dynamic from 'next/dynamic';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/db/database';
import { formatISODate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { runPlanner } from '@/lib/calculations/planner';
import { countInclusiveDays } from '@/lib/calculations/allowance';
import { buttonVariants } from '@/components/ui/button';
import { PlanHealthBadge } from '@/components/planner/plan-health-badge';
import { cn } from '@/lib/utils';
import type {
  PlannerInput,
  PlannerPaymentOccurrence,
  PlannerIncomeEvent,
  AllowanceReservation,
} from '@/types';

const CashFlowChart = dynamic(
  () => import('@/components/charts/cash-flow-chart').then((m) => m.CashFlowChart),
  { ssr: false }
);

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return formatISODate(d);
}

function formatDateShort(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
  });
}

export function PlanResultsCard() {
  const today = formatISODate(new Date());
  const cutoff = addDays(today, 29);

  const planData = useLiveQuery(async () => {
    const [cashSources, rawOccs, rawIncome, budgets, manualAdjs, settings] = await Promise.all([
      db.cashSources.filter((s) => !s.archived && s.includeInPlanner).toArray(),
      db.paymentOccurrences.where('dueDate').between(today, cutoff, true, true).toArray(),
      db.incomeEvents.where('expectedDate').between(today, cutoff, true, true).toArray(),
      db.allowanceBudgets.where('status').equals('active').toArray(),
      db.manualCashAdjustments.where('date').between(today, cutoff, true, true).toArray(),
      db.appSettings.get('local-settings'),
    ]);

    const paymentIds = [...new Set(rawOccs.map((o) => o.paymentId))];
    const payments = await db.payments.bulkGet(paymentIds);
    const paymentMap = new Map(
      payments
        .filter((p): p is NonNullable<typeof p> => p !== undefined)
        .map((p) => [p.id, p])
    );

    const occs: PlannerPaymentOccurrence[] = rawOccs
      .filter((o) => {
        const p = paymentMap.get(o.paymentId);
        return p && p.status !== 'paused' && p.status !== 'archived';
      })
      .map((o) => {
        const p = paymentMap.get(o.paymentId)!;
        return {
          id: o.id,
          paymentId: o.paymentId,
          paymentName: p.name,
          dueDate: o.dueDate,
          graceDate: o.graceDate,
          dueAmountMinor: o.dueAmountMinor,
          minimumAmountMinor: o.minimumAmountMinor,
          paidAmountMinor: o.paidAmountMinor,
          feeAmountMinor: o.feeAmountMinor,
          status: o.status,
          essential: p.essential,
          priority: p.priority,
          annualInterestRate: p.annualInterestRate,
          currentBalanceMinor: p.currentBalanceMinor,
          amountIsEstimate: o.amountIsEstimate,
          manuallyOverridden: o.manuallyOverridden,
        };
      });

    const incomeEvents: PlannerIncomeEvent[] = rawIncome
      .filter((e) => e.status !== 'cancelled')
      .map((e) => ({
        id: e.id,
        expectedDate: e.expectedDate,
        amountMinor:
          e.status === 'received'
            ? (e.receivedAmountMinor ?? e.expectedAmountMinor)
            : e.expectedAmountMinor,
        status: e.status,
      }));

    const allowanceReservations: AllowanceReservation[] = budgets
      .filter((b) => b.endDate >= today && b.startDate <= cutoff)
      .map((b) => ({
        budgetId: b.id,
        startDate: b.startDate,
        endDate: b.endDate,
        dailyAmountMinor:
          b.dailyTargetMinor ??
          Math.floor(
            b.totalBudgetMinor / Math.max(1, countInclusiveDays(b.startDate, b.endDate))
          ),
      }));

    const input: PlannerInput = {
      periodStart: today,
      periodEnd: cutoff,
      openingCashMinor: cashSources.reduce((s, c) => s + c.balanceMinor, 0),
      minimumCashBufferMinor: settings?.minimumCashBufferMinor ?? 0,
      allowanceReservations,
      incomeEvents,
      occurrences: occs,
      manualAdjustments: manualAdjs,
      strategy: settings?.defaultStrategy ?? 'deadline_first',
      includeExpectedIncome: settings?.includeExpectedIncomeDefault ?? true,
    };

    const result = runPlanner(input);
    return { result, occs, bufferMinor: input.minimumCashBufferMinor };
  }, [today, cutoff]);

  if (!planData) {
    return <div className="h-48 animate-pulse rounded-lg bg-muted" />;
  }

  const { result, occs, bufferMinor } = planData;
  const { summary, allocations, shortfalls, timeline } = result;

  const occMap = new Map(occs.map((o) => [o.id, o]));
  const shortfallMap = new Map(shortfalls.map((s) => [s.occurrenceId, s.shortfallAmountMinor]));

  const fundedAllocations = allocations.filter((a) => a.plannedAmountMinor > 0);
  const visibleAllocations = fundedAllocations.slice(0, 5);
  const hasMore = fundedAllocations.length > 5;

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold">30-Day Plan</h2>
          <span className="text-xs text-muted-foreground">
            {formatDateShort(today)} – {formatDateShort(cutoff)}
          </span>
          <PlanHealthBadge health={summary.health} />
        </div>
        <Link
          href="/planner"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'shrink-0 gap-1 text-xs')}
        >
          Full plan
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>

      {summary.health === 'not_enough_data' ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Add your cash sources and payments to generate a plan.
          </p>
          <Link href="/planner" className={cn(buttonVariants({ size: 'sm' }), 'mt-4')}>
            Open Planner
          </Link>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 px-4 py-3 sm:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">Total planned</div>
              <div className="font-medium tabular-nums">
                {formatMoney(summary.totalPlannedMinor)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Funded</div>
              <div className="font-medium text-emerald-600 dark:text-emerald-400">
                {summary.fullyFundedCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Shortfalls</div>
              <div
                className={cn(
                  'font-medium',
                  summary.shortfallCount > 0 && 'text-destructive'
                )}
              >
                {summary.shortfallCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Remaining cash</div>
              <div className="font-medium tabular-nums">
                {formatMoney(summary.remainingCashMinor)}
              </div>
            </div>
          </div>

          {/* Cash-flow chart */}
          {timeline.length > 0 && (
            <div className="px-4 pb-2">
              <CashFlowChart timeline={timeline} cashBufferMinor={bufferMinor} />
            </div>
          )}

          {/* Allocations list */}
          {visibleAllocations.length > 0 && (
            <div className="border-t border-border">
              <div className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Allocations
              </div>
              <div className="px-4">
                {visibleAllocations.map((a, i) => {
                  const occ = occMap.get(a.occurrenceId);
                  const hasShortfall = shortfallMap.has(a.occurrenceId);
                  return (
                    <div
                      key={`${a.occurrenceId}-${i}`}
                      className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-0"
                    >
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm">
                          {occ?.paymentName ?? a.occurrenceId}
                        </span>
                        <span className="text-xs text-muted-foreground">{a.plannedDate}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm tabular-nums">
                          {formatMoney(a.plannedAmountMinor)}
                        </span>
                        {hasShortfall ? (
                          <XCircle
                            className="h-3.5 w-3.5 text-destructive"
                            aria-label="Shortfall"
                          />
                        ) : (
                          <CheckCircle2
                            className="h-3.5 w-3.5 text-emerald-500"
                            aria-label="Funded"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {hasMore && (
                <div className="border-t border-border px-4 py-2.5">
                  <Link href="/planner" className="text-xs text-primary hover:underline">
                    View all {fundedAllocations.length} allocations in Planner →
                  </Link>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
