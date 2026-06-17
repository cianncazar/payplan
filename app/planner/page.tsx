'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/db/database';
import { getOrCreateSettings, getSettings } from '@/db/repositories/settings';
import { saveScenarioAllocations } from '@/db/repositories/plan-allocations';
import {
  createScenario,
  setActiveScenario,
  saveScenarioSummary,
} from '@/db/repositories/plan-scenarios';
import { runPlanner } from '@/lib/calculations/planner';
import { countInclusiveDays } from '@/lib/calculations/allowance';
import { formatISODate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { PLANNER_STRATEGY_LABELS } from '@/lib/constants';
import type {
  PlannerInput,
  PlannerResult,
  PlannerPaymentOccurrence,
  PlannerStrategy,
  AllowanceReservation,
} from '@/types';
import { PlanView } from '@/components/planner/plan-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/forms/money-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today(): string {
  return formatISODate(new Date());
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return formatISODate(d);
}

const ALL_STRATEGIES: PlannerStrategy[] = [
  'deadline_first',
  'essential_first',
  'minimums_first',
  'smallest_balance_first',
  'highest_interest_first',
  'lowest_cash_flow_risk',
  'custom',
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlannerPage() {
  const todayStr = today();
  const defaultEnd = addDays(todayStr, 29);

  // ── Form state ──
  const [periodStart, setPeriodStart] = useState(todayStr);
  const [periodEnd, setPeriodEnd] = useState(defaultEnd);
  // User overrides: null = fall back to settings default
  const [strategyOverride, setStrategyOverride] = useState<PlannerStrategy | null>(null);
  const [includeExpectedOverride, setIncludeExpectedOverride] = useState<boolean | null>(null);
  const [bufferMinor, setBufferMinor] = useState(0);
  const [overrideOpeningCash, setOverrideOpeningCash] = useState<number | undefined>();

  // ── Result state ──
  const [result, setResult] = useState<PlannerResult | null>(null);
  const [plannerOccs, setPlannerOccs] = useState<PlannerPaymentOccurrence[]>([]);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Live data from DB ──
  const cashSources = useLiveQuery(
    () => db.cashSources.filter((s) => !s.archived && s.includeInPlanner).toArray(),
    []
  );
  const settings = useLiveQuery(() => getSettings(), []);

  // Seed default settings on first load (write must happen outside liveQuery)
  useEffect(() => {
    getOrCreateSettings().catch(() => {});
  }, []);

  const totalCashMinor = useMemo(
    () => (cashSources ?? []).reduce((s, c) => s + c.balanceMinor, 0),
    [cashSources]
  );

  const openingCashMinor = overrideOpeningCash ?? totalCashMinor;

  // Derive effective values: user override takes priority, then settings default, then fallback.
  const strategy = strategyOverride ?? settings?.defaultStrategy ?? 'deadline_first';
  const includeExpected = includeExpectedOverride ?? settings?.includeExpectedIncomeDefault ?? false;

  // ── Generate plan ──
  const generate = useCallback(async () => {
    setRunning(true);
    try {
      // Load occurrences due in the period
      const rawOccs = await db.paymentOccurrences
        .where('dueDate')
        .between(periodStart, periodEnd, true, true)
        .toArray();

      // Load their parent payments
      const paymentIds = [...new Set(rawOccs.map((o) => o.paymentId))];
      const payments = await db.payments.bulkGet(paymentIds);
      const paymentMap = new Map(
        payments.filter((p): p is NonNullable<typeof p> => p !== undefined).map((p) => [p.id, p])
      );

      const occs: PlannerPaymentOccurrence[] = rawOccs
        .filter((o) => {
          const p = paymentMap.get(o.paymentId);
          return p && p.status !== 'paused' && p.status !== 'archived';
        })
        .map((o) => {
          const p = paymentMap.get(o.paymentId)!;
          return {
            id: o.id,
            paymentId: o.paymentId,
            paymentName: p.name,
            dueDate: o.dueDate,
            graceDate: o.graceDate,
            dueAmountMinor: o.dueAmountMinor,
            minimumAmountMinor: o.minimumAmountMinor,
            paidAmountMinor: o.paidAmountMinor,
            feeAmountMinor: o.feeAmountMinor,
            status: o.status,
            essential: p.essential,
            priority: p.priority,
            annualInterestRate: p.annualInterestRate,
            currentBalanceMinor: p.currentBalanceMinor,
            amountIsEstimate: o.amountIsEstimate,
            manuallyOverridden: o.manuallyOverridden,
          };
        });

      // Load income events
      const incomeEvents = await db.incomeEvents
        .where('expectedDate')
        .between(periodStart, periodEnd, true, true)
        .toArray();

      const plannerIncome = incomeEvents
        .filter((e) => e.status !== 'cancelled')
        .map((e) => ({
          id: e.id,
          expectedDate: e.expectedDate,
          amountMinor:
            e.status === 'received'
              ? (e.receivedAmountMinor ?? e.expectedAmountMinor)
              : e.expectedAmountMinor,
          status: e.status,
        }));

      // Load active allowance budgets
      const budgets = await db.allowanceBudgets
        .where('status')
        .equals('active')
        .toArray();

      const allowanceReservations: AllowanceReservation[] = budgets
        .filter((b) => b.endDate >= periodStart && b.startDate <= periodEnd)
        .map((b) => ({
          budgetId: b.id,
          startDate: b.startDate,
          endDate: b.endDate,
          dailyAmountMinor:
            b.dailyTargetMinor ??
            Math.floor(
              b.totalBudgetMinor /
                Math.max(1, countInclusiveDays(b.startDate, b.endDate))
            ),
        }));

      // Load manual cash adjustments in the period
      const manualAdjs = await db.manualCashAdjustments
        .where('date')
        .between(periodStart, periodEnd, true, true)
        .toArray();

      const plannerInput: PlannerInput = {
        periodStart,
        periodEnd,
        openingCashMinor,
        minimumCashBufferMinor: bufferMinor,
        allowanceReservations,
        incomeEvents: plannerIncome,
        occurrences: occs,
        manualAdjustments: manualAdjs,
        strategy,
        includeExpectedIncome: includeExpected,
      };

      const planResult = runPlanner(plannerInput);
      setResult(planResult);
      setPlannerOccs(occs);
    } catch {
      toast.error('Failed to generate plan. Please try again.');
    } finally {
      setRunning(false);
    }
  }, [periodStart, periodEnd, openingCashMinor, bufferMinor, strategy, includeExpected]);

  // ── Save active plan ──
  const savePlan = useCallback(async () => {
    if (!result) return;
    setSaving(true);
    try {
      const scenario = await createScenario({
        name: `Plan ${periodStart} – ${periodEnd}`,
        strategy,
        startDate: periodStart,
        endDate: periodEnd,
        openingCashMinor,
        cashBufferMinor: bufferMinor,
        reservedAllowanceMinor: 0,
        includeExpectedIncome: includeExpected,
        settings: {},
        summary: result.summary,
        active: false,
      });
      await saveScenarioAllocations(scenario.id, result.allocations);
      await setActiveScenario(scenario.id);
      await saveScenarioSummary(scenario.id, result.summary);
      toast.success('Plan saved as active scenario.');
    } catch {
      toast.error('Failed to save plan.');
    } finally {
      setSaving(false);
    }
  }, [result, periodStart, periodEnd, openingCashMinor, bufferMinor, strategy, includeExpected]);

  // Seed the cash buffer from settings once (only if user hasn't touched it).
  useEffect(() => {
    if (settings?.minimumCashBufferMinor) {
      setBufferMinor((prev) => (prev === 0 ? settings.minimumCashBufferMinor : prev));
    }
  }, [settings?.minimumCashBufferMinor]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Planner</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate a payment plan for any period using your current data.
        </p>
      </div>

      {/* Configuration form */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Configure plan</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Period */}
          <div className="space-y-1.5">
            <Label htmlFor="pp-start">Period start</Label>
            <Input
              id="pp-start"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pp-end">Period end</Label>
            <Input
              id="pp-end"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>

          {/* Strategy */}
          <div className="space-y-1.5">
            <Label htmlFor="pp-strategy">Strategy</Label>
            <Select
              value={strategy}
              onValueChange={(v) => v && setStrategyOverride(v as PlannerStrategy)}
            >
              <SelectTrigger id="pp-strategy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STRATEGIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PLANNER_STRATEGY_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cash buffer */}
          <div className="space-y-1.5">
            <Label htmlFor="pp-buffer">Cash buffer</Label>
            <MoneyInput
              id="pp-buffer"
              value={bufferMinor}
              onChange={(v) => setBufferMinor(v ?? 0)}
            />
          </div>

          {/* Opening cash override */}
          <div className="space-y-1.5">
            <Label htmlFor="pp-cash">
              Opening cash
              {cashSources !== undefined && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({formatMoney(totalCashMinor)} from {cashSources.length} source
                  {cashSources.length !== 1 ? 's' : ''})
                </span>
              )}
            </Label>
            <MoneyInput
              id="pp-cash"
              value={overrideOpeningCash ?? totalCashMinor}
              onChange={(v) => setOverrideOpeningCash(v === totalCashMinor ? undefined : v)}
            />
          </div>

          {/* Include expected income toggle */}
          <div className="flex items-end pb-0.5">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeExpected}
                onChange={(e) => setIncludeExpectedOverride(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Include expected (unconfirmed) income
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={generate} disabled={running || !periodStart || !periodEnd}>
            {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Generate Plan
          </Button>
          {result && (
            <Button variant="outline" onClick={savePlan} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Save as Active Plan
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <PlanView result={result} occurrences={plannerOccs} cashBufferMinor={bufferMinor} />
      )}

      {!result && !running && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Configure the period and strategy above, then click <strong>Generate Plan</strong>.
        </div>
      )}
    </div>
  );
}
