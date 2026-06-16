'use client';

import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { PiggyBank } from 'lucide-react';
import { db } from '@/db/database';
import { formatMoney } from '@/lib/money';

export function SavingsSummaryCard() {
  const goals = useLiveQuery(
    () => db.savingsGoals.filter((g) => g.status !== 'archived').toArray(),
    []
  );

  const active = (goals ?? []).filter((g) => g.status === 'active');
  const totalSaved = (goals ?? []).reduce((sum, g) => sum + g.savedAmountMinor, 0);
  const totalTarget = (goals ?? []).reduce((sum, g) => sum + g.targetAmountMinor, 0);

  return (
    <Link href="/savings" className="block rounded-lg border border-border bg-card p-4 shadow-sm hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100 dark:bg-violet-950">
          <PiggyBank className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" aria-hidden />
        </span>
        Savings
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-violet-700 dark:text-violet-300">
        {goals === undefined ? (
          <span className="inline-block h-7 w-28 animate-pulse rounded bg-muted" />
        ) : (
          formatMoney(totalSaved)
        )}
      </div>
      {goals !== undefined && goals.length === 0 && (
        <div className="mt-1 text-xs text-muted-foreground">No savings goals yet</div>
      )}
      {goals !== undefined && goals.length > 0 && (
        <div className="mt-1 text-xs text-muted-foreground">
          {active.length} active goal{active.length !== 1 ? 's' : ''}
          {totalTarget > 0 && (
            <> · {Math.min(100, Math.round((totalSaved / totalTarget) * 100))}% of {formatMoney(totalTarget)}</>
          )}
        </div>
      )}
    </Link>
  );
}
