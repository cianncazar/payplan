'use client';

import * as React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Archive,
  Edit,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Trash2,
  Wallet,
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
import { CashSourceForm } from '@/components/cash-sources/cash-source-form';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import {
  createCashSource,
  updateCashSource,
  deleteCashSource,
  listCashSources,
} from '@/db/repositories';
import { CASH_SOURCE_TYPE_LABELS } from '@/lib/constants';
import { formatMoney } from '@/lib/money';
import type { CashSource } from '@/types';

export default function CashSourcesPage() {
  const allSources = useLiveQuery(() => listCashSources(), []) ?? [];
  const [showArchived, setShowArchived] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CashSource | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<CashSource | null>(null);

  const visible = showArchived
    ? allSources
    : allSources.filter((s) => !s.archived);

  const totalActive = allSources
    .filter((s) => !s.archived && s.includeInPlanner)
    .reduce((sum, s) => sum + s.balanceMinor, 0);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(source: CashSource) {
    setEditing(source);
    setFormOpen(true);
  }

  async function handleSave(
    data: Omit<CashSource, 'id' | 'createdAt' | 'updatedAt' | 'archived'>
  ) {
    if (editing) {
      await updateCashSource(editing.id, data);
      toast.success('Cash source updated.');
    } else {
      await createCashSource({ ...data, archived: false });
      toast.success('Cash source added.');
    }
    setFormOpen(false);
    setEditing(null);
  }

  async function handleDuplicate(source: CashSource) {
    await createCashSource({
      name: `${source.name} (copy)`,
      type: source.type,
      balanceMinor: source.balanceMinor,
      currency: source.currency,
      includeInPlanner: source.includeInPlanner,
      archived: false,
    });
    toast.success('Duplicated.');
  }

  async function handleArchive(source: CashSource) {
    await updateCashSource(source.id, { archived: true });
    toast.success('Archived.');
  }

  async function handleRestore(source: CashSource) {
    await updateCashSource(source.id, { archived: false });
    toast.success('Restored.');
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteCashSource(deleteTarget.id);
    toast.success('Deleted.');
    setDeleteTarget(null);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cash Sources</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track where your money lives — cash, bank accounts, and e-wallets.
          </p>
        </div>
        <Button onClick={openAdd} className="shrink-0">
          <Plus aria-hidden="true" />
          Add source
        </Button>
      </div>

      {/* Summary card */}
      {allSources.filter((s) => !s.archived).length > 0 && (
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total available (in planner)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatMoney(totalActive)}
          </p>
        </Card>
      )}

      {/* Show archived toggle */}
      {allSources.some((s) => s.archived) && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => setShowArchived((p) => !p)}
        >
          {showArchived ? 'Hide archived' : 'Show archived'}
        </Button>
      )}

      {/* List */}
      {visible.length === 0 ? (
        <EmptyState
          icon={<Wallet className="size-6" />}
          title="No cash sources yet"
          description="Add your available cash, bank balance, or e-wallet to start planning."
          action={
            <Button onClick={openAdd}>
              <Plus aria-hidden="true" />
              Add your first source
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2" aria-label="Cash sources">
          {visible.map((source) => (
            <li key={source.id}>
              <Card className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium truncate">{source.name}</span>
                    <Badge variant="secondary" className="shrink-0">
                      {CASH_SOURCE_TYPE_LABELS[source.type]}
                    </Badge>
                    {source.archived && (
                      <Badge variant="outline" className="shrink-0 text-muted-foreground">
                        Archived
                      </Badge>
                    )}
                    {!source.includeInPlanner && !source.archived && (
                      <Badge variant="outline" className="shrink-0 text-muted-foreground">
                        Excluded from planner
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                    {formatMoney(source.balanceMinor, source.currency)}
                  </p>
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon" />}
                    aria-label={`Actions for ${source.name}`}
                  >
                    <MoreHorizontal aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(source)}>
                      <Edit aria-hidden="true" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(source)}>
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {source.archived ? (
                      <DropdownMenuItem onClick={() => handleRestore(source)}>
                        <RotateCcw aria-hidden="true" />
                        Restore
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => handleArchive(source)}>
                        <Archive aria-hidden="true" />
                        Archive
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(source)}
                    >
                      <Trash2 aria-hidden="true" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* Add / Edit sheet */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit cash source' : 'Add cash source'}</SheetTitle>
            <SheetDescription>
              {editing
                ? 'Update the details for this cash source.'
                : 'Add a new source of available funds.'}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <CashSourceForm
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
        title="Delete cash source?"
        description={`"${deleteTarget?.name}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
