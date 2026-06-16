'use client';

import * as React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import {
  Archive,
  CreditCard,
  Edit,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
import { PaymentForm, type SavePaymentData } from '@/components/payments/payment-form';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import {
  createPaymentWithOccurrences,
  updatePayment,
  updatePaymentAndOccurrences,
  deletePayment,
  listPayments,
} from '@/db/repositories';
import {
  PAYMENT_CATEGORY_LABELS,
  PAYMENT_STRUCTURE_LABELS,
} from '@/lib/constants';
import { generateOccurrencePreviews, today } from '@/lib/calculations/occurrences';
import { formatMoney } from '@/lib/money';
import type { PaymentObligation } from '@/types';

function priorityLabel(p: number): string {
  return ['', 'P1', 'P2', 'P3', 'P4', 'P5'][p] ?? '';
}

function statusBadgeVariant(
  status: PaymentObligation['status']
): 'default' | 'secondary' | 'outline' {
  if (status === 'archived') return 'outline';
  if (status === 'paused') return 'secondary';
  return 'default';
}

export default function PaymentsPage() {
  const allPayments = useLiveQuery(() => listPayments(), []) ?? [];
  const [showArchived, setShowArchived] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PaymentObligation | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<PaymentObligation | null>(null);

  const visible = showArchived
    ? allPayments
    : allPayments.filter((p) => p.status !== 'archived');

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(p: PaymentObligation) {
    setEditing(p);
    setFormOpen(true);
  }

  async function handleSave({ payment, customRows }: SavePaymentData) {
    // Build occurrences from preview
    const occurrences =
      payment.structure !== 'custom_schedule'
        ? generateOccurrencePreviews(
            { ...payment, id: '', createdAt: '', updatedAt: '' },
            today()
          ).map((prev) => ({
            sequenceNumber: prev.sequenceNumber,
            dueDate: prev.dueDate,
            dueAmountMinor: prev.dueAmountMinor,
            principalAmountMinor: prev.principalAmountMinor,
            interestAmountMinor: prev.interestAmountMinor,
            feeAmountMinor: prev.feeAmountMinor,
            paidAmountMinor: 0,
            status: 'scheduled' as const,
            amountIsEstimate: prev.amountIsEstimate,
            manuallyOverridden: false,
          }))
        : (customRows ?? []).map((row, i) => ({
            sequenceNumber: i,
            dueDate: row.dueDate,
            dueAmountMinor: row.amountMinor,
            feeAmountMinor: 0,
            paidAmountMinor: 0,
            status: 'scheduled' as const,
            amountIsEstimate: false,
            manuallyOverridden: false,
          }));

    if (editing) {
      await updatePaymentAndOccurrences(editing.id, payment, occurrences);
      toast.success('Payment updated.');
    } else {
      await createPaymentWithOccurrences({ payment, occurrences });
      toast.success('Payment added.');
    }
    setFormOpen(false);
    setEditing(null);
  }

  async function handleDuplicate(p: PaymentObligation) {
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = p; // eslint-disable-line @typescript-eslint/no-unused-vars
    const occurrences = generateOccurrencePreviews(p, today()).map((prev) => ({
      sequenceNumber: prev.sequenceNumber,
      dueDate: prev.dueDate,
      dueAmountMinor: prev.dueAmountMinor,
      principalAmountMinor: prev.principalAmountMinor,
      interestAmountMinor: prev.interestAmountMinor,
      feeAmountMinor: prev.feeAmountMinor,
      paidAmountMinor: 0,
      status: 'scheduled' as const,
      amountIsEstimate: prev.amountIsEstimate,
      manuallyOverridden: false,
    }));
    await createPaymentWithOccurrences({
      payment: { ...rest, name: `${p.name} (copy)` },
      occurrences,
    });
    toast.success('Payment duplicated.');
  }

  async function handleArchive(p: PaymentObligation) {
    await updatePayment(p.id, { status: 'archived' });
    toast.success('Archived.');
  }

  async function handleRestore(p: PaymentObligation) {
    await updatePayment(p.id, { status: 'active' });
    toast.success('Restored.');
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deletePayment(deleteTarget.id);
    toast.success('Deleted.');
    setDeleteTarget(null);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your upcoming payment obligations.
          </p>
        </div>
        <Button onClick={openAdd} className="shrink-0">
          <Plus aria-hidden="true" />
          Add payment
        </Button>
      </div>

      {/* Archived toggle */}
      {allPayments.some((p) => p.status === 'archived') && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => setShowArchived((v) => !v)}
        >
          {showArchived ? 'Hide archived' : 'Show archived'}
        </Button>
      )}

      {/* List */}
      {visible.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="size-6" />}
          title="No payments added yet"
          description="Track rent, loans, subscriptions, and any other upcoming payments."
          action={
            <Button onClick={openAdd}>
              <Plus aria-hidden="true" />
              Add your first payment
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2" aria-label="Payment obligations">
          {visible.map((p) => {
            const amount =
              p.statedInstallmentMinor ??
              p.minimumPaymentMinor ??
              p.currentBalanceMinor ??
              p.originalAmountMinor;

            return (
              <li key={p.id}>
                <Card className="flex items-start gap-4 p-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium truncate">{p.name}</span>
                      {p.essential && (
                        <Badge className="shrink-0">Essential</Badge>
                      )}
                      {p.status !== 'active' && (
                        <Badge
                          variant={statusBadgeVariant(p.status)}
                          className="shrink-0 capitalize"
                        >
                          {p.status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{PAYMENT_CATEGORY_LABELS[p.category]}</span>
                      <span aria-hidden>·</span>
                      <span>{PAYMENT_STRUCTURE_LABELS[p.structure]}</span>
                      <span aria-hidden>·</span>
                      <span>{priorityLabel(p.priority)}</span>
                      {p.firstDueDate && (
                        <>
                          <span aria-hidden>·</span>
                          <span>
                            Due {format(new Date(p.firstDueDate + 'T00:00:00'), 'MMM d, yyyy')}
                          </span>
                        </>
                      )}
                    </div>
                    {amount !== undefined && (
                      <p className="text-base font-semibold tabular-nums">
                        {formatMoney(amount, p.currency)}
                      </p>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon" />}
                      aria-label={`Actions for ${p.name}`}
                    >
                      <MoreHorizontal aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(p)}>
                        <Edit aria-hidden="true" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(p)}>
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {p.status === 'archived' ? (
                        <DropdownMenuItem onClick={() => handleRestore(p)}>
                          <RotateCcw aria-hidden="true" />
                          Restore
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleArchive(p)}>
                          <Archive aria-hidden="true" />
                          Archive
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        data-variant="destructive"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 aria-hidden="true" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add / Edit sheet */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit payment' : 'Add payment'}</SheetTitle>
            <SheetDescription>
              {editing
                ? 'Update the details for this payment obligation.'
                : 'Add a payment obligation to your plan.'}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <PaymentForm
              key={editing?.id ?? 'new'}
              initial={editing ?? undefined}
              onSave={handleSave}
              onCancel={() => setFormOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete payment?"
        description={`"${deleteTarget?.name}" and all its payment occurrences will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
