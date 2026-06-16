'use client';

import * as React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, parseISO } from 'date-fns';
import {
  ChevronDown,
  ChevronUp,
  Edit,
  MoreHorizontal,
  PiggyBank,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { SavingsGoalForm } from '@/components/savings/savings-goal-form';
import { SavingsDepositForm } from '@/components/savings/savings-deposit-form';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import {
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  listSavingsGoals,
  addSavingsDeposit,
  listSavingsDeposits,
  deleteSavingsDeposit,
} from '@/db/repositories';
import { formatMoney } from '@/lib/money';
import type { SavingsGoal, SavingsDeposit } from '@/types';

const STATUS_LABELS: Record<SavingsGoal['status'], string> = {
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
};

const STATUS_VARIANTS: Record<SavingsGoal['status'], 'default' | 'secondary' | 'outline'> = {
  active: 'secondary',
  completed: 'default',
  archived: 'outline',
};

function GoalRow({ goal }: { goal: SavingsGoal }) {
  const [expanded, setExpanded] = React.useState(false);
  const [depositOpen, setDepositOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState(false);
  const [depositToDelete, setDepositToDelete] = React.useState<SavingsDeposit | null>(null);

  const deposits = useLiveQuery(
    () => (expanded ? listSavingsDeposits(goal.id) : Promise.resolve(null)),
    [expanded, goal.id]
  );

  const pct =
    goal.targetAmountMinor > 0
      ? Math.min(100, Math.round((goal.savedAmountMinor / goal.targetAmountMinor) * 100))
      : 0;

  const remaining = goal.targetAmountMinor - goal.savedAmountMinor;

  async function handleSaveGoal(data: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>) {
    await updateSavingsGoal(goal.id, data);
    toast.success('Goal updated.');
    setEditOpen(false);
  }

  async function handleDeposit(data: Omit<SavingsDeposit, 'id' | 'createdAt' | 'updatedAt'>) {
    await addSavingsDeposit(data);
    toast.success('Deposit recorded.');
    setDepositOpen(false);
    setExpanded(true);
  }

  async function handleDeleteGoal() {
    await deleteSavingsGoal(goal.id);
    toast.success('Goal deleted.');
  }

  async function handleDeleteDeposit() {
    if (!depositToDelete) return;
    await deleteSavingsDeposit(depositToDelete.id);
    toast.success('Deposit removed.');
    setDepositToDelete(null);
  }

  return (
    <li>
      <Card className="p-4 space-y-3">
        {/* Goal header */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium truncate">{goal.name}</span>
              <Badge variant={STATUS_VARIANTS[goal.status]} className="shrink-0">
                {STATUS_LABELS[goal.status]}
              </Badge>
            </div>
            {goal.targetDate && (
              <p className="text-xs text-muted-foreground">
                Target: {format(parseISO(goal.targetDate), 'MMM d, yyyy')}
              </p>
            )}
            {goal.notes && (
              <p className="text-xs text-muted-foreground truncate">{goal.notes}</p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDepositOpen(true)}
              className="text-xs"
              disabled={goal.status === 'archived'}
            >
              <Plus className="h-3.5 w-3.5 mr-1" aria-hidden />
              Add
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon" />}
                aria-label={`Actions for ${goal.name}`}
              >
                <MoreHorizontal aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Edit aria-hidden="true" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-variant="destructive"
                  onClick={() => setToDelete(true)}
                >
                  <Trash2 aria-hidden="true" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <Progress value={pct} className="h-2" />
          <div className="flex justify-between text-xs tabular-nums">
            <span className="text-muted-foreground">
              {formatMoney(goal.savedAmountMinor)} saved
            </span>
            <span className="font-medium">
              {pct}% of {formatMoney(goal.targetAmountMinor)}
            </span>
          </div>
          {remaining > 0 && goal.status === 'active' && (
            <p className="text-xs text-muted-foreground">
              {formatMoney(remaining)} remaining
            </p>
          )}
        </div>

        {/* Deposits toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          )}
          {expanded ? 'Hide' : 'Show'} deposits
        </button>

        {/* Deposits list */}
        {expanded && (
          <ul className="space-y-1.5 border-t border-border pt-3" aria-label="Deposits">
            {deposits === null || deposits === undefined ? (
              <li className="text-xs text-muted-foreground">Loading…</li>
            ) : deposits.length === 0 ? (
              <li className="text-xs text-muted-foreground">No deposits yet.</li>
            ) : (
              deposits.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(parseISO(d.date), 'MMM d')}
                    </span>
                    <span className="text-sm font-medium tabular-nums">
                      {formatMoney(d.amountMinor)}
                    </span>
                    {d.notes && (
                      <span className="text-xs text-muted-foreground truncate">{d.notes}</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setDepositToDelete(d)}
                    aria-label="Remove deposit"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </li>
              ))
            )}
          </ul>
        )}
      </Card>

      {/* Edit goal sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit goal</SheetTitle>
            <SheetDescription>Update this savings goal.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <SavingsGoalForm
              key={`edit-${goal.id}`}
              initial={goal}
              onSave={handleSaveGoal}
              onCancel={() => setEditOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Add deposit sheet */}
      <Sheet open={depositOpen} onOpenChange={setDepositOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add deposit</SheetTitle>
            <SheetDescription>Record a deposit toward &ldquo;{goal.name}&rdquo;.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <SavingsDepositForm
              key={`deposit-${goal.id}-${depositOpen}`}
              goalId={goal.id}
              onSave={handleDeposit}
              onCancel={() => setDepositOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete goal confirm */}
      <ConfirmDialog
        open={toDelete}
        onOpenChange={(open) => !open && setToDelete(false)}
        title="Delete goal?"
        description={`"${goal.name}" and all its deposits will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteGoal}
      />

      {/* Delete deposit confirm */}
      <ConfirmDialog
        open={!!depositToDelete}
        onOpenChange={(open) => !open && setDepositToDelete(null)}
        title="Remove deposit?"
        description={`This deposit of ${depositToDelete ? formatMoney(depositToDelete.amountMinor) : ''} will be removed and the saved amount updated.`}
        confirmLabel="Remove"
        destructive
        onConfirm={handleDeleteDeposit}
      />
    </li>
  );
}

export default function SavingsPage() {
  const goals = useLiveQuery(() => listSavingsGoals(), []) ?? [];

  const [formOpen, setFormOpen] = React.useState(false);

  async function handleCreate(data: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>) {
    await createSavingsGoal(data);
    toast.success('Goal created.');
    setFormOpen(false);
  }

  const active = goals.filter((g) => g.status === 'active');
  const completed = goals.filter((g) => g.status === 'completed');
  const archived = goals.filter((g) => g.status === 'archived');
  const sorted = [...active, ...completed, ...archived];

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Savings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your savings goals and deposits.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} size="sm" className="shrink-0">
          <Plus aria-hidden="true" />
          Add goal
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<PiggyBank className="size-6" />}
          title="No savings goals yet"
          description="Create a goal to track progress toward anything you are saving for."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus aria-hidden="true" />
              Add goal
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3" aria-label="Savings goals">
          {sorted.map((goal) => (
            <GoalRow key={goal.id} goal={goal} />
          ))}
        </ul>
      )}

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add savings goal</SheetTitle>
            <SheetDescription>Create a new goal to save toward.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <SavingsGoalForm
              key={formOpen ? 'new-goal' : 'idle'}
              onSave={handleCreate}
              onCancel={() => setFormOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
