'use client';

import * as React from 'react';
import { useForm, Controller, type Control, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoneyInput } from '@/components/forms/money-input';
import { RecurrenceFields } from '@/components/forms/recurrence-fields';
import { INCOME_TYPES, INCOME_TYPE_LABELS } from '@/lib/constants';
import { RecurrenceRuleSchema } from '@/lib/validation';
import type { IncomeSource } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum([
    'salary',
    'business',
    'allowance',
    'remittance',
    'freelance',
    'bonus',
    'refund',
    'other',
  ]),
  currency: z.string().min(1, 'Currency is required'),
  expectedAmountMinor: z.number().int().min(0).optional(),
  recurrence: RecurrenceRuleSchema.optional(),
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface IncomeSourceFormProps {
  initial?: IncomeSource;
  onSave: (data: Omit<IncomeSource, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

export function IncomeSourceForm({ initial, onSave, onCancel }: IncomeSourceFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      type: initial?.type ?? 'salary',
      currency: initial?.currency ?? 'PHP',
      expectedAmountMinor: initial?.expectedAmountMinor,
      recurrence: initial?.recurrence,
      active: initial?.active ?? true,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await onSave(values);
    } catch {
      toast.error('Failed to save income source. Please try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="is-name">Source name *</Label>
        <Input
          id="is-name"
          placeholder="e.g. Monthly Salary, Freelance Projects"
          aria-invalid={!!errors.name}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-destructive" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Type */}
      <div className="space-y-1.5">
        <Label htmlFor="is-type">Income type</Label>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
              <SelectTrigger id="is-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INCOME_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {INCOME_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Currency */}
      <div className="space-y-1.5">
        <Label htmlFor="is-currency">Currency</Label>
        <Input
          id="is-currency"
          placeholder="PHP"
          className="w-28"
          aria-invalid={!!errors.currency}
          {...register('currency')}
        />
        {errors.currency && (
          <p className="text-xs text-destructive" role="alert">
            {errors.currency.message}
          </p>
        )}
      </div>

      {/* Expected amount */}
      <div className="space-y-1.5">
        <Label htmlFor="is-amount">
          Expected amount <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Controller
          control={control}
          name="expectedAmountMinor"
          render={({ field }) => (
            <MoneyInput
              id="is-amount"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      {/* Recurrence */}
      <div className="space-y-1.5">
        <Label>Recurrence <span className="text-muted-foreground">(optional)</span></Label>
        <RecurrenceFields control={control as unknown as Control<FieldValues>} name="recurrence" errors={errors} />
      </div>

      {/* Active */}
      <div className="flex items-center gap-3">
        <Controller
          control={control}
          name="active"
          render={({ field }) => (
            <Switch id="is-active" checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
        <Label htmlFor="is-active" className="cursor-pointer">Active</Label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
          {initial ? 'Save changes' : 'Add source'}
        </Button>
      </div>
    </form>
  );
}
