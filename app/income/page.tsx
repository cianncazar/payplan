'use client';

import * as React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import {
  Copy,
  Edit,
  MoreHorizontal,
  Plus,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { IncomeSourceForm } from '@/components/income/income-source-form';
import { IncomeEventForm } from '@/components/income/income-event-form';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import {
  createIncomeSource,
  updateIncomeSource,
  deleteIncomeSource,
  listIncomeSources,
  createIncomeEvent,
  updateIncomeEvent,
  deleteIncomeEvent,
  listIncomeEvents,
} from '@/db/repositories';
import { expandRecurrence } from '@/lib/calculations/recurrence';
import { formatISODate } from '@/lib/dates';
import { INCOME_TYPE_LABELS } from '@/lib/constants';
import { formatMoney } from '@/lib/money';
import type { IncomeSource, IncomeEvent } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDaysToISO(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return formatISODate(d);
}

/** Return the next payday date after `event.expectedDate` using the source's
 *  recurrence rule. Falls back to +1 month if no rule is available. */
function nextPaydayDate(event: IncomeEvent, source?: IncomeSource): string {
  if (source?.recurrence) {
    const from = addDaysToISO(event.expectedDate, 1);
    const to = addDaysToISO(event.expectedDate, 400);
    const dates = expandRecurrence(source.recurrence, from, to);
    if (dates.length > 0) return dates[0];
  }
  // Fallback: advance by one month, keeping the same day of month.
  const d = new Date(`${event.expectedDate}T00:00:00`);
  d.setMonth(d.getMonth() + 1);
  return formatISODate(d);
}

// ─── Status presentation ──────────────────────────────────────────────────────

const EVENT_STATUS_LABELS: Record<IncomeEvent['status'], string> = {
  expected: 'Expected',
  received: 'Received',
  delayed: 'Delayed',
  cancelled: 'Cancelled',
};

const EVENT_STATUS_VARIANTS: Record<
  IncomeEvent['status'],
  'default' | 'secondary' | 'outline'
> = {
  expected: 'secondary',
  received: 'default',
  delayed: 'outline',
  cancelled: 'outline',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IncomePage() {
  const sources = useLiveQuery(() => listIncomeSources(), []) ?? [];
  const events = useLiveQuery(() => listIncomeEvents(), []) ?? [];

  // Sources state
  const [sourceFormOpen, setSourceFormOpen] = React.useState(false);
  const [editingSource, setEditingSource] = React.useState<IncomeSource | null>(null);
  const [deleteSource, setDeleteSource] = React.useState<IncomeSource | null>(null);

  // Events state
  const [eventFormOpen, setEventFormOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<IncomeEvent | null>(null);
  const [deleteEvent, setDeleteEvent] = React.useState<IncomeEvent | null>(null);

  // ── Source actions ──
  function openAddSource() {
    setEditingSource(null);
    setSourceFormOpen(true);
  }
  function openEditSource(s: IncomeSource) {
    setEditingSource(s);
    setSourceFormOpen(true);
  }
  async function handleSaveSource(
    data: Omit<IncomeSource, 'id' | 'createdAt' | 'updatedAt'>
  ) {
    if (editingSource) {
      await updateIncomeSource(editingSource.id, data);
      toast.success('Income source updated.');
    } else {
      await createIncomeSource(data);
      toast.success('Income source added.');
    }
    setSourceFormOpen(false);
  }
  async function handleDeleteSource() {
    if (!deleteSource) return;
    await deleteIncomeSource(deleteSource.id);
    toast.success('Deleted.');
    setDeleteSource(null);
  }

  // ── Event actions ──
  function openAddEvent() {
    setEditingEvent(null);
    setEventFormOpen(true);
  }
  function openEditEvent(e: IncomeEvent) {
    setEditingEvent(e);
    setEventFormOpen(true);
  }
  async function handleSaveEvent(
    data: Omit<IncomeEvent, 'id' | 'createdAt' | 'updatedAt'>
  ) {
    if (editingEvent) {
      await updateIncomeEvent(editingEvent.id, data);
      toast.success('Income event updated.');
    } else {
      await createIncomeEvent(data);
      toast.success('Income event added.');
    }
    setEventFormOpen(false);
  }
  async function handleDeleteEvent() {
    if (!deleteEvent) return;
    await deleteIncomeEvent(deleteEvent.id);
    toast.success('Deleted.');
    setDeleteEvent(null);
  }
  async function handleDuplicateEvent(event: IncomeEvent) {
    const source = sources.find((s) => s.id === event.incomeSourceId);
    const nextDate = nextPaydayDate(event, source);
    await createIncomeEvent({
      incomeSourceId: event.incomeSourceId,
      cashSourceId: event.cashSourceId,
      expectedDate: nextDate,
      expectedAmountMinor: event.expectedAmountMinor,
      status: 'expected',
      notes: event.notes,
    });
    toast.success(`Duplicated to ${nextDate}.`);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Income</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track expected and received income.
        </p>
      </div>

      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
        </TabsList>

        {/* ── Income Events tab ── */}
        <TabsContent value="events" className="space-y-4 pt-2">
          <div className="flex justify-end">
            <Button onClick={openAddEvent} size="sm">
              <Plus aria-hidden="true" />
              Add income
            </Button>
          </div>

          {events.length === 0 ? (
            <EmptyState
              icon={<TrendingUp className="size-6" />}
              title="No income events yet"
              description="Add expected or received income to include it in your plan."
              action={
                <Button onClick={openAddEvent}>
                  <Plus aria-hidden="true" />
                  Add income event
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2" aria-label="Income events">
              {[...events]
                .sort((a, b) => a.expectedDate.localeCompare(b.expectedDate))
                .map((event) => {
                  const source = sources.find((s) => s.id === event.incomeSourceId);
                  const isReceived = event.status === 'received';
                  return (
                    <li key={event.id}>
                      <Card className="flex items-start gap-4 p-4">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {source && (
                              <span className="font-medium truncate">{source.name}</span>
                            )}
                            <Badge
                              variant={EVENT_STATUS_VARIANTS[event.status]}
                              className="shrink-0"
                            >
                              {EVENT_STATUS_LABELS[event.status]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Expected{' '}
                            {format(
                              new Date(event.expectedDate + 'T00:00:00'),
                              'MMM d, yyyy'
                            )}
                            {isReceived && event.receivedDate && (
                              <>
                                {' · '}Received{' '}
                                {format(
                                  new Date(event.receivedDate + 'T00:00:00'),
                                  'MMM d, yyyy'
                                )}
                              </>
                            )}
                          </p>
                          <div className="flex items-baseline gap-2">
                            <p className={`text-base font-semibold tabular-nums ${isReceived ? '' : 'text-muted-foreground'}`}>
                              {formatMoney(
                                isReceived && event.receivedAmountMinor !== undefined
                                  ? event.receivedAmountMinor
                                  : event.expectedAmountMinor
                              )}
                            </p>
                            {!isReceived && (
                              <span className="text-xs text-muted-foreground">expected</span>
                            )}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button variant="ghost" size="icon" />}
                            aria-label={`Actions for income event`}
                          >
                            <MoreHorizontal aria-hidden="true" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditEvent(event)}>
                              <Edit aria-hidden="true" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateEvent(event)}>
                              <Copy aria-hidden="true" />
                              Duplicate to next payday
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              data-variant="destructive"
                              onClick={() => setDeleteEvent(event)}
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
        </TabsContent>

        {/* ── Income Sources tab ── */}
        <TabsContent value="sources" className="space-y-4 pt-2">
          <div className="flex justify-end">
            <Button onClick={openAddSource} size="sm">
              <Plus aria-hidden="true" />
              Add source
            </Button>
          </div>

          {sources.length === 0 ? (
            <EmptyState
              icon={<Wallet className="size-6" />}
              title="No income sources yet"
              description="Define recurring income sources like salary, freelance work, or business income."
              action={
                <Button onClick={openAddSource}>
                  <Plus aria-hidden="true" />
                  Add income source
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2" aria-label="Income sources">
              {sources.map((source) => (
                <li key={source.id}>
                  <Card className="flex items-start gap-4 p-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium truncate">{source.name}</span>
                        <Badge variant="secondary" className="shrink-0">
                          {INCOME_TYPE_LABELS[source.type]}
                        </Badge>
                        {!source.active && (
                          <Badge variant="outline" className="shrink-0 text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      {source.expectedAmountMinor !== undefined && (
                        <p className="text-sm font-medium tabular-nums text-muted-foreground">
                          {formatMoney(source.expectedAmountMinor, source.currency)} expected
                        </p>
                      )}
                      {source.recurrence && (
                        <p className="text-xs text-muted-foreground capitalize">
                          {source.recurrence.frequency}
                        </p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon" />}
                        aria-label={`Actions for ${source.name}`}
                      >
                        <MoreHorizontal aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditSource(source)}>
                          <Edit aria-hidden="true" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          data-variant="destructive"
                          onClick={() => setDeleteSource(source)}
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
        </TabsContent>
      </Tabs>

      {/* Source sheet */}
      <Sheet open={sourceFormOpen} onOpenChange={setSourceFormOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editingSource ? 'Edit income source' : 'Add income source'}
            </SheetTitle>
            <SheetDescription>
              {editingSource
                ? 'Update this income source.'
                : 'Define a recurring or one-time income source.'}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <IncomeSourceForm
              key={editingSource?.id ?? 'new-source'}
              initial={editingSource ?? undefined}
              onSave={handleSaveSource}
              onCancel={() => setSourceFormOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Event sheet */}
      <Sheet open={eventFormOpen} onOpenChange={setEventFormOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editingEvent ? 'Edit income event' : 'Add income event'}
            </SheetTitle>
            <SheetDescription>
              {editingEvent
                ? 'Update this income event.'
                : 'Record an expected or received payment.'}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <IncomeEventForm
              key={editingEvent?.id ?? 'new-event'}
              initial={editingEvent ?? undefined}
              sources={sources.filter((s) => s.active)}
              onSave={handleSaveEvent}
              onCancel={() => setEventFormOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmations */}
      <ConfirmDialog
        open={!!deleteSource}
        onOpenChange={(open) => !open && setDeleteSource(null)}
        title="Delete income source?"
        description={`"${deleteSource?.name}" will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteSource}
      />
      <ConfirmDialog
        open={!!deleteEvent}
        onOpenChange={(open) => !open && setDeleteEvent(null)}
        title="Delete income event?"
        description="This income event will be permanently deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteEvent}
      />
    </div>
  );
}
