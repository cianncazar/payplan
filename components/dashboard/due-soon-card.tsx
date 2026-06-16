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

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" aria-hidden />
        Due in {days} days
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">
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
