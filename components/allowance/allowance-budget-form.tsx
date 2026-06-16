'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { differenceInDays, eachDayOfInterval, parseISO, isWeekend } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoneyInput } from '@/components/forms/money-input';
import { isoDate } from '@/lib/validation';
import { formatMoney } from '@/lib/money';
import type { AllowanceBudget } from '@/types';

const schema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    startDate: isoDate,
    endDate: isoDate,
    inputMode: z.enum(['total', 'daily', 'weekly', 'weekday-weekend']),
    totalBudgetMinor: z.number().int().min(0),
    dailyTargetMinor: z.number().int().min(0).optional(),
    weeklyTargetMinor: z.number().int().min(0).optional(),
    weekdayTargetMinor: z.number().int().min(0).optional(),
    weekendTargetMinor: z.number().int().min(0).optional(),
    spentAmountMinor: z.number().int().min(0),
    status: z.enum(['active', 'completed', 'cancelled']),
  })
  .superRefine((d, ctx) => {
    if (d.endDate < d.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be on or after start date',
        path: ['endDate'],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

function countDaysInRange(startDate: string, endDate: string): number {
  try {
    return differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
  } catch {
    return 0;
  }
}

function countWeekdayWeekend(
  startDate: string,
  endDate: string
): { weekdays: number; weekends: number } {
  try {
    const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
    const weekends = days.filter((d) => isWeekend(d)).length;
    return { weekdays: days.length - weekends, weekends };
  } catch {
    return { weekdays: 0, weekends: 0 };
  }
}

interface AllowanceBudgetFormProps {
  initial?: AllowanceBudget;
  onSave: (data: Omit<AllowanceBudget, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

export function AllowanceBudgetForm({
  initial,
  onSave,
  onCancel,
}: AllowanceBudgetFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      startDate: initial?.startDate ?? '',
      endDate: initial?.endDate ?? '',
      inputMode: initial?.dailyTargetMinor ? 'daily' : 'total',
      totalBudgetMinor: initial?.totalBudgetMinor ?? 0,
      dailyTargetMinor: initial?.dailyTargetMinor,
      weeklyTargetMinor: undefined,
      weekdayTargetMinor: initial?.weekdayTargetMinor,
      weekendTargetMinor: initial?.weekendTargetMinor,
      spentAmountMinor: initial?.spentAmountMinor ?? 0,
      status: initial?.status ?? 'active',
    },
  });

  const inputMode = watch('inputMode');
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const dailyTargetMinor = watch('dailyTargetMinor');
  const weeklyTargetMinor = watch('weeklyTargetMinor');
  const weekdayTargetMinor = watch('weekdayTargetMinor');
  const weekendTargetMinor = watch('weekendTargetMinor');

  // Compute derived total based on input mode
  const derivedTotal = React.useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return null;
    if (inputMode === 'daily' && dailyTargetMinor) {
      const days = countDaysInRange(startDate, endDate);
      return dailyTargetMinor * days;
    }
    if (inputMode === 'weekly' && weeklyTargetMinor) {
      const days = countDaysInRange(startDate, endDate);
      const daily = Math.round(weeklyTargetMinor / 7);
      return daily * days;
    }
    if (inputMode === 'weekday-weekend' && (weekdayTargetMinor || weekendTargetMinor)) {
      const { weekdays, weekends } = countWeekdayWeekend(startDate, endDate);
      return (weekdayTargetMinor ?? 0) * weekdays + (weekendTargetMinor ?? 0) * weekends;
    }
    return null;
  }, [
    inputMode,
    startDate,
    endDate,
    dailyTargetMinor,
    weeklyTargetMinor,
    weekdayTargetMinor,
    weekendTargetMinor,
  ]);

  async function onSubmit(values: FormValues) {
    const total =
      values.inputMode === 'total'
        ? values.totalBudgetMinor
        : (derivedTotal ?? values.totalBudgetMinor);

    try {
      await onSave({
        name: values.name,
        startDate: values.startDate,
        endDate: values.endDate,
        totalBudgetMinor: total,
        dailyTargetMinor:
          values.inputMode === 'daily'
            ? values.dailyTargetMinor
            : values.inputMode === 'weekly' && values.weeklyTargetMinor
              ? Math.round(values.weeklyTargetMinor / 7)
              : undefined,
        weekdayTargetMinor:
          values.inputMode === 'weekday-weekend' ? values.weekdayTargetMinor : undefined,
        weekendTargetMinor:
          values.inputMode === 'weekday-weekend' ? values.weekendTargetMinor : undefined,
        spentAmountMinor: values.spentAmountMinor,
        status: values.status,
      });
    } catch {
      toast.error('Failed to save allowance budget. Please try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="ab-name">Budget name *</Label>
        <Input
          id="ab-name"
          placeholder="e.g. Daily Allowance, Food & Transport"
          aria-invalid={!!errors.name}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-destructive" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ab-start">Start date *</Label>
          <Input
            id="ab-start"
            type="date"
            aria-invalid={!!errors.startDate}
            {...register('startDate')}
          />
          {errors.startDate && (
            <p className="text-xs text-destructive" role="alert">
              {errors.startDate.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ab-end">End date *</Label>
          <Input
            id="ab-end"
            type="date"
            aria-invalid={!!errors.endDate}
            {...register('endDate')}
          />
          {errors.endDate && (
            <p className="text-xs text-destructive" role="alert">
              {errors.endDate.message}
            </p>
          )}
        </div>
      </div>

      {/* Days info */}
      {startDate && endDate && endDate >= startDate && (
        <p className="text-xs text-muted-foreground">
          {countDaysInRange(startDate, endDate)} day(s) in this range
        </p>
      )}

      {/* Input mode */}
      <div className="space-y-1.5">
        <Label htmlFor="ab-mode">How do you want to set the budget?</Label>
        <Controller
          control={control}
          name="inputMode"
          render={({ field }) => (
            <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
              <SelectTrigger id="ab-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total">Enter total budget</SelectItem>
                <SelectItem value="daily">Enter daily amount</SelectItem>
                <SelectItem value="weekly">Enter weekly amount</SelectItem>
                <SelectItem value="weekday-weekend">Set weekday and weekend amounts separately</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Amount inputs based on mode */}
      {inputMode === 'total' && (
        <div className="space-y-1.5">
          <Label htmlFor="ab-total">Total budget *</Label>
          <Controller
            control={control}
            name="totalBudgetMinor"
            render={({ field }) => (
              <MoneyInput
                id="ab-total"
                value={field.value}
                onChange={(v) => field.onChange(v ?? 0)}
                aria-invalid={!!errors.totalBudgetMinor}
                zeroAsEmpty={false}
              />
            )}
          />
        </div>
      )}

      {inputMode === 'daily' && (
        <div className="space-y-1.5">
          <Label htmlFor="ab-daily">Daily target</Label>
          <Controller
            control={control}
            name="dailyTargetMinor"
            render={({ field }) => (
              <MoneyInput
                id="ab-daily"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      )}

      {inputMode === 'weekly' && (
        <div className="space-y-1.5">
          <Label htmlFor="ab-weekly">Weekly target</Label>
          <Controller
            control={control}
            name="weeklyTargetMinor"
            render={({ field }) => (
              <MoneyInput
                id="ab-weekly"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      )}

      {inputMode === 'weekday-weekend' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ab-weekday">Weekday amount</Label>
            <Controller
              control={control}
              name="weekdayTargetMinor"
              render={({ field }) => (
                <MoneyInput
                  id="ab-weekday"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ab-weekend">Weekend amount</Label>
            <Controller
              control={control}
              name="weekendTargetMinor"
              render={({ field }) => (
                <MoneyInput
                  id="ab-weekend"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </div>
      )}

      {/* Derived total preview */}
      {inputMode !== 'total' && derivedTotal !== null && (
        <div className="rounded-lg bg-muted p-3 text-sm">
          <p className="text-muted-foreground">Computed total budget</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">
            {formatMoney(derivedTotal)}
          </p>
        </div>
      )}

      {/* Amount spent */}
      <div className="space-y-1.5">
        <Label htmlFor="ab-spent">
          Amount already spent <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Controller
          control={control}
          name="spentAmountMinor"
          render={({ field }) => (
            <MoneyInput
              id="ab-spent"
              value={field.value}
              onChange={(v) => field.onChange(v ?? 0)}
              zeroAsEmpty={false}
            />
          )}
        />
      </div>

      {/* Status */}
      <div className="space-y-1.5">
        <Label htmlFor="ab-status">Status</Label>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
              <SelectTrigger id="ab-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
          {initial ? 'Save changes' : 'Add budget'}
        </Button>
      </div>
    </form>
  );
}
