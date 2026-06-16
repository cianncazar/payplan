'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoneyInput } from '@/components/forms/money-input';
import { isoDate } from '@/lib/validation';
import type { IncomeEvent, IncomeSource } from '@/types';

const schema = z
  .object({
    incomeSourceId: z.string().uuid().optional(),
    expectedDate: isoDate,
    expectedAmountMinor: z.number().int().min(0, 'Amount must be 0 or more'),
    status: z.enum(['expected', 'received', 'delayed', 'cancelled']),
    receivedDate: isoDate.optional(),
    receivedAmountMinor: z.number().int().min(0).optional(),
    notes: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.status === 'received' && !d.receivedDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Received date is required when status is received',
        path: ['receivedDate'],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

const STATUS_LABELS: Record<IncomeEvent['status'], string> = {
  expected: 'Expected',
  received: 'Received',
  delayed: 'Delayed',
  cancelled: 'Cancelled',
};

interface IncomeEventFormProps {
  initial?: IncomeEvent;
  sources?: IncomeSource[];
  onSave: (data: Omit<IncomeEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

export function IncomeEventForm({
  initial,
  sources = [],
  onSave,
  onCancel,
}: IncomeEventFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      incomeSourceId: initial?.incomeSourceId,
      expectedDate: initial?.expectedDate ?? '',
      expectedAmountMinor: initial?.expectedAmountMinor ?? 0,
      status: initial?.status ?? 'expected',
      receivedDate: initial?.receivedDate,
      receivedAmountMinor: initial?.receivedAmountMinor,
      notes: initial?.notes ?? '',
    },
  });

  const status = watch('status');

  async function onSubmit(values: FormValues) {
    try {
      await onSave({
        incomeSourceId: values.incomeSourceId || undefined,
        expectedDate: values.expectedDate,
        expectedAmountMinor: values.expectedAmountMinor,
        status: values.status,
        receivedDate: values.status === 'received' ? values.receivedDate : undefined,
        receivedAmountMinor:
          values.status === 'received' ? values.receivedAmountMinor : undefined,
        notes: values.notes || undefined,
      });
    } catch {
      toast.error('Failed to save income event. Please try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {/* Linked source */}
      {sources.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="ie-source">
            Income source <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Controller
            control={control}
            name="incomeSourceId"
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={(v) => field.onChange(v || undefined)}
              >
                <SelectTrigger id="ie-source" className="w-full">
                  <SelectValue placeholder="Select source…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {sources.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      {/* Expected date */}
      <div className="space-y-1.5">
        <Label htmlFor="ie-expected-date">Expected date *</Label>
        <Input
          id="ie-expected-date"
          type="date"
          aria-invalid={!!errors.expectedDate}
          {...register('expectedDate')}
        />
        {errors.expectedDate && (
          <p className="text-xs text-destructive" role="alert">
            {errors.expectedDate.message}
          </p>
        )}
      </div>

      {/* Expected amount */}
      <div className="space-y-1.5">
        <Label htmlFor="ie-expected-amt">Expected amount *</Label>
        <Controller
          control={control}
          name="expectedAmountMinor"
          render={({ field }) => (
            <MoneyInput
              id="ie-expected-amt"
              value={field.value}
              onChange={(v) => field.onChange(v ?? 0)}
              aria-invalid={!!errors.expectedAmountMinor}
              zeroAsEmpty={false}
            />
          )}
        />
        {errors.expectedAmountMinor && (
          <p className="text-xs text-destructive" role="alert">
            {errors.expectedAmountMinor.message}
          </p>
        )}
      </div>

      {/* Status */}
      <div className="space-y-1.5">
        <Label htmlFor="ie-status">Status</Label>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
              <SelectTrigger id="ie-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABELS) as IncomeEvent['status'][]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Received fields — only when status is received */}
      {status === 'received' && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="ie-received-date">Received date *</Label>
            <Input
              id="ie-received-date"
              type="date"
              aria-invalid={!!errors.receivedDate}
              {...register('receivedDate')}
            />
            {errors.receivedDate && (
              <p className="text-xs text-destructive" role="alert">
                {errors.receivedDate.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ie-received-amt">Received amount</Label>
            <Controller
              control={control}
              name="receivedAmountMinor"
              render={({ field }) => (
                <MoneyInput
                  id="ie-received-amt"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="ie-notes">
          Notes <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea id="ie-notes" rows={2} {...register('notes')} />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
          {initial ? 'Save changes' : 'Add income event'}
        </Button>
      </div>
    </form>
  );
}
