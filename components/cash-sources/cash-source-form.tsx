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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoneyInput } from '@/components/forms/money-input';
import { CASH_SOURCE_TYPE_LABELS, CASH_SOURCE_TYPES } from '@/lib/constants';
import type { CashSource } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['cash', 'bank', 'ewallet', 'other']),
  balanceMinor: z.number().int().min(0, 'Balance cannot be negative'),
  currency: z.string().min(1, 'Currency is required'),
  includeInPlanner: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface CashSourceFormProps {
  initial?: CashSource;
  onSave: (data: Omit<CashSource, 'id' | 'createdAt' | 'updatedAt' | 'archived'>) => Promise<void>;
  onCancel: () => void;
}

export function CashSourceForm({ initial, onSave, onCancel }: CashSourceFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      type: initial?.type ?? 'bank',
      balanceMinor: initial?.balanceMinor ?? 0,
      currency: initial?.currency ?? 'PHP',
      includeInPlanner: initial?.includeInPlanner ?? true,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await onSave(values);
    } catch {
      toast.error('Failed to save cash source. Please try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="cs-name">Source name</Label>
        <Input
          id="cs-name"
          placeholder="e.g. Bank Account, Cash on Hand"
          aria-describedby={errors.name ? 'cs-name-error' : undefined}
          aria-invalid={!!errors.name}
          {...register('name')}
        />
        {errors.name && (
          <p id="cs-name-error" className="text-xs text-destructive" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Type */}
      <div className="space-y-1.5">
        <Label htmlFor="cs-type">Type</Label>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(v) => v && field.onChange(v)}
            >
              <SelectTrigger id="cs-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CASH_SOURCE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {CASH_SOURCE_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Balance */}
      <div className="space-y-1.5">
        <Label htmlFor="cs-balance">Current balance</Label>
        <Controller
          control={control}
          name="balanceMinor"
          render={({ field }) => (
            <MoneyInput
              id="cs-balance"
              value={field.value}
              onChange={(v) => field.onChange(v ?? 0)}
              aria-describedby={errors.balanceMinor ? 'cs-balance-error' : undefined}
              aria-invalid={!!errors.balanceMinor}
              zeroAsEmpty={false}
            />
          )}
        />
        {errors.balanceMinor && (
          <p id="cs-balance-error" className="text-xs text-destructive" role="alert">
            {errors.balanceMinor.message}
          </p>
        )}
      </div>

      {/* Currency */}
      <div className="space-y-1.5">
        <Label htmlFor="cs-currency">Currency</Label>
        <Input
          id="cs-currency"
          placeholder="PHP"
          aria-describedby={errors.currency ? 'cs-currency-error' : undefined}
          aria-invalid={!!errors.currency}
          {...register('currency')}
        />
        {errors.currency && (
          <p id="cs-currency-error" className="text-xs text-destructive" role="alert">
            {errors.currency.message}
          </p>
        )}
      </div>

      {/* Include in planner */}
      <div className="flex items-center gap-3">
        <Controller
          control={control}
          name="includeInPlanner"
          render={({ field }) => (
            <Switch
              id="cs-planner"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor="cs-planner" className="cursor-pointer">
          Include in planner
        </Label>
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
