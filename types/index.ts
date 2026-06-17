// ─── Enumerations ────────────────────────────────────────────────────────────

export type PaymentCategory =
  | 'rent'
  | 'utility'
  | 'loan'
  | 'credit_card'
  | 'bnpl'
  | 'subscription'
  | 'insurance'
  | 'tuition'
  | 'tax'
  | 'medical'
  | 'family_obligation'
  | 'savings_commitment'
  | 'one_time_bill'
  | 'other';

export type PaymentStructure =
  | 'one_time'
  | 'fixed_recurring'
  | 'variable_recurring'
  | 'fixed_installment'
  | 'amortizing_loan'
  | 'revolving_credit'
  | 'no_interest_borrowing'
  | 'custom_schedule';

export type PaymentStatus = 'active' | 'paused' | 'completed' | 'archived';

export type PaymentOccurrenceStatus =
  | 'scheduled'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'waived'
  | 'cancelled';

export type IncomeType =
  | 'salary'
  | 'business'
  | 'allowance'
  | 'remittance'
  | 'freelance'
  | 'bonus'
  | 'refund'
  | 'other';

export type IncomeEventStatus = 'expected' | 'received' | 'delayed' | 'cancelled';

export type AllowanceBudgetStatus = 'active' | 'completed' | 'cancelled';

export type CashSourceType = 'cash' | 'bank' | 'ewallet' | 'other';

export type AllocationType = 'minimum' | 'required' | 'extra' | 'manual';

export type PlanHealth =
  | 'on_track'
  | 'tight'
  | 'shortfall'
  | 'overdue'
  | 'not_enough_data';

export type PlannerStrategy =
  | 'deadline_first'
  | 'essential_first'
  | 'minimums_first'
  | 'smallest_balance_first'
  | 'highest_interest_first'
  | 'lowest_cash_flow_risk'
  | 'custom';

export type RecurrenceFrequency =
  | 'weekly'
  | 'biweekly'
  | 'semimonthly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export type Theme = 'light' | 'dark' | 'system';

// ─── Recurrence ───────────────────────────────────────────────────────────────

export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  interval?: number;
  dayOfWeek?: number;
  daysOfMonth?: number[];
  monthDayOverflow?: 'last_day' | 'next_month' | 'skip';
  endType: 'never' | 'on_date' | 'after_count';
  endDate?: string;
  occurrenceCount?: number;
};

// ─── Database record types ────────────────────────────────────────────────────

export type AppSettings = {
  id: 'local-settings';
  defaultCurrency: string;
  locale: string;
  timezone: string;
  minimumCashBufferMinor: number;
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  defaultStrategy: PlannerStrategy;
  includeExpectedIncomeDefault: boolean;
  theme: Theme;
  privacyMode: boolean;
  setupCompleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CashSource = {
  id: string;
  name: string;
  type: CashSourceType;
  balanceMinor: number;
  currency: string;
  includeInPlanner: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PaymentObligation = {
  id: string;
  name: string;
  payee?: string;
  category: PaymentCategory;
  customCategoryLabel?: string;
  structure: PaymentStructure;
  currency: string;

  originalAmountMinor?: number;
  currentBalanceMinor?: number;
  statedInstallmentMinor?: number;
  minimumPaymentMinor?: number;

  annualInterestRate?: string;
  dailyFeeRate?: string;
  upfrontFeeMinor?: number;

  startDate?: string;
  endDate?: string;
  firstDueDate?: string;
  recurrence?: RecurrenceRule;
  installmentCount?: number;

  gracePeriodDays: number;
  essential: boolean;
  priority: 1 | 2 | 3 | 4 | 5;
  status: PaymentStatus;

  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentOccurrence = {
  id: string;
  paymentId: string;
  sequenceNumber: number;
  dueDate: string;
  graceDate?: string;

  dueAmountMinor: number;
  minimumAmountMinor?: number;
  principalAmountMinor?: number;
  interestAmountMinor?: number;
  feeAmountMinor: number;

  paidAmountMinor: number;
  paidDate?: string;

  status: PaymentOccurrenceStatus;

  amountIsEstimate: boolean;
  manuallyOverridden: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type IncomeSource = {
  id: string;
  name: string;
  type: IncomeType;
  currency: string;
  recurrence?: RecurrenceRule;
  expectedAmountMinor?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type IncomeEvent = {
  id: string;
  incomeSourceId?: string;
  cashSourceId?: string;
  expectedDate: string;
  receivedDate?: string;
  expectedAmountMinor: number;
  receivedAmountMinor?: number;
  status: IncomeEventStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type AllowanceBudget = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  totalBudgetMinor: number;
  dailyTargetMinor?: number;
  weekdayTargetMinor?: number;
  weekendTargetMinor?: number;
  spentAmountMinor: number;
  status: AllowanceBudgetStatus;
  createdAt: string;
  updatedAt: string;
};

export type PlannerSummary = {
  health: PlanHealth;
  reason: string;
  totalPlannedMinor: number;
  fullyFundedCount: number;
  underfundedCount: number;
  shortfallCount: number;
  earliestShortfallDate?: string;
  lowestCashBalanceMinor: number;
  remainingCashMinor: number;
  estimatedCostMinor?: number;
};

export type PlanScenario = {
  id: string;
  name: string;
  strategy: PlannerStrategy;
  startDate: string;
  endDate: string;
  openingCashMinor: number;
  cashBufferMinor: number;
  reservedAllowanceMinor: number;
  includeExpectedIncome: boolean;
  settings: Record<string, unknown>;
  summary?: PlannerSummary;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PlanAllocation = {
  id: string;
  scenarioId: string;
  occurrenceId: string;
  plannedDate: string;
  plannedAmountMinor: number;
  allocationType: AllocationType;
  reason: string;
  manuallyLocked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ManualCashAdjustment = {
  id: string;
  date: string;
  amountMinor: number;
  direction: 'inflow' | 'outflow';
  label: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

// ─── Backup ───────────────────────────────────────────────────────────────────

export type PayPlanBackup = {
  format: 'payplan-backup';
  version: 1;
  exportedAt: string;
  appVersion: string;
  data: {
    appSettings: AppSettings[];
    cashSources: CashSource[];
    payments: PaymentObligation[];
    paymentOccurrences: PaymentOccurrence[];
    incomeSources: IncomeSource[];
    incomeEvents: IncomeEvent[];
    allowanceBudgets: AllowanceBudget[];
    planScenarios: PlanScenario[];
    planAllocations: PlanAllocation[];
    manualCashAdjustments: ManualCashAdjustment[];
  };
};

// ─── Planner ──────────────────────────────────────────────────────────────────

export type AllowanceReservation = {
  budgetId: string;
  startDate: string;
  endDate: string;
  dailyAmountMinor: number;
};

export type PlannerIncomeEvent = {
  id: string;
  expectedDate: string;
  amountMinor: number;
  status: IncomeEventStatus;
};

export type PlannerPaymentOccurrence = {
  id: string;
  paymentId: string;
  paymentName?: string;
  dueDate: string;
  graceDate?: string;
  dueAmountMinor: number;
  minimumAmountMinor?: number;
  paidAmountMinor: number;
  feeAmountMinor: number;
  status: PaymentOccurrenceStatus;
  essential: boolean;
  priority: 1 | 2 | 3 | 4 | 5;
  annualInterestRate?: string;
  currentBalanceMinor?: number;
  amountIsEstimate: boolean;
  manuallyOverridden: boolean;
};

export type ManualAllocationLock = {
  occurrenceId: string;
  plannedDate: string;
  plannedAmountMinor: number;
};

export type PlannerInput = {
  periodStart: string;
  periodEnd: string;
  openingCashMinor: number;
  minimumCashBufferMinor: number;
  allowanceReservations: AllowanceReservation[];
  incomeEvents: PlannerIncomeEvent[];
  occurrences: PlannerPaymentOccurrence[];
  manualAdjustments: ManualCashAdjustment[];
  strategy: PlannerStrategy;
  customPriority?: string[];
  includeExpectedIncome: boolean;
  manualLocks?: ManualAllocationLock[];
};

export type PlannedAllocation = {
  occurrenceId: string;
  plannedDate: string;
  plannedAmountMinor: number;
  allocationType: AllocationType;
  reason: string;
  manuallyLocked: boolean;
};

export type CashFlowPoint = {
  date: string;
  openingBalanceMinor: number;
  closingBalanceMinor: number;
  inflowsMinor: number;
  outflowsMinor: number;
  events: string[];
};

export type Shortfall = {
  occurrenceId: string;
  dueDate: string;
  shortfallAmountMinor: number;
  reason: string;
};

export type PlannerWarning = {
  code: string;
  message: string;
  occurrenceId?: string;
  date?: string;
};

export type PlannerResult = {
  allocations: PlannedAllocation[];
  timeline: CashFlowPoint[];
  shortfalls: Shortfall[];
  warnings: PlannerWarning[];
  summary: PlannerSummary;
  explanations: string[];
};

// ─── Savings ──────────────────────────────────────────────────────────────────

export type SavingsGoalStatus = 'active' | 'completed' | 'archived';

export type SavingsGoal = {
  id: string;
  name: string;
  targetAmountMinor: number;
  savedAmountMinor: number;
  targetDate?: string;
  currency: string;
  notes?: string;
  status: SavingsGoalStatus;
  createdAt: string;
  updatedAt: string;
};

export type SavingsDeposit = {
  id: string;
  goalId: string;
  amountMinor: number;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

// ─── Result type ──────────────────────────────────────────────────────────────

export type Result<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: {
        code: string;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };

export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

export function err<T>(
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>
): Result<T> {
  return { success: false, error: { code, message, fieldErrors } };
}
