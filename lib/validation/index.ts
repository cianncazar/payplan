import { z } from 'zod';

// ─── Shared helpers ───────────────────────────────────────────────────────────

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a YYYY-MM-DD date')
  .refine((s) => {
    const parts = s.split('-');
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() + 1 === m && dt.getDate() === d;
  }, 'Invalid calendar date');

const minorInt = z.number().int('Must be an integer');
const nonNegativeMinor = z.number().int('Must be an integer').min(0, 'Must be >= 0');

// ─── Enum schemas ─────────────────────────────────────────────────────────────

export const PaymentCategorySchema = z.enum([
  'rent',
  'utility',
  'loan',
  'credit_card',
  'bnpl',
  'subscription',
  'insurance',
  'tuition',
  'tax',
  'medical',
  'family_obligation',
  'savings_commitment',
  'one_time_bill',
  'other',
]);

export const PaymentStructureSchema = z.enum([
  'one_time',
  'fixed_recurring',
  'variable_recurring',
  'fixed_installment',
  'amortizing_loan',
  'revolving_credit',
  'no_interest_borrowing',
  'custom_schedule',
]);

export const PaymentStatusSchema = z.enum(['active', 'paused', 'completed', 'archived']);

export const PaymentOccurrenceStatusSchema = z.enum([
  'scheduled',
  'partially_paid',
  'paid',
  'overdue',
  'waived',
  'cancelled',
]);

export const IncomeTypeSchema = z.enum([
  'salary',
  'business',
  'allowance',
  'remittance',
  'freelance',
  'bonus',
  'refund',
  'other',
]);

export const IncomeEventStatusSchema = z.enum([
  'expected',
  'received',
  'delayed',
  'cancelled',
]);

export const AllowanceBudgetStatusSchema = z.enum(['active', 'completed', 'cancelled']);

export const CashSourceTypeSchema = z.enum(['cash', 'bank', 'ewallet', 'other']);

export const PlannerStrategySchema = z.enum([
  'deadline_first',
  'essential_first',
  'minimums_first',
  'smallest_balance_first',
  'highest_interest_first',
  'lowest_cash_flow_risk',
  'custom',
]);

export const ThemeSchema = z.enum(['light', 'dark', 'system']);

// ─── Recurrence ───────────────────────────────────────────────────────────────

export const RecurrenceRuleSchema = z
  .object({
    frequency: z.enum(['weekly', 'biweekly', 'semimonthly', 'monthly', 'quarterly', 'yearly']),
    interval: z.number().int().min(1).optional(),
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    daysOfMonth: z.array(z.number().int().min(1).max(31)).optional(),
    monthDayOverflow: z.enum(['last_day', 'next_month', 'skip']).optional(),
    endType: z.enum(['never', 'on_date', 'after_count']),
    endDate: isoDate.optional(),
    occurrenceCount: z.number().int().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.frequency === 'semimonthly') {
      if (!data.daysOfMonth || data.daysOfMonth.length !== 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Semimonthly recurrence requires exactly 2 values in daysOfMonth',
          path: ['daysOfMonth'],
        });
      }
    }
    if (data.endType === 'on_date' && !data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endDate is required when endType is "on_date"',
        path: ['endDate'],
      });
    }
    if (data.endType === 'after_count' && data.occurrenceCount == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'occurrenceCount is required when endType is "after_count"',
        path: ['occurrenceCount'],
      });
    }
  });

// ─── App Settings ─────────────────────────────────────────────────────────────

export const AppSettingsUpdateSchema = z.object({
  defaultCurrency: z.string().min(1).optional(),
  locale: z.string().min(1).optional(),
  timezone: z.string().min(1).optional(),
  minimumCashBufferMinor: nonNegativeMinor.optional(),
  weekStartsOn: z
    .union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
    ])
    .optional(),
  defaultStrategy: PlannerStrategySchema.optional(),
  theme: ThemeSchema.optional(),
  privacyMode: z.boolean().optional(),
  setupCompleted: z.boolean().optional(),
});

// ─── Cash Source ──────────────────────────────────────────────────────────────

export const CashSourceCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: CashSourceTypeSchema,
  balanceMinor: minorInt,
  currency: z.string().min(1, 'Currency is required'),
  includeInPlanner: z.boolean().default(true),
  archived: z.boolean().default(false),
});

export const CashSourceUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: CashSourceTypeSchema.optional(),
  balanceMinor: minorInt.optional(),
  currency: z.string().min(1).optional(),
  includeInPlanner: z.boolean().optional(),
  archived: z.boolean().optional(),
});

// ─── Payment Obligation ───────────────────────────────────────────────────────

export const PaymentObligationCreateSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    payee: z.string().optional(),
    category: PaymentCategorySchema,
    customCategoryLabel: z.string().optional(),
    structure: PaymentStructureSchema,
    currency: z.string().min(1, 'Currency is required'),

    originalAmountMinor: minorInt.optional(),
    currentBalanceMinor: minorInt.optional(),
    statedInstallmentMinor: nonNegativeMinor.optional(),
    minimumPaymentMinor: nonNegativeMinor.optional(),

    annualInterestRate: z.string().optional(),
    dailyFeeRate: z.string().optional(),
    upfrontFeeMinor: nonNegativeMinor.optional(),

    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    firstDueDate: isoDate.optional(),
    recurrence: RecurrenceRuleSchema.optional(),
    installmentCount: z.number().int().min(1).optional(),

    gracePeriodDays: z.number().int().min(0).default(0),
    essential: z.boolean().default(false),
    priority: z.number().int().min(1).max(5).default(3),
    status: PaymentStatusSchema.default('active'),

    notes: z.string().optional(),
  })
  .refine(
    (d) => {
      if (d.startDate && d.endDate) return d.endDate >= d.startDate;
      return true;
    },
    { message: 'End date must be on or after start date', path: ['endDate'] }
  );

export const PaymentObligationUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    payee: z.string().optional(),
    category: PaymentCategorySchema.optional(),
    customCategoryLabel: z.string().optional(),
    structure: PaymentStructureSchema.optional(),
    currency: z.string().min(1).optional(),
    originalAmountMinor: minorInt.optional(),
    currentBalanceMinor: minorInt.optional(),
    statedInstallmentMinor: nonNegativeMinor.optional(),
    minimumPaymentMinor: nonNegativeMinor.optional(),
    annualInterestRate: z.string().optional(),
    dailyFeeRate: z.string().optional(),
    upfrontFeeMinor: nonNegativeMinor.optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    firstDueDate: isoDate.optional(),
    recurrence: RecurrenceRuleSchema.optional(),
    installmentCount: z.number().int().min(1).optional(),
    gracePeriodDays: z.number().int().min(0).optional(),
    essential: z.boolean().optional(),
    priority: z.number().int().min(1).max(5).optional(),
    status: PaymentStatusSchema.optional(),
    notes: z.string().optional(),
  })
  .refine(
    (d) => {
      if (d.startDate && d.endDate) return d.endDate >= d.startDate;
      return true;
    },
    { message: 'End date must be on or after start date', path: ['endDate'] }
  );

// ─── Payment Occurrence ───────────────────────────────────────────────────────

export const PaymentOccurrenceCreateSchema = z.object({
  paymentId: z.string().uuid(),
  sequenceNumber: z.number().int().min(0),
  dueDate: isoDate,
  graceDate: isoDate.optional(),

  dueAmountMinor: nonNegativeMinor,
  minimumAmountMinor: nonNegativeMinor.optional(),
  principalAmountMinor: nonNegativeMinor.optional(),
  interestAmountMinor: nonNegativeMinor.optional(),
  feeAmountMinor: nonNegativeMinor.default(0),

  paidAmountMinor: nonNegativeMinor.default(0),
  paidDate: isoDate.optional(),

  status: PaymentOccurrenceStatusSchema.default('scheduled'),

  amountIsEstimate: z.boolean().default(false),
  manuallyOverridden: z.boolean().default(false),
  notes: z.string().optional(),
});

export const PaymentOccurrenceUpdateSchema = z.object({
  dueDate: isoDate.optional(),
  graceDate: isoDate.optional(),
  dueAmountMinor: nonNegativeMinor.optional(),
  minimumAmountMinor: nonNegativeMinor.optional(),
  principalAmountMinor: nonNegativeMinor.optional(),
  interestAmountMinor: nonNegativeMinor.optional(),
  feeAmountMinor: nonNegativeMinor.optional(),
  paidAmountMinor: nonNegativeMinor.optional(),
  paidDate: isoDate.optional(),
  status: PaymentOccurrenceStatusSchema.optional(),
  amountIsEstimate: z.boolean().optional(),
  manuallyOverridden: z.boolean().optional(),
  notes: z.string().optional(),
});

// ─── Income Source ────────────────────────────────────────────────────────────

export const IncomeSourceCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: IncomeTypeSchema,
  currency: z.string().min(1, 'Currency is required'),
  recurrence: RecurrenceRuleSchema.optional(),
  expectedAmountMinor: nonNegativeMinor.optional(),
  active: z.boolean().default(true),
});

export const IncomeSourceUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: IncomeTypeSchema.optional(),
  currency: z.string().min(1).optional(),
  recurrence: RecurrenceRuleSchema.optional(),
  expectedAmountMinor: nonNegativeMinor.optional(),
  active: z.boolean().optional(),
});

// ─── Income Event ─────────────────────────────────────────────────────────────

export const IncomeEventCreateSchema = z.object({
  incomeSourceId: z.string().uuid().optional(),
  cashSourceId: z.string().uuid().optional(),
  expectedDate: isoDate,
  receivedDate: isoDate.optional(),
  expectedAmountMinor: nonNegativeMinor,
  receivedAmountMinor: nonNegativeMinor.optional(),
  status: IncomeEventStatusSchema.default('expected'),
  notes: z.string().optional(),
});

export const IncomeEventUpdateSchema = z.object({
  incomeSourceId: z.string().uuid().optional(),
  cashSourceId: z.string().uuid().optional(),
  expectedDate: isoDate.optional(),
  receivedDate: isoDate.optional(),
  expectedAmountMinor: nonNegativeMinor.optional(),
  receivedAmountMinor: nonNegativeMinor.optional(),
  status: IncomeEventStatusSchema.optional(),
  notes: z.string().optional(),
});

// ─── Allowance Budget ─────────────────────────────────────────────────────────

export const AllowanceBudgetCreateSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    startDate: isoDate,
    endDate: isoDate,
    totalBudgetMinor: nonNegativeMinor,
    dailyTargetMinor: nonNegativeMinor.optional(),
    weekdayTargetMinor: nonNegativeMinor.optional(),
    weekendTargetMinor: nonNegativeMinor.optional(),
    spentAmountMinor: nonNegativeMinor.default(0),
    status: AllowanceBudgetStatusSchema.default('active'),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export const AllowanceBudgetUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    totalBudgetMinor: nonNegativeMinor.optional(),
    dailyTargetMinor: nonNegativeMinor.optional(),
    weekdayTargetMinor: nonNegativeMinor.optional(),
    weekendTargetMinor: nonNegativeMinor.optional(),
    spentAmountMinor: nonNegativeMinor.optional(),
    status: AllowanceBudgetStatusSchema.optional(),
  })
  .refine(
    (d) => {
      if (d.startDate && d.endDate) return d.endDate >= d.startDate;
      return true;
    },
    { message: 'End date must be on or after start date', path: ['endDate'] }
  );
