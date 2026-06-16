'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight, CalendarDays, List } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, parseISO } from 'date-fns';
import { db } from '@/db/database';
import { formatMoney } from '@/lib/money';
import type { PaymentOccurrence, IncomeEvent } from '@/types';
import { Button } from '@/components/ui/button';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoFromDate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function occurrenceStatusColor(status: PaymentOccurrence['status']): string {
  switch (status) {
    case 'overdue': return 'bg-destructive/15 text-destructive';
    case 'paid': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
    case 'partially_paid': return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
    case 'waived':
    case 'cancelled': return 'bg-muted text-muted-foreground';
    default: return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
  }
}

function incomeStatusColor(status: IncomeEvent['status']): string {
  switch (status) {
    case 'received': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
    case 'delayed': return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
    case 'cancelled': return 'bg-muted text-muted-foreground';
    default: return 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300';
  }
}

type CalendarEvent = {
  key: string;
  date: string;
  label: string;
  amountMinor: number;
  colorClass: string;
  type: 'payment' | 'income';
};

// ─── Month grid ───────────────────────────────────────────────────────────────

function MonthGrid({
  viewMonth,
  events,
}: {
  viewMonth: Date;
  events: CalendarEvent[];
}) {
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  const cur = new Date(gridStart);
  while (cur <= gridEnd) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [events]);

  const today = isoFromDate(new Date());

  return (
    <div>
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-px border-b border-border pb-1 text-center text-xs font-medium text-muted-foreground">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px">
        {days.map((day) => {
          const iso = isoFromDate(day);
          const dayEvents = eventsByDate.get(iso) ?? [];
          const isCurrentMonth = isSameMonth(day, viewMonth);
          const isToday = iso === today;

          return (
            <div
              key={iso}
              className={`min-h-[72px] rounded p-1 text-xs ${
                isCurrentMonth ? '' : 'opacity-30'
              }`}
            >
              <div
                className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full font-medium ${
                  isToday
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground'
                }`}
              >
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((e) => (
                  <div
                    key={e.key}
                    className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${e.colorClass}`}
                    title={`${e.label} — ${formatMoney(e.amountMinor)}`}
                  >
                    {e.label}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="px-1 text-[10px] text-muted-foreground">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Agenda view ──────────────────────────────────────────────────────────────

function AgendaView({ events }: { events: CalendarEvent[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
    for (const e of sorted) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [events]);

  if (grouped.size === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No events this month.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {[...grouped.entries()].map(([date, dayEvents]) => (
        <div key={date}>
          <div className="mb-1.5 text-xs font-semibold text-muted-foreground">
            {format(parseISO(date), 'EEE, MMM d')}
          </div>
          <div className="space-y-1.5">
            {dayEvents.map((e) => (
              <div
                key={e.key}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${e.colorClass}`}>
                    {e.type === 'income' ? 'Income' : 'Payment'}
                  </span>
                  <span className="truncate text-sm">{e.label}</span>
                </div>
                <span className="ml-2 shrink-0 text-sm font-medium tabular-nums">
                  {formatMoney(e.amountMinor)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [view, setView] = useState<'month' | 'agenda'>('month');

  const monthStart = isoFromDate(startOfMonth(viewMonth));
  const monthEnd = isoFromDate(endOfMonth(viewMonth));

  const occurrences = useLiveQuery(
    () =>
      db.paymentOccurrences
        .where('dueDate')
        .between(monthStart, monthEnd, true, true)
        .toArray(),
    [monthStart, monthEnd]
  );

  const incomeEvents = useLiveQuery(
    () =>
      db.incomeEvents
        .where('expectedDate')
        .between(monthStart, monthEnd, true, true)
        .toArray(),
    [monthStart, monthEnd]
  );

  // Load payment names for occurrences
  const payments = useLiveQuery(
    async () => {
      if (!occurrences || occurrences.length === 0) return new Map<string, string>();
      const ids = [...new Set(occurrences.map((o) => o.paymentId))];
      const records = await db.payments.bulkGet(ids);
      return new Map(
        records
          .filter((p): p is NonNullable<typeof p> => p !== undefined)
          .map((p) => [p.id, p.name])
      );
    },
    [occurrences]
  );

  const events: CalendarEvent[] = useMemo(() => {
    const result: CalendarEvent[] = [];
    for (const o of occurrences ?? []) {
      result.push({
        key: `occ-${o.id}`,
        date: o.dueDate,
        label: payments?.get(o.paymentId) ?? 'Payment',
        amountMinor: o.dueAmountMinor,
        colorClass: occurrenceStatusColor(o.status),
        type: 'payment',
      });
    }
    for (const e of incomeEvents ?? []) {
      result.push({
        key: `inc-${e.id}`,
        date: e.expectedDate,
        label: 'Income',
        amountMinor: e.status === 'received' ? (e.receivedAmountMinor ?? e.expectedAmountMinor) : e.expectedAmountMinor,
        colorClass: incomeStatusColor(e.status),
        type: 'income',
      });
    }
    return result;
  }, [occurrences, incomeEvents, payments]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Payments and income for {format(viewMonth, 'MMMM yyyy')}.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('month')}
            aria-pressed={view === 'month'}
            className={view === 'month' ? 'bg-muted' : ''}
          >
            <CalendarDays className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('agenda')}
            aria-pressed={view === 'agenda'}
            className={view === 'agenda' ? 'bg-muted' : ''}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setViewMonth((m) => subMonths(m, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">{format(viewMonth, 'MMMM yyyy')}</span>
        <Button variant="outline" size="sm" onClick={() => setViewMonth((m) => addMonths(m, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
          Scheduled
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          Overdue
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          Paid / Received
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
          Expected income
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          Partial / Delayed
        </span>
      </div>

      {/* View */}
      {view === 'month' ? (
        <MonthGrid viewMonth={viewMonth} events={events} />
      ) : (
        <AgendaView events={events} />
      )}
    </div>
  );
}
