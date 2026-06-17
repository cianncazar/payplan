import { z } from 'zod';
import {
  isoDate,
  PlannerStrategySchema,
  ThemeSchema,
  RecurrenceRuleSchema,
  PaymentCategorySchema,
  PaymentStructureSchema,
  PaymentStatusSchema,
  PaymentOccurrenceStatusSchema,
  IncomeTypeSchema,
  IncomeEventStatusSchema,
  AllowanceBudgetStatusSchema,
  CashSourceTypeSchema,
} from '@/lib/validation';

// ─── Shared ───────────────────────────────────────────────────────────────────

const isoTimestamp = z.string().min(1, 'Timestamp required');
const id = z.string().min(1, 'ID required');
const minorInt = z.number().int();
const nonNegMinor = z.number().int().min(0);

// ─── Record schemas ───────────────────────────────────────────────────────────

export const AppSettingsBackupSchema = z.object({
  id: z.literal('local-settings'),
  defaultCurrency: z.string().min(1),
  locale: z.string().min(1),
  timezone: z.string().min(1),
  minimumCashBufferMinor: nonNegMinor,
  weekStartsOn: z.union([
    z.literal(0), z.literal(1), z.literal(2), z.literal(3),
    z.literal(4), z.literal(5), z.literal(6),
  ]),
  defaultStrategy: PlannerStrategySchema,
  includeExpectedIncomeDefault: z.boolean().optional().default(false),
  theme: ThemeSchema,
  privacyMode: z.boolean(),
  setupCompleted: z.boolean(),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});

export const CashSourceBackupSchema = z.object({
  id,
  name: z.string().min(1),
  type: CashSourceTypeSchema,
  balanceMinor: minorInt,
  currency: z.string().min(1),
  includeInPlanner: z.boolean(),
  archived: z.boolean(),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});

export const PaymentObligationBackupSchema = z.object({
  id,
  name: z.string().min(1),
  payee: z.string().optional(),
  category: PaymentCategorySchema,
  customCategoryLabel: z.string().optional(),
  structure: PaymentStructureSchema,
  currency: z.string().min(1),
  originalAmountMinor: minorInt.optional(),
  currentBalanceMinor: minorInt.optional(),
  statedInstallmentMinor: nonNegMinor.optional(),
  minimumPaymentMinor: nonNegMinor.optional(),
  annualInterestRate: z.string().optional(),
  dailyFeeRate: z.string().optional(),
  upfrontFeeMinor: nonNegMinor.optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  firstDueDate: isoDate.optional(),
  recurrence: RecurrenceRuleSchema.optional(),
  installmentCount: z.number().int().min(1).optional(),
  gracePeriodDays: z.number().int().min(0),
  essential: z.boolean(),
  priority: z.union([
    z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
  ]),
  status: PaymentStatusSchema,
  notes: z.string().optional(),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});

export const PaymentOccurrenceBackupSchema = z.object({
  id,
  paymentId: z.string().min(1),
  sequenceNumber: z.number().int().min(0),
  dueDate: isoDate,
  graceDate: isoDate.optional(),
  dueAmountMinor: nonNegMinor,
  minimumAmountMinor: nonNegMinor.optional(),
  principalAmountMinor: nonNegMinor.optional(),
  interestAmountMinor: nonNegMinor.optional(),
  feeAmountMinor: nonNegMinor,
  paidAmountMinor: nonNegMinor,
  paidDate: isoDate.optional(),
  status: PaymentOccurrenceStatusSchema,
  amountIsEstimate: z.boolean(),
  manuallyOverridden: z.boolean(),
  notes: z.string().optional(),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});

export const IncomeSourceBackupSchema = z.object({
  id,
  name: z.string().min(1),
  type: IncomeTypeSchema,
  currency: z.string().min(1),
  recurrence: RecurrenceRuleSchema.optional(),
  expectedAmountMinor: nonNegMinor.optional(),
  active: z.boolean(),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});

export const IncomeEventBackupSchema = z.object({
  id,
  incomeSourceId: z.string().optional(),
  cashSourceId: z.string().optional(),
  expectedDate: isoDate,
  receivedDate: isoDate.optional(),
  expectedAmountMinor: nonNegMinor,
  receivedAmountMinor: nonNegMinor.optional(),
  status: IncomeEventStatusSchema,
  notes: z.string().optional(),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});

export const AllowanceBudgetBackupSchema = z.object({
  id,
  name: z.string().min(1),
  startDate: isoDate,
  endDate: isoDate,
  totalBudgetMinor: nonNegMinor,
  dailyTargetMinor: nonNegMinor.optional(),
  weekdayTargetMinor: nonNegMinor.optional(),
  weekendTargetMinor: nonNegMinor.optional(),
  spentAmountMinor: nonNegMinor,
  status: AllowanceBudgetStatusSchema,
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});

const PlannerSummarySchema = z.object({
  health: z.enum(['on_track', 'tight', 'shortfall', 'overdue', 'not_enough_data']),
  reason: z.string(),
  totalPlannedMinor: z.number().int(),
  fullyFundedCount: z.number().int().min(0),
  underfundedCount: z.number().int().min(0),
  shortfallCount: z.number().int().min(0),
  earliestShortfallDate: isoDate.optional(),
  lowestCashBalanceMinor: z.number().int(),
  remainingCashMinor: z.number().int(),
  estimatedCostMinor: z.number().int().optional(),
});

export const PlanScenarioBackupSchema = z.object({
  id,
  name: z.string().min(1),
  strategy: PlannerStrategySchema,
  startDate: isoDate,
  endDate: isoDate,
  openingCashMinor: z.number().int(),
  cashBufferMinor: nonNegMinor,
  reservedAllowanceMinor: nonNegMinor,
  includeExpectedIncome: z.boolean(),
  settings: z.record(z.string(), z.unknown()),
  summary: PlannerSummarySchema.optional(),
  active: z.boolean(),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});

export const PlanAllocationBackupSchema = z.object({
  id,
  scenarioId: z.string().min(1),
  occurrenceId: z.string().min(1),
  plannedDate: isoDate,
  plannedAmountMinor: nonNegMinor,
  allocationType: z.enum(['minimum', 'required', 'extra', 'manual']),
  reason: z.string(),
  manuallyLocked: z.boolean(),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});

export const ManualCashAdjustmentBackupSchema = z.object({
  id,
  date: isoDate,
  amountMinor: nonNegMinor,
  direction: z.enum(['inflow', 'outflow']),
  label: z.string().min(1),
  notes: z.string().optional(),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});

// ─── Full backup schema ───────────────────────────────────────────────────────

export const PayPlanBackupSchema = z.object({
  format: z.literal('payplan-backup'),
  version: z.literal(1),
  exportedAt: isoTimestamp,
  appVersion: z.string(),
  data: z.object({
    appSettings: z.array(AppSettingsBackupSchema),
    cashSources: z.array(CashSourceBackupSchema),
    payments: z.array(PaymentObligationBackupSchema),
    paymentOccurrences: z.array(PaymentOccurrenceBackupSchema),
    incomeSources: z.array(IncomeSourceBackupSchema),
    incomeEvents: z.array(IncomeEventBackupSchema),
    allowanceBudgets: z.array(AllowanceBudgetBackupSchema),
    planScenarios: z.array(PlanScenarioBackupSchema),
    planAllocations: z.array(PlanAllocationBackupSchema),
    manualCashAdjustments: z.array(ManualCashAdjustmentBackupSchema),
  }),
});

export type ValidatedBackup = z.infer<typeof PayPlanBackupSchema>;
