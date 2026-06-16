'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/db/database';
import { formatMoney } from '@/lib/money';
import { formatISODate } from '@/lib/dates';

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return formatISODate(d);
}

function daysUntil(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export function UpcomingPaymentsList({ maxItems = 5 }: { maxItems?: number }) {
  const today = formatISODate(new Date());
  const cutoff = addDays(14);

  const occurrences = useLiveQuery(
    () =>
      db.paymentOccurrences
        .where('dueDate')
        .between(today, cutoff, true, true)
        .filter((o) => o.status !== 'paid' && o.status !== 'waived' && o.status !== 'cancelled')
        .sortBy('dueDate'),
    [today, cutoff]
  );

  const payments = useLiveQuery(() => db.payments.toArray(), []);
  const paymentMap = new Map((payments ?? []).map((p) => [p.id, p]));

  const topItems = (occurrences ?? []).slice(0, maxItems);

  if (occurrences === undefined) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  if (topItems.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No payments due in the next 14 days.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold">Upcoming Payments</h2>
      </div>
      <ul className="divide-y divide-border">
        {topItems.map((occ) => {
          const name = paymentMap.get(occ.paymentId)?.name ?? 'Unknown payment';
          const n = daysUntil(occ.dueDate);
          const remaining = Math.max(0, occ.dueAmountMinor - occ.paidAmountMinor);
          const isOverdue = n < 0;
          const isToday = n === 0;

          return (
            <li
              key={occ.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{name}</span>
                <span
                  className={`flex items-center gap-1 text-xs ${
                    isOverdue
                      ? 'text-destructive'
                      : isToday
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-muted-foreground'
                  }`}
                >
                  {isOverdue && <AlertCircle className="h-3 w-3" aria-hidden />}
                  {isToday && <Clock className="h-3 w-3" aria-hidden />}
                  {isOverdue
                    ? `Overdue by ${Math.abs(n)} day${Math.abs(n) !== 1 ? 's' : ''}`
                    : isToday
                    ? 'Due today'
                    : `Due in ${n} day${n !== 1 ? 's' : ''}`}
                </span>
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums">
                {formatMoney(remaining)}
              </span>
            </li>
          );
        })}
      </ul>
      {(occurrences?.length ?? 0) > maxItems && (
        <div className="border-t border-border px-4 py-2.5 text-center">
          <Link href="/payments" className="text-xs text-primary hover:underline">
            See all {occurrences?.length} upcoming payments →
          </Link>
        </div>
      )}
    </div>
  );
}
