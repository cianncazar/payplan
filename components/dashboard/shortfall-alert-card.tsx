'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/db/database';
import { formatISODate, parseISODate } from '@/lib/dates';
import { DEFAULT_SETTINGS } from '@/lib/constants';
import { computeShortfallSummary } from '@/lib/calculations/shortfall-summary';
import type { CashFlowOccurrence, CashFlowIncomeEvent, CashFlowAllowanceReservation } from '@/lib/calculations/cash-flow';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFormatMoney } from '@/hooks/use-format-money';

function addDays(isoDate: string, n: number): string {
  const d = parseISODate(isoDate);
  d.setDate(d.getDate() + n);
  return formatISODate(d);
}

function formatDateShort(iso: string): string {
  const d = parseISODate(iso);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export function ShortfallAlertCard() {
  const fmt = useFormatMoney();
  const today = formatISODate(new Date());
  const cutoff = addDays(today, 29);

  const cashSources = useLiveQuery(
    () => db.cashSources.filter((s) => !s.archived && s.includeInPlanner).toArray(),
    []
  );
  const rawOccurrences = useLiveQuery(
    () =>
      db.paymentOccurrences
        .where('dueDate')
        .between(today, cutoff, true, true)
        .filter((o) => o.status !== 'paid' && o.status !== 'waived' && o.status !== 'cancelled')
        .toArray(),
    [today, cutoff]
  );
  const rawIncome = useLiveQuery(
    () =>
      db.incomeEvents
        .where('expectedDate')
        .between(today, cutoff, true, true)
        .filter((e) => e.status !== 'cancelled')
        .toArray(),
    [today, cutoff]
  );
  const allowanceBudgets = useLiveQuery(
    () => db.allowanceBudgets.filter((b) => b.status === 'active').toArray(),
    []
  );
  const settings = useLiveQuery(() => db.appSettings.get('local-settings'), []);

  const isLoading =
    cashSources === undefined ||
    rawOccurrences === undefined ||
    rawIncome === undefined ||
    allowanceBudgets === undefined;

  if (isLoading) {
    return (
      <div className="h-20 animate-pulse rounded-lg bg-muted" />
    );
  }

  const openingCash = cashSources.reduce((sum, s) => sum + s.balanceMinor, 0);
  const bufferMinor = settings?.minimumCashBufferMinor ?? DEFAULT_SETTINGS.minimumCashBufferMinor;

  const occurrences: CashFlowOccurrence[] = rawOccurrences.map((o) => ({
    occurrenceId: o.id,
    paymentName: o.paymentId,
    dueDate: o.dueDate,
    requiredAmountMinor: Math.max(0, o.dueAmountMinor - o.paidAmountMinor),
    feeAmountMinor: o.feeAmountMinor,
    amountIsEstimate: o.amountIsEstimate,
  }));

  const incomeEvents: CashFlowIncomeEvent[] = rawIncome.map((e) => ({
    id: e.id,
    date: e.expectedDate,
    amountMinor: e.receivedAmountMinor ?? e.expectedAmountMinor,
    isReceived: e.status === 'received',
    label: 'Income',
  }));

  const allowanceReservations: CashFlowAllowanceReservation[] = allowanceBudgets.map((b) => {
    const start = parseISODate(b.startDate);
    const end = parseISODate(b.endDate);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
    const daily = b.dailyTargetMinor ?? Math.floor(b.totalBudgetMinor / days);
    return { budgetId: b.id, startDate: b.startDate, endDate: b.endDate, dailyAmountMinor: daily };
  });

  const summary = computeShortfallSummary({
    todayIso: today,
    horizonDays: 30,
    openingCashMinor: openingCash,
    minimumCashBufferMinor: bufferMinor,
    occurrences,
    incomeEvents,
    allowanceReservations,
  });

  const config = {
    not_enough_data: {
      border: 'border-border',
      bg: 'bg-card',
      iconBg: 'bg-muted',
      iconFg: 'text-muted-foreground',
      Icon: Info,
      label: 'text-foreground',
      sub: 'text-muted-foreground',
    },
    on_track: {
      border: 'border-emerald-200 dark:border-emerald-800',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900',
      iconFg: 'text-emerald-600 dark:text-emerald-400',
      Icon: CheckCircle2,
      label: 'text-emerald-800 dark:text-emerald-200',
      sub: 'text-emerald-700 dark:text-emerald-300',
    },
    tight: {
      border: 'border-amber-200 dark:border-amber-800',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      iconBg: 'bg-amber-100 dark:bg-amber-900',
      iconFg: 'text-amber-600 dark:text-amber-400',
      Icon: AlertTriangle,
      label: 'text-amber-800 dark:text-amber-200',
      sub: 'text-amber-700 dark:text-amber-300',
    },
    shortfall: {
      border: 'border-destructive/40',
      bg: 'bg-destructive/5',
      iconBg: 'bg-destructive/10',
      iconFg: 'text-destructive',
      Icon: AlertCircle,
      label: 'text-destructive',
      sub: 'text-destructive/80',
    },
  } as const;

  const c = config[summary.health];
  const Icon = c.Icon;

  let headline = '';
  let detail = '';

  switch (summary.health) {
    case 'not_enough_data':
      headline = 'Add your cash and bills to see your coverage';
      detail = 'PayPlan will show whether you have enough money before each payment is due.';
      break;
    case 'on_track':
      headline = summary.coversThroughDate
        ? `You're covered through ${formatDateShort(summary.coversThroughDate)}`
        : 'You\'re covered for the next 30 days';
      detail = `Lowest balance: ${fmt(summary.lowestBalanceMinor)}`;
      break;
    case 'tight':
      headline = 'Your balance gets tight';
      detail = `Lowest projected balance: ${fmt(summary.lowestBalanceMinor)} — consider adding funds.`;
      break;
    case 'shortfall':
      headline = `${fmt(summary.gapMinor)} gap on ${formatDateShort(summary.firstShortfallDate!)}`;
      detail = `Your cash won't cover all payments. Open the Planner to find a solution.`;
      break;
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4',
        c.border,
        c.bg
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          c.iconBg
        )}
      >
        <Icon className={cn('h-4 w-4', c.iconFg)} aria-hidden />
      </span>
      <div className="flex flex-1 flex-col gap-1">
        <p className={cn('text-sm font-semibold leading-snug', c.label)}>{headline}</p>
        <p className={cn('text-xs leading-snug', c.sub)}>{detail}</p>
      </div>
      {summary.health === 'shortfall' && (
        <Link
          href="/planner"
          className={cn(buttonVariants({ variant: 'destructive', size: 'sm' }), 'shrink-0')}
        >
          Open Planner
        </Link>
      )}
      {summary.health === 'not_enough_data' && (
        <Link
          href="/cash-sources"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0')}
        >
          Get started
        </Link>
      )}
    </div>
  );
}
