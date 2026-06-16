'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Calendar } from 'lucide-react';
import { db } from '@/db/database';
import { formatMoney } from '@/lib/money';
import { formatISODate } from '@/lib/dates';

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return formatISODate(d);
}

const PALETTE = {
  7:  { icon: 'bg-amber-100 dark:bg-amber-950', iconFg: 'text-amber-600 dark:text-amber-400', amount: 'text-amber-700 dark:text-amber-300' },
  14: { icon: 'bg-blue-100 dark:bg-blue-950',   iconFg: 'text-blue-600 dark:text-blue-400',   amount: 'text-blue-700 dark:text-blue-300'   },
  30: { icon: 'bg-blue-100 dark:bg-blue-950',   iconFg: 'text-blue-600 dark:text-blue-400',   amount: 'text-blue-700 dark:text-blue-300'   },
} as const;

export function DueSoonCard({ days = 7 }: { days?: 7 | 14 | 30 }) {
  const today = formatISODate(new Date());
  const cutoff = addDays(days);

  const occurrences = useLiveQuery(
    () =>
      db.paymentOccurrences
        .where('dueDate')
        .between(today, cutoff, true, true)
        .filter((o) => o.status !== 'paid' && o.status !== 'waived' && o.status !== 'cancelled')
        .toArray(),
    [today, cutoff]
  );

  const totalDue = (occurrences ?? []).reduce(
    (sum, o) => sum + Math.max(0, o.dueAmountMinor - o.paidAmountMinor),
    0
  );

  const palette = PALETTE[days];

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className={`flex h-6 w-6 items-center justify-center rounded-md ${palette.icon}`}>
          <Calendar className={`h-3.5 w-3.5 ${palette.iconFg}`} aria-hidden />
        </span>
        Due in {days} days
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${palette.amount}`}>
        {occurrences === undefined ? (
          <span className="block h-7 w-24 animate-pulse rounded bg-muted" />
        ) : (
          formatMoney(totalDue)
        )}
      </div>
      {occurrences !== undefined && (
        <div className="mt-1 text-xs text-muted-foreground">
          {occurrences.length} payment{occurrences.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
