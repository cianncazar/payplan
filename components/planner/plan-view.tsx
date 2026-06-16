'use client';

import dynamic from 'next/dynamic';
import { CheckCircle2, AlertTriangle, XCircle, Lock } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import type { PlannerResult, PlannerPaymentOccurrence } from '@/types';
import { PlanHealthBadge } from './plan-health-badge';

const CashFlowChart = dynamic(
  () => import('@/components/charts/cash-flow-chart').then((m) => m.CashFlowChart),
  { ssr: false }
);

// Map occurrence ID to payment name for display
type OccurrenceMap = Map<string, PlannerPaymentOccurrence>;

function AllocationRow({
  occurrenceId,
  plannedDate,
  plannedAmountMinor,
  allocationType,
  manuallyLocked,
  hasShortfall,
  shortfallAmount,
  occMap,
}: {
  occurrenceId: string;
  plannedDate: string;
  plannedAmountMinor: number;
  allocationType: string;
  manuallyLocked: boolean;
  hasShortfall: boolean;
  shortfallAmount: number;
  occMap: OccurrenceMap;
}) {
  const occ = occMap.get(occurrenceId);
  const name = occ?.paymentName ?? occurrenceId;

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border last:border-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          {manuallyLocked && (
            <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Locked" />
          )}
          <span className="truncate text-sm font-medium">{name}</span>
          {allocationType === 'minimum' && !hasShortfall && (
            <span className="shrink-0 rounded-sm bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              Minimum only
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{plannedDate}</span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-medium tabular-nums">
          {formatMoney(plannedAmountMinor)}
        </span>
        {hasShortfall ? (
          <span
            className="flex items-center gap-1 text-xs text-destructive"
            title={`Shortfall: ${formatMoney(shortfallAmount)}`}
          >
            <XCircle className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">{formatMoney(shortfallAmount)} short</span>
          </span>
        ) : (
          <CheckCircle2
            className="h-3.5 w-3.5 text-emerald-500"
            aria-label="Fully funded"
          />
        )}
      </div>
    </div>
  );
}

export function PlanView({
  result,
  occurrences,
  cashBufferMinor = 0,
}: {
  result: PlannerResult;
  occurrences: PlannerPaymentOccurrence[];
  cashBufferMinor?: number;
}) {
  const { summary, allocations, shortfalls, warnings, timeline } = result;

  // Build a lookup map for occurrence metadata
  const occMap: OccurrenceMap = new Map(occurrences.map((o) => [o.id, o]));

  // Build shortfall lookup
  const shortfallMap = new Map(
    shortfalls.map((s) => [s.occurrenceId, s.shortfallAmountMinor])
  );

  // Filter warnings that should be shown prominently (not generic ones)
  const prominentWarnings = warnings.filter(
    (w) => w.code === 'EXPECTED_INCOME_INCLUDED' || w.code === 'LOCKED_ALLOCATION_UNDERFUNDED'
  );

  const hasMeaningfulAllocations = allocations.some((a) => a.plannedAmountMinor > 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Summary card */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">Plan Summary</h2>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <PlanHealthBadge health={summary.health} />
        </div>
        {summary.health !== 'not_enough_data' && (
          <p className="mb-4 text-sm text-muted-foreground">{summary.reason}</p>
        )}
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground">Total planned</div>
            <div className="font-medium tabular-nums">{formatMoney(summary.totalPlannedMinor)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Funded</div>
            <div className="font-medium text-emerald-600 dark:text-emerald-400">
              {summary.fullyFundedCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Shortfalls</div>
            <div className={`font-medium ${summary.shortfallCount > 0 ? 'text-destructive' : ''}`}>
              {summary.shortfallCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Remaining cash</div>
            <div className="font-medium tabular-nums">{formatMoney(summary.remainingCashMinor)}</div>
          </div>
        </div>
        {summary.lowestCashBalanceMinor < summary.remainingCashMinor && (
          <div className="mt-3 text-xs text-muted-foreground">
            Lowest balance: {formatMoney(summary.lowestCashBalanceMinor)}
            {summary.earliestShortfallDate && ` · first shortfall on ${summary.earliestShortfallDate}`}
          </div>
        )}
      </div>

      {/* Prominent warnings */}
      {prominentWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <ul className="space-y-1">
              {prominentWarnings.map((w, i) => (
                <li key={i} className="text-sm text-amber-700 dark:text-amber-300">
                  {w.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Cash-flow chart */}
      {timeline.length > 0 && (
        <CashFlowChart timeline={timeline} cashBufferMinor={cashBufferMinor} />
      )}

      {/* Allocations list */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold">Allocations</h2>
        </div>
        {hasMeaningfulAllocations ? (
          <div className="px-4">
            {allocations
              .filter((a) => a.plannedAmountMinor > 0)
              .map((a, i) => (
                <AllocationRow
                  key={`${a.occurrenceId}-${i}`}
                  {...a}
                  hasShortfall={shortfallMap.has(a.occurrenceId)}
                  shortfallAmount={shortfallMap.get(a.occurrenceId) ?? 0}
                  occMap={occMap}
                />
              ))}
            {/* Shortfall-only entries (zero partial, still need to appear) */}
            {shortfalls
              .filter((s) => !allocations.some((a) => a.occurrenceId === s.occurrenceId && a.plannedAmountMinor > 0))
              .map((s, i) => (
                <div
                  key={`sf-${s.occurrenceId}-${i}`}
                  className="flex items-center justify-between gap-3 py-2.5 border-b border-border last:border-0"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">
                      {occMap.get(s.occurrenceId)?.paymentName ?? s.occurrenceId}
                    </span>
                    <span className="text-xs text-muted-foreground">{s.dueDate}</span>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-sm text-destructive">
                    <XCircle className="h-3.5 w-3.5" aria-hidden />
                    {formatMoney(s.shortfallAmountMinor)} short
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No allocations in this period.
          </div>
        )}
      </div>
    </div>
  );
}
