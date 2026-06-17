'use client';

import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { PiggyBank, CheckCircle2 } from 'lucide-react';
import { db } from '@/db/database';
import { cn } from '@/lib/utils';
import { useFormatMoney } from '@/hooks/use-format-money';

const MAX_SHOWN = 4;

export function SavingsSummaryCard() {
  const fmt = useFormatMoney();
  const goals = useLiveQuery(
    () => db.savingsGoals.filter((g) => g.status !== 'archived').toArray(),
    []
  );

  const loading = goals === undefined;
  const active = (goals ?? []).filter((g) => g.status === 'active');
  const completed = (goals ?? []).filter((g) => g.status === 'completed');
  const displayed = [...active, ...completed].slice(0, MAX_SHOWN);
  const overflow = (goals ?? []).length - MAX_SHOWN;

  const totalSaved = (goals ?? []).reduce((sum, g) => sum + g.savedAmountMinor, 0);
  const totalTarget = (goals ?? []).reduce((sum, g) => sum + g.targetAmountMinor, 0);

  return (
    <Link
      href="/savings"
      className="block rounded-lg border border-border bg-card p-4 shadow-sm hover:bg-accent/50 transition-colors"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100 dark:bg-violet-950">
            <PiggyBank className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" aria-hidden />
          </span>
          Savings
        </div>
        {!loading && goals!.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {active.length} active{completed.length > 0 && ` · ${completed.length} done`}
          </span>
        )}
      </div>

      {/* Total */}
      <div className="mt-2 text-2xl font-semibold tabular-nums text-violet-700 dark:text-violet-300">
        {loading ? (
          <span className="inline-block h-7 w-28 animate-pulse rounded bg-muted" />
        ) : (
          fmt(totalSaved)
        )}
      </div>

      {!loading && totalTarget > 0 && (
        <p className="mt-0.5 text-xs text-muted-foreground">
          of {fmt(totalTarget)} target ·{' '}
          {Math.min(100, Math.round((totalSaved / totalTarget) * 100))}% overall
        </p>
      )}

      {/* Empty state */}
      {!loading && goals!.length === 0 && (
        <p className="mt-1 text-xs text-muted-foreground">No savings goals yet</p>
      )}

      {/* Per-goal progress */}
      {!loading && displayed.length > 0 && (
        <div className="mt-4 space-y-3">
          {displayed.map((goal) => {
            const pct =
              goal.targetAmountMinor > 0
                ? Math.min(100, Math.round((goal.savedAmountMinor / goal.targetAmountMinor) * 100))
                : 0;
            const done = goal.status === 'completed';

            return (
              <div key={goal.id}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {done && (
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" aria-hidden />
                    )}
                    <span className="truncate text-xs font-medium text-foreground">
                      {goal.name}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                    {fmt(goal.savedAmountMinor)}
                    {goal.targetAmountMinor > 0 && (
                      <span className="text-muted-foreground/60"> / {fmt(goal.targetAmountMinor)}</span>
                    )}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      done ? 'bg-emerald-500' : 'bg-violet-500'
                    )}
                    style={{ width: `${pct}%` }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${goal.name}: ${pct}%`}
                  />
                </div>
              </div>
            );
          })}

          {overflow > 0 && (
            <p className="text-xs text-muted-foreground">+{overflow} more goal{overflow !== 1 ? 's' : ''}</p>
          )}
        </div>
      )}
    </Link>
  );
}
