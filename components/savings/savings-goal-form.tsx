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
import type { SavingsGoal } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  targetAmountMinor: z.number().int().min(1, 'Target must be greater than zero'),
  savedAmountMinor: z.number().int().min(0),
  targetDate: isoDate.optional().or(z.literal('')),
  currency: z.string().min(1, 'Currency is required'),
  notes: z.string().optional(),
  status: z.enum(['active', 'completed', 'archived']),
});

type FormValues = z.infer<typeof schema>;

interface SavingsGoalFormProps {
  initial?: SavingsGoal;
  onSave: (data: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

export function SavingsGoalForm({ initial, onSave, onCancel }: SavingsGoalFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      targetAmountMinor: initial?.targetAmountMinor ?? 0,
      savedAmountMinor: initial?.savedAmountMinor ?? 0,
      targetDate: initial?.targetDate ?? '',
      currency: initial?.currency ?? 'PHP',
      notes: initial?.notes ?? '',
      status: initial?.status ?? 'active',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await onSave({
        name: values.name,
        targetAmountMinor: values.targetAmountMinor,
        savedAmountMinor: values.savedAmountMinor,
        targetDate: values.targetDate || undefined,
        currency: values.currency,
        notes: values.notes || undefined,
        status: values.status,
      });
    } catch {
      toast.error('Failed to save goal. Please try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="sg-name">Goal name *</Label>
        <Input
          id="sg-name"
          placeholder="e.g. Emergency Fund, Vacation, New Laptop"
          aria-invalid={!!errors.name}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-destructive" role="alert">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sg-target">Target amount *</Label>
        <Controller
          control={control}
          name="targetAmountMinor"
          render={({ field }) => (
            <MoneyInput
              id="sg-target"
              value={field.value}
              onChange={(v) => field.onChange(v ?? 0)}
              aria-invalid={!!errors.targetAmountMinor}
              zeroAsEmpty={false}
            />
          )}
        />
        {errors.targetAmountMinor && (
          <p className="text-xs text-destructive" role="alert">{errors.targetAmountMinor.message}</p>
        )}
      </div>

      {initial && (
        <div className="space-y-1.5">
          <Label htmlFor="sg-saved">Amount already saved</Label>
          <Controller
            control={control}
            name="savedAmountMinor"
            render={({ field }) => (
              <MoneyInput
                id="sg-saved"
                value={field.value}
                onChange={(v) => field.onChange(v ?? 0)}
                zeroAsEmpty={false}
              />
            )}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="sg-date">
          Target date <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="sg-date"
          type="date"
          aria-invalid={!!errors.targetDate}
          {...register('targetDate')}
        />
        {errors.targetDate && (
          <p className="text-xs text-destructive" role="alert">{errors.targetDate.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sg-currency">Currency</Label>
        <Controller
          control={control}
          name="currency"
          render={({ field }) => (
            <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
              <SelectTrigger id="sg-currency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PHP">PHP — Philippine Peso</SelectItem>
                <SelectItem value="USD">USD — US Dollar</SelectItem>
                <SelectItem value="EUR">EUR — Euro</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {initial && (
        <div className="space-y-1.5">
          <Label htmlFor="sg-status">Status</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                <SelectTrigger id="sg-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="sg-notes">
          Notes <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="sg-notes"
          placeholder="What is this goal for?"
          rows={2}
          {...register('notes')}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
          {initial ? 'Save changes' : 'Add goal'}
        </Button>
      </div>
    </form>
  );
}
