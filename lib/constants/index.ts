import type {
  PaymentCategory,
  PaymentStructure,
  PlannerStrategy,
  IncomeType,
  CashSourceType,
  AppSettings,
} from '@/types';

export const PAYMENT_CATEGORIES: PaymentCategory[] = [
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
];

export const PAYMENT_CATEGORY_LABELS: Record<PaymentCategory, string> = {
  rent: 'Rent',
  utility: 'Utility',
  loan: 'Loan',
  credit_card: 'Credit Card',
  bnpl: 'Buy Now Pay Later',
  subscription: 'Subscription',
  insurance: 'Insurance',
  tuition: 'Tuition',
  tax: 'Tax',
  medical: 'Medical',
  family_obligation: 'Family Obligation',
  savings_commitment: 'Savings Commitment',
  one_time_bill: 'One-time Bill',
  other: 'Other',
};

export const PAYMENT_STRUCTURES: PaymentStructure[] = [
  'one_time',
  'fixed_recurring',
  'variable_recurring',
  'fixed_installment',
  'amortizing_loan',
  'revolving_credit',
  'no_interest_borrowing',
  'custom_schedule',
];

export const PAYMENT_STRUCTURE_LABELS: Record<PaymentStructure, string> = {
  one_time: 'One-time',
  fixed_recurring: 'Fixed Recurring',
  variable_recurring: 'Variable Recurring',
  fixed_installment: 'Fixed Installment',
  amortizing_loan: 'Amortizing Loan',
  revolving_credit: 'Revolving Credit',
  no_interest_borrowing: 'No-interest Borrowing',
  custom_schedule: 'Custom Schedule',
};

export const PLANNER_STRATEGIES: PlannerStrategy[] = [
  'deadline_first',
  'essential_first',
  'minimums_first',
  'smallest_balance_first',
  'highest_interest_first',
  'lowest_cash_flow_risk',
  'custom',
];

export const PLANNER_STRATEGY_LABELS: Record<PlannerStrategy, string> = {
  deadline_first: 'Deadline First',
  essential_first: 'Essential First',
  minimums_first: 'Minimums First',
  smallest_balance_first: 'Smallest Balance First',
  highest_interest_first: 'Highest Interest First',
  lowest_cash_flow_risk: 'Lowest Cash-flow Risk',
  custom: 'Custom Order',
};

export const INCOME_TYPES: IncomeType[] = [
  'salary',
  'business',
  'allowance',
  'remittance',
  'freelance',
  'bonus',
  'refund',
  'other',
];

export const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  salary: 'Salary',
  business: 'Business Income',
  allowance: 'Allowance',
  remittance: 'Remittance',
  freelance: 'Freelance',
  bonus: 'Bonus',
  refund: 'Refund',
  other: 'Other',
};

export const CASH_SOURCE_TYPES: CashSourceType[] = ['cash', 'bank', 'ewallet', 'other'];

export const CASH_SOURCE_TYPE_LABELS: Record<CashSourceType, string> = {
  cash: 'Cash',
  bank: 'Bank',
  ewallet: 'E-wallet',
  other: 'Other',
};

export const BACKUP_FORMAT = 'payplan-backup' as const;
export const BACKUP_VERSION = 1 as const;
export const APP_VERSION = '0.1.0';

export const DEFAULT_SETTINGS: Omit<AppSettings, 'createdAt' | 'updatedAt'> = {
  id: 'local-settings',
  defaultCurrency: 'PHP',
  locale: 'en-PH',
  timezone: 'Asia/Manila',
  minimumCashBufferMinor: 0,
  weekStartsOn: 0,
  defaultStrategy: 'deadline_first',
  theme: 'system',
  privacyMode: false,
  setupCompleted: false,
};

export const LOCAL_STORAGE_KEYS = {
  noticesDismissed: 'payplan-notice-dismissed',
  sidebarOpen: 'payplan-sidebar-open',
} as const;
