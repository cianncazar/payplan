'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import { AlertCircle, TrendingUp, Wallet, PiggyBank, AlertTriangle } from 'lucide-react';
import { db } from '@/db/database';
import { formatMoney } from '@/lib/money';
import { formatISODate, parseISODate } from '@/lib/dates';
import { computeShortfallSummary } from '@/lib/calculations/shortfall-summary';
import type { CashFlowOccurrence, CashFlowIncomeEvent } from '@/lib/calculations/cash-flow';
import { DEFAULT_SETTINGS } from '@/lib/constants';

type Insight = {
  key: string;
  icon: React.ElementType;
  label: string;
  href: string;
  palette: string;
};

function addDays(isoDate: string, n: number): string {
  const d = parseISODate(isoDate);
  d.setDate(d.getDate() + n);
  return formatISODate(d);
}

function daysUntil(isoDate: string, todayIso: string): number {
  const today = parseISODate(todayIso);
  const target = parseISODate(isoDate);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function formatDateShort(iso: string): string {
  const d = parseISODate(iso);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export function SmartInsights() {
  const today = formatISODate(new Date());
  const cutoff30 = addDays(today, 29);
  const cutoff7 = addDays(today, 6);

  const overdueOccs = useLiveQuery(
    () =>
      db.paymentOccurrences
        .where('status')
        .equals('overdue')
        .toArray(),
    []
  );
  const upcomingIncome = useLiveQuery(
    () =>
      db.incomeEvents
        .where('expectedDate')
        .between(today, cutoff30, true, true)
        .filter((e) => e.status === 'expected' || e.status === 'received')
        .sortBy('expectedDate'),
    [today, cutoff30]
  );
  const savings = useLiveQuery(
    () => db.savingsGoals.filter((g) => g.status !== 'archived').toArray(),
    []
  );
  const cashSources = useLiveQuery(
    () => db.cashSources.filter((s) => !s.archived && s.includeInPlanner).toArray(),
    []
  );
  const dueIn7 = useLiveQuery(
    () =>
      db.paymentOccurrences
        .where('dueDate')
        .between(today, cutoff7, true, true)
        .filter((o) => o.status !== 'paid' && o.status !== 'waived' && o.status !== 'cancelled')
        .toArray(),
    [today, cutoff7]
  );
  const dueIn30Raw = useLiveQuery(
    () =>
      db.paymentOccurrences
        .where('dueDate')
        .between(today, cutoff30, true, true)
        .filter((o) => o.status !== 'paid' && o.status !== 'waived' && o.status !== 'cancelled')
        .toArray(),
    [today, cutoff30]
  );
  const settings = useLiveQuery(() => db.appSettings.get('local-settings'), []);

  const isLoading =
    overdueOccs === undefined ||
    upcomingIncome === undefined ||
    savings === undefined ||
    cashSources === undefined ||
    dueIn7 === undefined ||
    dueIn30Raw === undefined;

  if (isLoading) return null;

  const insights: Insight[] = [];

  // 1. Overdue payments
  if (overdueOccs.length > 0) {
    insights.push({
      key: 'overdue',
      icon: AlertCircle,
      label: `${overdueOccs.length} payment${overdueOccs.length !== 1 ? 's' : ''} overdue`,
      href: '/payments',
      palette:
        'border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10',
    });
  }

  // 2. Shortfall warning
  const bufferMinor = settings?.minimumCashBufferMinor ?? DEFAULT_SETTINGS.minimumCashBufferMinor;
  const openingCash = cashSources.reduce((sum, s) => sum + s.balanceMinor, 0);
  const occurrences: CashFlowOccurrence[] = (dueIn30Raw ?? []).map((o) => ({
    occurrenceId: o.id,
    paymentName: o.paymentId,
    dueDate: o.dueDate,
    requiredAmountMinor: Math.max(0, o.dueAmountMinor - o.paidAmountMinor),
    feeAmountMinor: o.feeAmountMinor,
    amountIsEstimate: o.amountIsEstimate,
  }));
  const incomeForSummary: CashFlowIncomeEvent[] = (upcomingIncome ?? []).map((e) => ({
    id: e.id,
    date: e.expectedDate,
    amountMinor: e.receivedAmountMinor ?? e.expectedAmountMinor,
    isReceived: e.status === 'received',
    label: 'Income',
  }));

  if (openingCash > 0 || occurrences.length > 0) {
    const summary = computeShortfallSummary({
      todayIso: today,
      horizonDays: 30,
      openingCashMinor: openingCash,
      minimumCashBufferMinor: bufferMinor,
      occurrences,
      incomeEvents: incomeForSummary,
      allowanceReservations: [],
    });

    if (summary.health === 'shortfall' && summary.firstShortfallDate) {
      insights.push({
        key: 'shortfall',
        icon: AlertTriangle,
        label: `${formatMoney(summary.gapMinor)} gap on ${formatDateShort(summary.firstShortfallDate)}`,
        href: '/planner',
        palette: 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60',
      });
    }

    // 3. Low cash: available cash < 7-day obligations
    const totalDue7 = (dueIn7 ?? []).reduce(
      (sum, o) => sum + Math.max(0, o.dueAmountMinor - o.paidAmountMinor),
      0
    );
    if (totalDue7 > 0 && openingCash < totalDue7 && summary.health !== 'shortfall') {
      insights.push({
        key: 'low_cash',
        icon: Wallet,
        label: `Low cash: ${formatMoney(openingCash)} vs ${formatMoney(totalDue7)} due`,
        href: '/cash-sources',
        palette: 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60',
      });
    }
  }

  // 4. Payday: next income event
  const nextIncome = (upcomingIncome ?? []).find(
    (e) => e.expectedDate > today && (e.status === 'expected' || e.status === 'received')
  );
  if (nextIncome) {
    const days = daysUntil(nextIncome.expectedDate, today);
    if (days <= 7) {
      insights.push({
        key: 'payday',
        icon: TrendingUp,
        label: days === 0 ? 'Payday today' : days === 1 ? 'Payday tomorrow' : `Payday in ${days} days`,
        href: '/income',
        palette:
          'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60',
      });
    }
  }

  // 5. Savings milestone: any goal at or past 50%
  const milestoneGoal = (savings ?? []).find((g) => {
    if (!g.targetAmountMinor || g.targetAmountMinor === 0) return false;
    const pct = g.savedAmountMinor / g.targetAmountMinor;
    return pct >= 0.5;
  });
  if (milestoneGoal && milestoneGoal.targetAmountMinor) {
    const pct = Math.round((milestoneGoal.savedAmountMinor / milestoneGoal.targetAmountMinor) * 100);
    insights.push({
      key: 'savings_milestone',
      icon: PiggyBank,
      label: `${milestoneGoal.name} ${pct}% complete`,
      href: '/savings',
      palette:
        'border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-950/60',
    });
  }

  if (insights.length === 0) return null;

  const visible = insights.slice(0, 4);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
      {visible.map(({ key, icon: Icon, label, href, palette }) => (
        <Link
          key={key}
          href={href}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${palette}`}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{label}</span>
        </Link>
      ))}
    </div>
  );
}
