'use client';

import Dexie, { type EntityTable } from 'dexie';
import type {
  AppSettings,
  CashSource,
  PaymentObligation,
  PaymentOccurrence,
  IncomeSource,
  IncomeEvent,
  AllowanceBudget,
  PlanScenario,
  PlanAllocation,
  ManualCashAdjustment,
  SavingsGoal,
  SavingsDeposit,
} from '@/types';

class PayPlanDatabase extends Dexie {
  appSettings!: EntityTable<AppSettings, 'id'>;
  cashSources!: EntityTable<CashSource, 'id'>;
  payments!: EntityTable<PaymentObligation, 'id'>;
  paymentOccurrences!: EntityTable<PaymentOccurrence, 'id'>;
  incomeSources!: EntityTable<IncomeSource, 'id'>;
  incomeEvents!: EntityTable<IncomeEvent, 'id'>;
  allowanceBudgets!: EntityTable<AllowanceBudget, 'id'>;
  planScenarios!: EntityTable<PlanScenario, 'id'>;
  planAllocations!: EntityTable<PlanAllocation, 'id'>;
  manualCashAdjustments!: EntityTable<ManualCashAdjustment, 'id'>;
  savingsGoals!: EntityTable<SavingsGoal, 'id'>;
  savingsDeposits!: EntityTable<SavingsDeposit, 'id'>;

  constructor() {
    super('PayPlanDB');

    // Version 1 — initial schema. Never remove or rename indexes in future versions;
    // add new versions that extend this schema to preserve existing local data.
    this.version(1).stores({
      appSettings: 'id',
      cashSources: 'id, type, archived',
      payments: 'id, category, status, priority, essential',
      paymentOccurrences: 'id, paymentId, dueDate, status, [paymentId+sequenceNumber]',
      incomeSources: 'id, type, active',
      incomeEvents: 'id, incomeSourceId, expectedDate, status',
      allowanceBudgets: 'id, startDate, endDate, status',
      planScenarios: 'id, active, startDate, endDate',
      planAllocations: 'id, scenarioId, occurrenceId, plannedDate',
      manualCashAdjustments: 'id, date, direction',
    });

    // Version 2 — add createdAt index to planScenarios for orderBy sorting.
    this.version(2).stores({
      planScenarios: 'id, active, startDate, endDate, createdAt',
    });

    // Version 3 — add savings goals and deposits tables.
    this.version(3).stores({
      savingsGoals: 'id, status, targetDate',
      savingsDeposits: 'id, goalId, date',
    });
  }
}

export const db = new PayPlanDatabase();
