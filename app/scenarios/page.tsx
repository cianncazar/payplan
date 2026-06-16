'use client';

import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2, Star, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  listScenarios,
  setActiveScenario,
  deleteScenario,
} from '@/db/repositories/plan-scenarios';
import { formatMoney } from '@/lib/money';
import { PLANNER_STRATEGY_LABELS } from '@/lib/constants';
import type { PlanScenario } from '@/types';
import { PlanHealthBadge } from '@/components/planner/plan-health-badge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

// ─── Comparison table ─────────────────────────────────────────────────────────

function CompareRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{a}</span>
      <span className="font-medium">{b}</span>
    </div>
  );
}

function ScenarioCompare({
  a,
  b,
}: {
  a: PlanScenario;
  b: PlanScenario;
}) {
  const sa = a.summary;
  const sb = b.summary;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-base font-semibold">Comparison</h2>
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 border-b border-border pb-2 text-xs font-semibold text-muted-foreground">
        <span />
        <span className="truncate">{a.name}</span>
        <span className="truncate">{b.name}</span>
      </div>

      <CompareRow
        label="Strategy"
        a={PLANNER_STRATEGY_LABELS[a.strategy]}
        b={PLANNER_STRATEGY_LABELS[b.strategy]}
      />
      <CompareRow
        label="Period"
        a={`${a.startDate} – ${a.endDate}`}
        b={`${b.startDate} – ${b.endDate}`}
      />
      <CompareRow
        label="Opening cash"
        a={formatMoney(a.openingCashMinor)}
        b={formatMoney(b.openingCashMinor)}
      />
      <CompareRow
        label="Cash buffer"
        a={formatMoney(a.cashBufferMinor)}
        b={formatMoney(b.cashBufferMinor)}
      />

      {sa && sb && (
        <>
          <CompareRow
            label="Total planned"
            a={formatMoney(sa.totalPlannedMinor)}
            b={formatMoney(sb.totalPlannedMinor)}
          />
          <CompareRow
            label="Fully funded"
            a={String(sa.fullyFundedCount)}
            b={String(sb.fullyFundedCount)}
          />
          <CompareRow
            label="Shortfalls"
            a={String(sa.shortfallCount)}
            b={String(sb.shortfallCount)}
          />
          <CompareRow
            label="Earliest shortfall"
            a={sa.earliestShortfallDate ?? '—'}
            b={sb.earliestShortfallDate ?? '—'}
          />
          <CompareRow
            label="Lowest balance"
            a={formatMoney(sa.lowestCashBalanceMinor)}
            b={formatMoney(sb.lowestCashBalanceMinor)}
          />
          <CompareRow
            label="Remaining cash"
            a={formatMoney(sa.remainingCashMinor)}
            b={formatMoney(sb.remainingCashMinor)}
          />
        </>
      )}
    </div>
  );
}

// ─── Scenario card ────────────────────────────────────────────────────────────

function ScenarioCard({
  scenario,
  selected,
  onSelect,
  onSetActive,
  onDelete,
}: {
  scenario: PlanScenario;
  selected: boolean;
  onSelect: () => void;
  onSetActive: () => void;
  onDelete: () => void;
}) {
  const s = scenario.summary;

  return (
    <div
      className={`cursor-pointer rounded-lg border bg-card p-4 shadow-sm transition-colors ${
        selected
          ? 'border-primary ring-1 ring-primary'
          : 'border-border hover:border-muted-foreground/40'
      }`}
      onClick={onSelect}
      role="button"
      aria-pressed={selected}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold">{scenario.name}</span>
            {scenario.active && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                Active
              </Badge>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {scenario.startDate} – {scenario.endDate}
          </div>
        </div>
        {s && <PlanHealthBadge health={s.health} />}
      </div>

      <div className="mb-3 text-xs text-muted-foreground">
        {PLANNER_STRATEGY_LABELS[scenario.strategy]}
      </div>

      {s && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-muted-foreground">Planned</div>
            <div className="font-medium tabular-nums">{formatMoney(s.totalPlannedMinor)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Funded</div>
            <div className="font-medium">{s.fullyFundedCount}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Shortfalls</div>
            <div className={`font-medium ${s.shortfallCount > 0 ? 'text-destructive' : ''}`}>
              {s.shortfallCount}
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
        {!scenario.active && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onSetActive}>
            <Star className="mr-1 h-3 w-3" />
            Set active
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto h-7 text-xs text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScenariosPage() {
  const scenarios = useLiveQuery(() => listScenarios(), []);
  const [selected, setSelected] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<PlanScenario | null>(null);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }, []);

  const handleSetActive = useCallback(async (id: string) => {
    try {
      await setActiveScenario(id);
      toast.success('Active plan updated.');
    } catch {
      toast.error('Failed to set active plan.');
    }
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteScenario(deleteTarget.id);
      setSelected((prev) => prev.filter((x) => x !== deleteTarget.id));
      toast.success('Scenario deleted.');
    } catch {
      toast.error('Failed to delete scenario.');
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget]);

  const compareA = scenarios?.find((s) => s.id === selected[0]);
  const compareB = scenarios?.find((s) => s.id === selected[1]);

  const isLoading = scenarios === undefined;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scenarios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compare alternative payment plans side by side. Select up to two scenarios to compare.
        </p>
      </div>

      {/* Comparison panel */}
      {compareA && compareB && (
        <ScenarioCompare a={compareA} b={compareB} />
      )}
      {compareA && !compareB && (
        <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Select a second scenario to compare with <strong>{compareA.name}</strong>.
        </div>
      )}

      {/* Scenario list */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : scenarios.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <BarChart2 className="mx-auto mb-2 h-8 w-8 opacity-30" />
          <p>No scenarios saved yet.</p>
          <p className="mt-1">
            Go to <strong>Planner</strong>, generate a plan, and click{' '}
            <strong>Save as Active Plan</strong> to create your first scenario.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              selected={selected.includes(scenario.id)}
              onSelect={() => toggleSelect(scenario.id)}
              onSetActive={() => handleSetActive(scenario.id)}
              onDelete={() => setDeleteTarget(scenario)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete scenario?"
        description={`"${deleteTarget?.name}" will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
