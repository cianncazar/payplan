'use client';

import * as React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, parseISO } from 'date-fns';
import {
  Edit,
  MoreHorizontal,
  Plus,
  Trash2,
  Wallet,
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
import { AllowanceBudgetForm } from '@/components/allowance/allowance-budget-form';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import {
  createAllowanceBudget,
  updateAllowanceBudget,
  deleteAllowanceBudget,
  listAllowanceBudgets,
} from '@/db/repositories';
import { formatMoney } from '@/lib/money';
import type { AllowanceBudget } from '@/types';

const STATUS_LABELS: Record<AllowanceBudget['status'], string> = {
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_VARIANTS: Record<
  AllowanceBudget['status'],
  'default' | 'secondary' | 'outline'
> = {
  active: 'secondary',
  completed: 'default',
  cancelled: 'outline',
};

export default function AllowancePage() {
  const budgets = useLiveQuery(() => listAllowanceBudgets(), []) ?? [];

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AllowanceBudget | null>(null);
  const [toDelete, setToDelete] = React.useState<AllowanceBudget | null>(null);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(b: AllowanceBudget) {
    setEditing(b);
    setFormOpen(true);
  }

  async function handleSave(
    data: Omit<AllowanceBudget, 'id' | 'createdAt' | 'updatedAt'>
  ) {
    if (editing) {
      await updateAllowanceBudget(editing.id, data);
      toast.success('Budget updated.');
    } else {
      await createAllowanceBudget(data);
      toast.success('Budget created.');
    }
    setFormOpen(false);
  }

  async function handleDelete() {
    if (!toDelete) return;
    await deleteAllowanceBudget(toDelete.id);
    toast.success('Deleted.');
    setToDelete(null);
  }

  const active = budgets.filter((b) => b.status === 'active');
  const others = budgets.filter((b) => b.status !== 'active');
  const sorted = [...active, ...others];

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Allowance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track daily spending budgets and targets.
          </p>
        </div>
        <Button onClick={openAdd} size="sm" className="shrink-0">
          <Plus aria-hidden="true" />
          Add budget
        </Button>
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <EmptyState
          icon={<Wallet className="size-6" />}
          title="No budgets yet"
          description="Set a daily, weekly, or total allowance budget to track your spending."
          action={
            <Button onClick={openAdd}>
              <Plus aria-hidden="true" />
              Add budget
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3" aria-label="Allowance budgets">
          {sorted.map((budget) => {
            const pct =
              budget.totalBudgetMinor > 0
                ? Math.min(
                    100,
                    Math.round((budget.spentAmountMinor / budget.totalBudgetMinor) * 100)
                  )
                : 0;
            const remaining = budget.totalBudgetMinor - budget.spentAmountMinor;
            const isOver = remaining < 0;

            return (
              <li key={budget.id}>
                <Card className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium truncate">{budget.name}</span>
                        <Badge
                          variant={STATUS_VARIANTS[budget.status]}
                          className="shrink-0"
                        >
                          {STATUS_LABELS[budget.status]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(budget.startDate), 'MMM d')} –{' '}
                        {format(parseISO(budget.endDate), 'MMM d, yyyy')}
                        {budget.dailyTargetMinor && (
                          <>
                            {' · '}
                            {formatMoney(budget.dailyTargetMinor)}/day
                          </>
                        )}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon" />}
                        aria-label={`Actions for ${budget.name}`}
                      >
                        <MoreHorizontal aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(budget)}>
                          <Edit aria-hidden="true" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          data-variant="destructive"
                          onClick={() => setToDelete(budget)}
                        >
                          <Trash2 aria-hidden="true" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Progress */}
                  {budget.totalBudgetMinor > 0 && (
                    <div className="space-y-1.5">
                      <Progress value={pct} className="h-2" />
                      <div className="flex justify-between text-xs tabular-nums">
                        <span className="text-muted-foreground">
                          {formatMoney(budget.spentAmountMinor)} spent
                        </span>
                        <span className={isOver ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                          {isOver
                            ? `${formatMoney(-remaining)} over`
                            : `${formatMoney(remaining)} remaining`}
                        </span>
                      </div>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {/* Sheet */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit budget' : 'Add budget'}</SheetTitle>
            <SheetDescription>
              {editing
                ? 'Update this allowance budget.'
                : 'Create a new allowance budget for a date range.'}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <AllowanceBudgetForm
              key={editing?.id ?? 'new-budget'}
              initial={editing ?? undefined}
              onSave={handleSave}
              onCancel={() => setFormOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete budget?"
        description={`"${toDelete?.name}" will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
