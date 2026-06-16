'use client';

import * as React from 'react';
import { Controller, type Control, type FieldErrors, type FieldValues } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RecurrenceRule, RecurrenceFrequency } from '@/types';

const FREQUENCIES: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'semimonthly', label: 'Twice a month' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

type RecurrenceValue = RecurrenceRule | undefined;

interface RecurrenceFieldsProps {
  /** react-hook-form control for the parent form. */
  control: Control<FieldValues>;
  /** The field name in the parent form (e.g. "recurrence"). */
  name: string;
  /** If true, only show frequency — no end-condition or overflow options. */
  frequencyOnly?: boolean;
  errors?: FieldErrors;
  disabled?: boolean;
}

/**
 * Controlled recurrence rule fields.
 * In `frequencyOnly` mode, shows only the frequency selector (for installment/loan forms).
 * In full mode, shows frequency, end type, and end condition.
 */
export function RecurrenceFields({
  control,
  name,
  frequencyOnly = false,
  errors,
  disabled,
}: RecurrenceFieldsProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const rule = field.value as RecurrenceValue;
        const frequency = rule?.frequency ?? null;
        const endType = rule?.endType ?? 'never';

        function setField(partial: Partial<RecurrenceRule>) {
          const updated: RecurrenceRule = {
            frequency: frequency ?? 'monthly',
            endType: 'never',
            ...rule,
            ...partial,
          };
          field.onChange(updated);
        }

        function handleFrequencyChange(val: string | null) {
          if (!val) return;
          const f = val as RecurrenceFrequency;
          const base: RecurrenceRule = {
            frequency: f,
            endType: rule?.endType ?? 'never',
            endDate: rule?.endDate,
            occurrenceCount: rule?.occurrenceCount,
          };
          // semimonthly requires two daysOfMonth
          if (f === 'semimonthly') {
            base.daysOfMonth = rule?.daysOfMonth?.length === 2
              ? rule.daysOfMonth
              : [15, 30];
          }
          field.onChange(base);
        }

        const isSemiMonthly = frequency === 'semimonthly';

        return (
          <div className="space-y-3">
            {/* Frequency */}
            <div className="space-y-1.5">
              <Label htmlFor={`${name}-freq`}>Frequency</Label>
              <Select
                value={frequency}
                onValueChange={handleFrequencyChange}
                disabled={disabled}
              >
                <SelectTrigger id={`${name}-freq`} className="w-full">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(errors?.[name] as { frequency?: { message?: string } } | undefined)?.frequency && (
                <p className="text-xs text-destructive" role="alert">
                  {(errors?.[name] as { frequency?: { message?: string } } | undefined)?.frequency?.message}
                </p>
              )}
            </div>

            {/* Semimonthly day selectors */}
            {isSemiMonthly && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`${name}-day1`}>First day of month</Label>
                  <Input
                    id={`${name}-day1`}
                    type="number"
                    min={1}
                    max={31}
                    disabled={disabled}
                    value={rule?.daysOfMonth?.[0] ?? 15}
                    onChange={(e) => {
                      const days = [...(rule?.daysOfMonth ?? [15, 30])];
                      days[0] = Number(e.target.value);
                      setField({ daysOfMonth: days });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${name}-day2`}>Second day of month</Label>
                  <Input
                    id={`${name}-day2`}
                    type="number"
                    min={1}
                    max={31}
                    disabled={disabled}
                    value={rule?.daysOfMonth?.[1] ?? 30}
                    onChange={(e) => {
                      const days = [...(rule?.daysOfMonth ?? [15, 30])];
                      days[1] = Number(e.target.value);
                      setField({ daysOfMonth: days });
                    }}
                  />
                </div>
              </div>
            )}

            {/* End condition — hidden in frequencyOnly mode */}
            {!frequencyOnly && frequency && (
              <div className="space-y-1.5">
                <Label htmlFor={`${name}-end`}>Ends</Label>
                <Select
                  value={endType}
                  onValueChange={(val) => {
                    if (!val) return;
                    setField({
                      endType: val as RecurrenceRule['endType'],
                      endDate: undefined,
                      occurrenceCount: undefined,
                    });
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger id={`${name}-end`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never (ongoing)</SelectItem>
                    <SelectItem value="on_date">On a date</SelectItem>
                    <SelectItem value="after_count">After N occurrences</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {!frequencyOnly && endType === 'on_date' && (
              <div className="space-y-1.5">
                <Label htmlFor={`${name}-end-date`}>End date</Label>
                <Input
                  id={`${name}-end-date`}
                  type="date"
                  disabled={disabled}
                  value={rule?.endDate ?? ''}
                  onChange={(e) => setField({ endDate: e.target.value || undefined })}
                />
              </div>
            )}

            {!frequencyOnly && endType === 'after_count' && (
              <div className="space-y-1.5">
                <Label htmlFor={`${name}-count`}>Number of occurrences</Label>
                <Input
                  id={`${name}-count`}
                  type="number"
                  min={1}
                  disabled={disabled}
                  value={rule?.occurrenceCount ?? ''}
                  onChange={(e) =>
                    setField({ occurrenceCount: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
