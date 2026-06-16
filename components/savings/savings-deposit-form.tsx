'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MoneyInput } from '@/components/forms/money-input';
import { isoDate } from '@/lib/validation';
import type { SavingsDeposit } from '@/types';

const schema = z.object({
  amountMinor: z.number().int().min(1, 'Amount must be greater than zero'),
  date: isoDate,
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface SavingsDepositFormProps {
  goalId: string;
  onSave: (data: Omit<SavingsDeposit, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

export function SavingsDepositForm({ goalId, onSave, onCancel }: SavingsDepositFormProps) {
  const today = new Date().toISOString().slice(0, 10);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amountMinor: 0,
      date: today,
      notes: '',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await onSave({
        goalId,
        amountMinor: values.amountMinor,
        date: values.date,
        notes: values.notes || undefined,
      });
    } catch {
      toast.error('Failed to record deposit. Please try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="sd-amount">Amount *</Label>
        <Controller
          control={control}
          name="amountMinor"
          render={({ field }) => (
            <MoneyInput
              id="sd-amount"
              value={field.value}
              onChange={(v) => field.onChange(v ?? 0)}
              aria-invalid={!!errors.amountMinor}
              zeroAsEmpty={false}
            />
          )}
        />
        {errors.amountMinor && (
          <p className="text-xs text-destructive" role="alert">{errors.amountMinor.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sd-date">Date *</Label>
        <Input
          id="sd-date"
          type="date"
          aria-invalid={!!errors.date}
          {...register('date')}
        />
        {errors.date && (
          <p className="text-xs text-destructive" role="alert">{errors.date.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sd-notes">
          Notes <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="sd-notes"
          placeholder="e.g. Salary allocation, bonus"
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
          Record deposit
        </Button>
      </div>
    </form>
  );
}
