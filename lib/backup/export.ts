'use client';

import Papa from 'papaparse';
import { db } from '@/db/database';
import { BACKUP_FORMAT, BACKUP_VERSION, APP_VERSION } from '@/lib/constants';
import { formatMoney } from '@/lib/money';
import type { PayPlanBackup, PaymentObligation, PaymentOccurrence, IncomeSource, IncomeEvent } from '@/types';

// ─── JSON backup ─────────────────────────────────────────────────────────────

export async function exportBackup(): Promise<PayPlanBackup> {
  const [
    appSettings,
    cashSources,
    payments,
    paymentOccurrences,
    incomeSources,
    incomeEvents,
    allowanceBudgets,
    planScenarios,
    planAllocations,
    manualCashAdjustments,
  ] = await Promise.all([
    db.appSettings.toArray(),
    db.cashSources.toArray(),
    db.payments.toArray(),
    db.paymentOccurrences.toArray(),
    db.incomeSources.toArray(),
    db.incomeEvents.toArray(),
    db.allowanceBudgets.toArray(),
    db.planScenarios.toArray(),
    db.planAllocations.toArray(),
    db.manualCashAdjustments.toArray(),
  ]);

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data: {
      appSettings,
      cashSources,
      payments,
      paymentOccurrences,
      incomeSources,
      incomeEvents,
      allowanceBudgets,
      planScenarios,
      planAllocations,
      manualCashAdjustments,
    },
  };
}

export function backupFilename(): string {
  return `payplan-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

// ─── File download helpers ────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJSON(data: unknown, filename: string): void {
  downloadBlob(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    filename
  );
}

function downloadCSV(rows: Record<string, unknown>[], filename: string): void {
  downloadBlob(
    new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }),
    filename
  );
}

// ─── CSV exports ─────────────────────────────────────────────────────────────

export function exportPaymentsCSV(
  payments: PaymentObligation[],
  occurrences: PaymentOccurrence[]
): void {
  const occByPayment = new Map<string, PaymentOccurrence[]>();
  for (const o of occurrences) {
    const list = occByPayment.get(o.paymentId) ?? [];
    list.push(o);
    occByPayment.set(o.paymentId, list);
  }

  const rows = payments.map((p) => {
    const occs = occByPayment.get(p.id) ?? [];
    const paidCount = occs.filter((o) => o.status === 'paid').length;
    const totalCount = occs.length;
    return {
      name: p.name,
      payee: p.payee ?? '',
      category: p.category,
      structure: p.structure,
      currency: p.currency,
      essential: p.essential ? 'yes' : 'no',
      priority: p.priority,
      status: p.status,
      original_amount: p.originalAmountMinor != null ? formatMoney(p.originalAmountMinor, p.currency) : '',
      current_balance: p.currentBalanceMinor != null ? formatMoney(p.currentBalanceMinor, p.currency) : '',
      minimum_payment: p.minimumPaymentMinor != null ? formatMoney(p.minimumPaymentMinor, p.currency) : '',
      installment_count: p.installmentCount ?? '',
      annual_interest_rate: p.annualInterestRate ?? '',
      first_due_date: p.firstDueDate ?? '',
      grace_period_days: p.gracePeriodDays,
      occurrences_total: totalCount,
      occurrences_paid: paidCount,
      notes: p.notes ?? '',
    };
  });

  downloadCSV(rows, `payplan-payments-${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportIncomeCSV(
  incomeSources: IncomeSource[],
  incomeEvents: IncomeEvent[]
): void {
  const sourceMap = new Map(incomeSources.map((s) => [s.id, s.name]));

  const rows = incomeEvents.map((e) => ({
    source_name: e.incomeSourceId ? (sourceMap.get(e.incomeSourceId) ?? '') : '',
    expected_date: e.expectedDate,
    received_date: e.receivedDate ?? '',
    expected_amount: formatMoney(e.expectedAmountMinor),
    received_amount: e.receivedAmountMinor != null ? formatMoney(e.receivedAmountMinor) : '',
    status: e.status,
    notes: e.notes ?? '',
  }));

  downloadCSV(rows, `payplan-income-${new Date().toISOString().slice(0, 10)}.csv`);
}
