'use client';

import * as React from 'react';
import {
  useForm,
  Controller,
  useFieldArray,
  type SubmitHandler,
  type Control,
  type FieldValues,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoneyInput } from '@/components/forms/money-input';
import { RecurrenceFields } from '@/components/forms/recurrence-fields';
import { SchedulePreview } from '@/components/payments/schedule-preview';
import {
  PAYMENT_CATEGORIES,
  PAYMENT_CATEGORY_LABELS,
  PAYMENT_STRUCTURE_LABELS,
  PAYMENT_STRUCTURES,
} from '@/lib/constants';
import {
  isoDate,
  PaymentCategorySchema,
  PaymentStatusSchema,
  PaymentStructureSchema,
  RecurrenceRuleSchema,
} from '@/lib/validation';
import { generateOccurrencePreviews, today } from '@/lib/calculations/occurrences';
import { calculateAmortizingPayment } from '@/lib/calculations/installments';
import { formatMoney } from '@/lib/money';
import type { PaymentObligation, PaymentStructure } from '@/types';

// ─── Form schema ──────────────────────────────────────────────────────────────

// HTML date inputs return '' when empty; convert to undefined so isoDate.optional()
// doesn't reject an untouched field that the user never saw.
const optionalIsoDate = z.preprocess(
  (v) => (v === '' ? undefined : v),
  isoDate.optional()
);

const customRowSchema = z.object({
  dueDate: isoDate,
  amountMinor: z.number().int().min(0, 'Amount must be 0 or more'),
  label: z.string().optional(),
  notes: z.string().optional(),
});

const paymentFormSchema = z
  .object({
    name: z.string().min(1, 'Payment name is required'),
    payee: z.string().optional(),
    category: PaymentCategorySchema,
    customCategoryLabel: z.string().optional(),
    structure: PaymentStructureSchema,
    currency: z.string().min(1, 'Currency is required'),

    statedInstallmentMinor: z.number().int().min(0).optional(),
    originalAmountMinor: z.number().int().min(0).optional(),
    currentBalanceMinor: z.number().int().min(0).optional(),
    minimumPaymentMinor: z.number().int().min(0).optional(),
    upfrontFeeMinor: z.number().int().min(0).optional(),
    annualInterestRate: z.string().optional(),

    firstDueDate: optionalIsoDate,
    endDate: optionalIsoDate,

    recurrence: RecurrenceRuleSchema.optional(),
    installmentCount: z.coerce.number().int().min(1).optional(),

    gracePeriodDays: z.coerce.number().int().min(0).default(0),
    essential: z.boolean().default(false),
    priority: z.number().int().min(1).max(5).default(3),
    status: PaymentStatusSchema.default('active'),
    notes: z.string().optional(),

    customRows: z.array(customRowSchema).optional(),
  })
  .superRefine((d, ctx) => {
    const add = (path: string, msg: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: [path] });

    if (d.structure === 'one_time') {
      if (!d.firstDueDate) add('firstDueDate', 'Due date is required');
      if (d.statedInstallmentMinor === undefined) add('statedInstallmentMinor', 'Amount is required');
    }
    if (d.structure === 'fixed_recurring' || d.structure === 'variable_recurring') {
      if (!d.firstDueDate) add('firstDueDate', 'First due date is required');
      if (!d.recurrence?.frequency) add('recurrence', 'Frequency is required');
    }
    if (d.structure === 'fixed_installment') {
      if (d.statedInstallmentMinor === undefined) add('statedInstallmentMinor', 'Installment amount is required');
      if (!d.installmentCount) add('installmentCount', 'Number of installments is required');
      if (!d.firstDueDate) add('firstDueDate', 'First due date is required');
      if (!d.recurrence?.frequency) add('recurrence', 'Payment frequency is required');
    }
    if (d.structure === 'amortizing_loan') {
      if (!d.originalAmountMinor) add('originalAmountMinor', 'Principal amount is required');
      if (!d.installmentCount) add('installmentCount', 'Number of payments is required');
      if (!d.firstDueDate) add('firstDueDate', 'First payment date is required');
      if (!d.recurrence?.frequency) add('recurrence', 'Payment frequency is required');
    }
    if (d.structure === 'revolving_credit') {
      if (d.minimumPaymentMinor === undefined) add('minimumPaymentMinor', 'Minimum payment is required');
      if (!d.firstDueDate) add('firstDueDate', 'Due date is required');
    }
    if (d.structure === 'no_interest_borrowing') {
      if (!d.originalAmountMinor) add('originalAmountMinor', 'Amount borrowed is required');
      if (!d.firstDueDate) add('firstDueDate', 'First payment date is required');
      if (!d.recurrence?.frequency) add('recurrence', 'Payment frequency is required');
    }
    if (d.structure === 'custom_schedule') {
      if (!d.customRows || d.customRows.length === 0)
        add('customRows', 'Add at least one payment date');
    }
  });

type FormValues = z.infer<typeof paymentFormSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

export type SavePaymentData = {
  payment: Omit<PaymentObligation, 'id' | 'createdAt' | 'updatedAt'>;
  customRows?: FormValues['customRows'];
};

interface PaymentFormProps {
  initial?: PaymentObligation;
  onSave: (data: SavePaymentData) => Promise<void>;
  onCancel: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPartialPayment(v: FormValues): PaymentObligation {
  return {
    id: '',
    name: v.name,
    payee: v.payee,
    category: v.category,
    customCategoryLabel: v.customCategoryLabel,
    structure: v.structure,
    currency: v.currency,
    statedInstallmentMinor: v.statedInstallmentMinor,
    originalAmountMinor: v.originalAmountMinor,
    currentBalanceMinor: v.currentBalanceMinor,
    minimumPaymentMinor: v.minimumPaymentMinor,
    upfrontFeeMinor: v.upfrontFeeMinor,
    annualInterestRate: v.annualInterestRate,
    firstDueDate: v.firstDueDate,
    endDate: v.endDate,
    recurrence: v.recurrence,
    installmentCount: v.installmentCount,
    gracePeriodDays: v.gracePeriodDays,
    essential: v.essential,
    priority: v.priority as 1 | 2 | 3 | 4 | 5,
    status: v.status,
    notes: v.notes,
    createdAt: '',
    updatedAt: '',
  };
}

// ─── Priority selector ────────────────────────────────────────────────────────

function PrioritySelector({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1" role="group" aria-label="Priority (1 = highest)">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          aria-pressed={value === n}
          className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
            value === n
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground hover:bg-muted'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

// ─── Main form component ──────────────────────────────────────────────────────

export function PaymentForm({ initial, onSave, onCancel }: PaymentFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(paymentFormSchema) as any,
    defaultValues: {
      name: initial?.name ?? '',
      payee: initial?.payee ?? '',
      category: initial?.category ?? 'other',
      customCategoryLabel: initial?.customCategoryLabel ?? '',
      structure: initial?.structure ?? 'one_time',
      currency: initial?.currency ?? 'PHP',
      statedInstallmentMinor: initial?.statedInstallmentMinor,
      originalAmountMinor: initial?.originalAmountMinor,
      currentBalanceMinor: initial?.currentBalanceMinor,
      minimumPaymentMinor: initial?.minimumPaymentMinor,
      upfrontFeeMinor: initial?.upfrontFeeMinor,
      annualInterestRate: initial?.annualInterestRate ?? '',
      firstDueDate: initial?.firstDueDate,
      endDate: initial?.endDate,
      recurrence: initial?.recurrence,
      installmentCount: initial?.installmentCount,
      gracePeriodDays: initial?.gracePeriodDays ?? 0,
      essential: initial?.essential ?? false,
      priority: initial?.priority ?? 3,
      status: initial?.status ?? 'active',
      notes: initial?.notes ?? '',
      customRows: [],
    },
  });

  const { fields: customRowFields, append, remove } = useFieldArray({
    control,
    name: 'customRows',
  });

  // Watch relevant fields for live schedule preview
  const formValues = watch();
  const structure = formValues.structure as PaymentStructure;

  // Derive live schedule previews
  const previews = React.useMemo(() => {
    if (structure === 'custom_schedule') return [];
    try {
      const partial = buildPartialPayment(formValues);
      return generateOccurrencePreviews(partial, today());
    } catch {
      return [];
    }
  }, [formValues, structure]);

  const isEstimate =
    structure === 'amortizing_loan' || structure === 'variable_recurring';

  // Amortizing loan: show computed payment amount
  const computedPayment = React.useMemo(() => {
    if (structure !== 'amortizing_loan') return null;
    const principal = formValues.originalAmountMinor ?? 0;
    const rate = formValues.annualInterestRate ? parseFloat(formValues.annualInterestRate) : 0;
    const count = formValues.installmentCount ?? 0;
    if (!principal || !count) return null;
    return calculateAmortizingPayment(principal, rate, count);
  }, [
    structure,
    formValues.originalAmountMinor,
    formValues.annualInterestRate,
    formValues.installmentCount,
  ]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      const payment: Omit<PaymentObligation, 'id' | 'createdAt' | 'updatedAt'> = {
        name: values.name,
        payee: values.payee || undefined,
        category: values.category,
        customCategoryLabel: values.customCategoryLabel || undefined,
        structure: values.structure,
        currency: values.currency,
        statedInstallmentMinor: values.statedInstallmentMinor,
        originalAmountMinor: values.originalAmountMinor,
        currentBalanceMinor: values.currentBalanceMinor,
        minimumPaymentMinor: values.minimumPaymentMinor,
        upfrontFeeMinor: values.upfrontFeeMinor ?? 0,
        annualInterestRate: values.annualInterestRate || undefined,
        firstDueDate: values.firstDueDate || undefined,
        endDate: values.endDate || undefined,
        recurrence: values.recurrence,
        installmentCount: values.installmentCount,
        gracePeriodDays: values.gracePeriodDays,
        essential: values.essential,
        priority: values.priority as 1 | 2 | 3 | 4 | 5,
        status: values.status,
        notes: values.notes || undefined,
      };
      await onSave({ payment, customRows: values.customRows });
    } catch {
      toast.error('Failed to save payment. Please try again.');
    }
  };

  const errs = errors as Record<string, { message?: string }>;

  function fieldError(name: string): string | undefined {
    return errs[name]?.message;
  }

  function FieldError({ name }: { name: string }) {
    const msg = fieldError(name);
    if (!msg) return null;
    return (
      <p className="text-xs text-destructive" role="alert">
        {msg}
      </p>
    );
  }


  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {/* ── Common fields ── */}
      <div className="space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="pf-name">Payment name *</Label>
          <Input
            id="pf-name"
            placeholder="e.g. Monthly Rent, Personal Loan"
            aria-invalid={!!errors.name}
            {...register('name')}
          />
          <FieldError name="name" />
        </div>

        {/* Payee */}
        <div className="space-y-1.5">
          <Label htmlFor="pf-payee">Payee <span className="text-muted-foreground">(optional)</span></Label>
          <Input id="pf-payee" placeholder="Who are you paying?" {...register('payee')} />
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label htmlFor="pf-cat">Category</Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                <SelectTrigger id="pf-cat" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {PAYMENT_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Custom category label (only when category is 'other') */}
        {formValues.category === 'other' && (
          <div className="space-y-1.5">
            <Label htmlFor="pf-cat-label">Custom label <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="pf-cat-label"
              placeholder="How you'd describe this category"
              {...register('customCategoryLabel')}
            />
          </div>
        )}

        {/* Structure */}
        <div className="space-y-1.5">
          <Label htmlFor="pf-structure">Payment structure</Label>
          <Controller
            control={control}
            name="structure"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                <SelectTrigger id="pf-structure" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STRUCTURES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PAYMENT_STRUCTURE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Currency */}
        <div className="space-y-1.5">
          <Label htmlFor="pf-currency">Currency</Label>
          <Input
            id="pf-currency"
            placeholder="PHP"
            className="w-28"
            aria-invalid={!!errors.currency}
            {...register('currency')}
          />
          <FieldError name="currency" />
        </div>
      </div>

      <Separator />

      {/* ── Structure-specific fields ── */}

      {/* one_time */}
      {structure === 'one_time' && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Payment details</h3>
          <div className="space-y-1.5">
            <Label htmlFor="pf-amount">Amount *</Label>
            <Controller
              control={control}
              name="statedInstallmentMinor"
              render={({ field }) => (
                <MoneyInput
                  id="pf-amount"
                  value={field.value}
                  onChange={(v) => field.onChange(v)}

                  aria-invalid={!!errors.statedInstallmentMinor}
                />
              )}
            />
            <FieldError name="statedInstallmentMinor" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-due">Due date *</Label>
            <Input
              id="pf-due"
              type="date"
              aria-invalid={!!errors.firstDueDate}
              {...register('firstDueDate')}
            />
            <FieldError name="firstDueDate" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-fee">Upfront fee <span className="text-muted-foreground">(optional)</span></Label>
            <Controller
              control={control}
              name="upfrontFeeMinor"
              render={({ field }) => (
                <MoneyInput
                  id="pf-fee"
                  value={field.value}
                  onChange={(v) => field.onChange(v)}

                />
              )}
            />
          </div>
        </div>
      )}

      {/* fixed_recurring */}
      {structure === 'fixed_recurring' && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Recurring payment details</h3>
          <div className="space-y-1.5">
            <Label htmlFor="pf-amount-r">Amount per payment *</Label>
            <Controller
              control={control}
              name="statedInstallmentMinor"
              render={({ field }) => (
                <MoneyInput
                  id="pf-amount-r"
                  value={field.value}
                  onChange={field.onChange}

                  aria-invalid={!!errors.statedInstallmentMinor}
                />
              )}
            />
            <FieldError name="statedInstallmentMinor" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-first-due">First due date *</Label>
            <Input
              id="pf-first-due"
              type="date"
              aria-invalid={!!errors.firstDueDate}
              {...register('firstDueDate')}
            />
            <FieldError name="firstDueDate" />
          </div>
          <RecurrenceFields control={control as unknown as Control<FieldValues>} name="recurrence" errors={errors} />
        </div>
      )}

      {/* variable_recurring */}
      {structure === 'variable_recurring' && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Variable recurring payment</h3>
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Amounts may change each period. The estimated amount will be used for planning.
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-est">Estimated amount</Label>
            <Controller
              control={control}
              name="statedInstallmentMinor"
              render={({ field }) => (
                <MoneyInput
                  id="pf-est"
                  value={field.value}
                  onChange={field.onChange}

                />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-next-due">Next due date *</Label>
            <Input
              id="pf-next-due"
              type="date"
              aria-invalid={!!errors.firstDueDate}
              {...register('firstDueDate')}
            />
            <FieldError name="firstDueDate" />
          </div>
          <RecurrenceFields control={control as unknown as Control<FieldValues>} name="recurrence" errors={errors} />
        </div>
      )}

      {/* fixed_installment */}
      {structure === 'fixed_installment' && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Fixed installment plan</h3>
          <div className="space-y-1.5">
            <Label htmlFor="pf-principal-fi">Principal / total cost <span className="text-muted-foreground">(optional)</span></Label>
            <Controller
              control={control}
              name="originalAmountMinor"
              render={({ field }) => (
                <MoneyInput
                  id="pf-principal-fi"
                  value={field.value}
                  onChange={field.onChange}

                />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-inst-amt">Installment amount *</Label>
            <Controller
              control={control}
              name="statedInstallmentMinor"
              render={({ field }) => (
                <MoneyInput
                  id="pf-inst-amt"
                  value={field.value}
                  onChange={field.onChange}

                  aria-invalid={!!errors.statedInstallmentMinor}
                />
              )}
            />
            <FieldError name="statedInstallmentMinor" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-inst-count">Number of installments *</Label>
            <Input
              id="pf-inst-count"
              type="number"
              min={1}
              aria-invalid={!!errors.installmentCount}
              {...register('installmentCount', { valueAsNumber: true })}
            />
            <FieldError name="installmentCount" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-first-fi">First due date *</Label>
            <Input
              id="pf-first-fi"
              type="date"
              aria-invalid={!!errors.firstDueDate}
              {...register('firstDueDate')}
            />
            <FieldError name="firstDueDate" />
          </div>
          <RecurrenceFields control={control as unknown as Control<FieldValues>} name="recurrence" frequencyOnly errors={errors} />
          <div className="space-y-1.5">
            <Label htmlFor="pf-upfront-fi">Upfront fee <span className="text-muted-foreground">(optional)</span></Label>
            <Controller
              control={control}
              name="upfrontFeeMinor"
              render={({ field }) => (
                <MoneyInput
                  id="pf-upfront-fi"
                  value={field.value}
                  onChange={field.onChange}

                />
              )}
            />
          </div>
        </div>
      )}

      {/* amortizing_loan */}
      {structure === 'amortizing_loan' && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Amortizing loan</h3>
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Installment amounts are estimates based on your inputs. Confirm with your lender.
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-principal">Principal amount *</Label>
            <Controller
              control={control}
              name="originalAmountMinor"
              render={({ field }) => (
                <MoneyInput
                  id="pf-principal"
                  value={field.value}
                  onChange={field.onChange}

                  aria-invalid={!!errors.originalAmountMinor}
                />
              )}
            />
            <FieldError name="originalAmountMinor" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-rate">Annual interest rate (%)</Label>
            <Input
              id="pf-rate"
              type="number"
              step="0.01"
              min={0}
              placeholder="0 for zero-interest"
              {...register('annualInterestRate')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-term">Number of payments *</Label>
            <Input
              id="pf-term"
              type="number"
              min={1}
              aria-invalid={!!errors.installmentCount}
              {...register('installmentCount', { valueAsNumber: true })}
            />
            <FieldError name="installmentCount" />
          </div>
          {computedPayment !== null && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="text-muted-foreground">Estimated payment per period</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {formatMoney(computedPayment, formValues.currency)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">*estimate</span>
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="pf-first-al">First payment date *</Label>
            <Input
              id="pf-first-al"
              type="date"
              aria-invalid={!!errors.firstDueDate}
              {...register('firstDueDate')}
            />
            <FieldError name="firstDueDate" />
          </div>
          <RecurrenceFields control={control as unknown as Control<FieldValues>} name="recurrence" frequencyOnly errors={errors} />
          <div className="space-y-1.5">
            <Label htmlFor="pf-upfront-al">Upfront fees <span className="text-muted-foreground">(optional)</span></Label>
            <Controller
              control={control}
              name="upfrontFeeMinor"
              render={({ field }) => (
                <MoneyInput
                  id="pf-upfront-al"
                  value={field.value}
                  onChange={field.onChange}

                />
              )}
            />
          </div>
        </div>
      )}

      {/* revolving_credit */}
      {structure === 'revolving_credit' && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Revolving credit</h3>
          <div className="space-y-1.5">
            <Label htmlFor="pf-balance">Current balance *</Label>
            <Controller
              control={control}
              name="currentBalanceMinor"
              render={({ field }) => (
                <MoneyInput
                  id="pf-balance"
                  value={field.value}
                  onChange={field.onChange}

                  aria-invalid={!!errors.currentBalanceMinor}
                />
              )}
            />
            <FieldError name="currentBalanceMinor" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-min">Minimum payment *</Label>
            <Controller
              control={control}
              name="minimumPaymentMinor"
              render={({ field }) => (
                <MoneyInput
                  id="pf-min"
                  value={field.value}
                  onChange={field.onChange}

                  aria-invalid={!!errors.minimumPaymentMinor}
                />
              )}
            />
            <FieldError name="minimumPaymentMinor" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-due-rev">Next due date *</Label>
            <Input
              id="pf-due-rev"
              type="date"
              aria-invalid={!!errors.firstDueDate}
              {...register('firstDueDate')}
            />
            <FieldError name="firstDueDate" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-rate-rev">Annual interest rate (%) <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="pf-rate-rev"
              type="number"
              step="0.01"
              min={0}
              placeholder="e.g. 24"
              {...register('annualInterestRate')}
            />
          </div>
        </div>
      )}

      {/* no_interest_borrowing */}
      {structure === 'no_interest_borrowing' && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">No-interest borrowing</h3>
          <div className="space-y-1.5">
            <Label htmlFor="pf-borrowed">Amount borrowed *</Label>
            <Controller
              control={control}
              name="originalAmountMinor"
              render={({ field }) => (
                <MoneyInput
                  id="pf-borrowed"
                  value={field.value}
                  onChange={field.onChange}

                  aria-invalid={!!errors.originalAmountMinor}
                />
              )}
            />
            <FieldError name="originalAmountMinor" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pf-ni-inst">Agreed installment <span className="text-muted-foreground">(optional)</span></Label>
              <Controller
                control={control}
                name="statedInstallmentMinor"
                render={({ field }) => (
                  <MoneyInput
                    id="pf-ni-inst"
                    value={field.value}
                    onChange={field.onChange}
  
                  />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-ni-count">Or number of payments</Label>
              <Input
                id="pf-ni-count"
                type="number"
                min={1}
                {...register('installmentCount', { valueAsNumber: true })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-first-ni">First payment date *</Label>
            <Input
              id="pf-first-ni"
              type="date"
              aria-invalid={!!errors.firstDueDate}
              {...register('firstDueDate')}
            />
            <FieldError name="firstDueDate" />
          </div>
          <RecurrenceFields control={control as unknown as Control<FieldValues>} name="recurrence" frequencyOnly errors={errors} />
          <div className="space-y-1.5">
            <Label htmlFor="pf-deadline">Flexible deadline <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="pf-deadline" type="date" {...register('endDate')} />
          </div>
        </div>
      )}

      {/* custom_schedule */}
      {structure === 'custom_schedule' && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Custom payment schedule</h3>
          <div className="space-y-2">
            {customRowFields.map((field, idx) => (
              <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 rounded-lg border border-border p-3">
                <div className="space-y-1">
                  <Label htmlFor={`cr-date-${idx}`} className="text-xs">Date</Label>
                  <Input
                    id={`cr-date-${idx}`}
                    type="date"
                    {...register(`customRows.${idx}.dueDate`)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`cr-amt-${idx}`} className="text-xs">Amount</Label>
                  <Controller
                    control={control}
                    name={`customRows.${idx}.amountMinor`}
                    render={({ field: f }) => (
                      <MoneyInput
                        id={`cr-amt-${idx}`}
                        value={f.value}
                        onChange={(v) => f.onChange(v ?? 0)}
      
                      />
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(idx)}
                  aria-label={`Remove row ${idx + 1}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
            {(errors.customRows as { message?: string })?.message && (
              <p className="text-xs text-destructive" role="alert">
                {(errors.customRows as { message?: string }).message}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ dueDate: '', amountMinor: 0, label: '', notes: '' })}
            >
              <Plus aria-hidden="true" />
              Add payment date
            </Button>
          </div>
        </div>
      )}

      {/* ── Schedule preview ── */}
      {previews.length > 0 && (
        <>
          <Separator />
          <SchedulePreview
            previews={previews}
            currency={formValues.currency}
            isEstimate={isEstimate}
          />
        </>
      )}

      {/* ── Grace period ── */}
      {structure !== 'custom_schedule' && (
        <div className="space-y-1.5">
          <Label htmlFor="pf-grace">Grace period (days)</Label>
          <Input
            id="pf-grace"
            type="number"
            min={0}
            className="w-24"
            {...register('gracePeriodDays', { valueAsNumber: true })}
          />
        </div>
      )}

      <Separator />

      {/* ── Planning options ── */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Planning options</h3>

        {/* Essential */}
        <div className="flex items-center gap-3">
          <Controller
            control={control}
            name="essential"
            render={({ field }) => (
              <Switch
                id="pf-essential"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <div>
            <Label htmlFor="pf-essential" className="cursor-pointer">
              Essential payment
            </Label>
            <p className="text-xs text-muted-foreground">
              Rent, utilities, medicine, and other must-pays are prioritised first.
            </p>
          </div>
        </div>

        {/* Priority */}
        <div className="space-y-1.5">
          <Label>Priority <span className="text-xs text-muted-foreground font-normal">(1 = highest)</span></Label>
          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <PrioritySelector
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label htmlFor="pf-status">Status</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                <SelectTrigger id="pf-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="pf-notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
        <Textarea
          id="pf-notes"
          placeholder="Any additional details…"
          rows={3}
          {...register('notes')}
        />
      </div>

      {/* ── Actions ── */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
          {initial ? 'Save changes' : 'Add payment'}
        </Button>
      </div>
    </form>
  );
}
