'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Wallet } from 'lucide-react';
import { db } from '@/db/database';
import { formatMoney } from '@/lib/money';

export function AvailableCashCard() {
  const cashSources = useLiveQuery(
    () => db.cashSources.filter((s) => !s.archived && s.includeInPlanner).toArray(),
    []
  );

  const total = (cashSources ?? []).reduce((sum, s) => sum + s.balanceMinor, 0);

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Wallet className="h-4 w-4" aria-hidden />
        Available cash
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">
        {cashSources === undefined ? (
          <span className="h-7 w-28 animate-pulse rounded bg-muted" />
        ) : (
          formatMoney(total)
        )}
      </div>
      {cashSources !== undefined && cashSources.length > 0 && (
        <div className="mt-1 text-xs text-muted-foreground">
          {cashSources.length} source{cashSources.length !== 1 ? 's' : ''} included
        </div>
      )}
      {cashSources !== undefined && cashSources.length === 0 && (
        <div className="mt-1 text-xs text-muted-foreground">No cash sources added yet</div>
      )}
    </div>
  );
}
