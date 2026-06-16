'use client';

import { db } from '@/db/database';
import { BackupFormatError, UnsupportedBackupVersionError, ValidationError } from '@/lib/errors';
import { PayPlanBackupSchema, type ValidatedBackup } from './schemas';

// ─── Preview ──────────────────────────────────────────────────────────────────

export type BackupPreview = {
  exportedAt: string;
  appVersion: string;
  counts: {
    appSettings: number;
    cashSources: number;
    payments: number;
    paymentOccurrences: number;
    incomeSources: number;
    incomeEvents: number;
    allowanceBudgets: number;
    planScenarios: number;
    planAllocations: number;
    manualCashAdjustments: number;
  };
};

export function getBackupPreview(backup: ValidatedBackup): BackupPreview {
  const d = backup.data;
  return {
    exportedAt: backup.exportedAt,
    appVersion: backup.appVersion,
    counts: {
      appSettings: d.appSettings.length,
      cashSources: d.cashSources.length,
      payments: d.payments.length,
      paymentOccurrences: d.paymentOccurrences.length,
      incomeSources: d.incomeSources.length,
      incomeEvents: d.incomeEvents.length,
      allowanceBudgets: d.allowanceBudgets.length,
      planScenarios: d.planScenarios.length,
      planAllocations: d.planAllocations.length,
      manualCashAdjustments: d.manualCashAdjustments.length,
    },
  };
}

// ─── Parse + validate ─────────────────────────────────────────────────────────

export async function parseBackupFile(file: File): Promise<ValidatedBackup> {
  const text = await file.text();

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupFormatError('File is not valid JSON.');
  }

  if (typeof raw !== 'object' || raw === null) {
    throw new BackupFormatError('Backup file must be a JSON object.');
  }

  const obj = raw as Record<string, unknown>;

  if (obj.format !== 'payplan-backup') {
    throw new BackupFormatError(
      'This file is not a PayPlan backup (missing or wrong "format" field).'
    );
  }

  if (obj.version !== 1) {
    throw new UnsupportedBackupVersionError(obj.version);
  }

  const result = PayPlanBackupSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues;
    const first = issues[0];
    const path = first?.path.join('.');
    throw new ValidationError(
      `Backup validation failed: ${path ? `${path}: ` : ''}${first?.message ?? 'Invalid data'}`,
      Object.fromEntries(
        issues.map((e) => [e.path.join('.'), [e.message]])
      )
    );
  }

  return result.data;
}

// ─── Import modes ─────────────────────────────────────────────────────────────

/** Clear all tables, then insert every record from the backup atomically. */
export async function importBackupReplace(backup: ValidatedBackup): Promise<void> {
  const d = backup.data;
  await db.transaction(
    'rw',
    [
      db.appSettings,
      db.cashSources,
      db.payments,
      db.paymentOccurrences,
      db.incomeSources,
      db.incomeEvents,
      db.allowanceBudgets,
      db.planScenarios,
      db.planAllocations,
      db.manualCashAdjustments,
    ],
    async () => {
      await Promise.all([
        db.appSettings.clear(),
        db.cashSources.clear(),
        db.payments.clear(),
        db.paymentOccurrences.clear(),
        db.incomeSources.clear(),
        db.incomeEvents.clear(),
        db.allowanceBudgets.clear(),
        db.planScenarios.clear(),
        db.planAllocations.clear(),
        db.manualCashAdjustments.clear(),
      ]);

      await Promise.all([
        db.appSettings.bulkAdd(d.appSettings),
        db.cashSources.bulkAdd(d.cashSources),
        db.payments.bulkAdd(d.payments),
        db.paymentOccurrences.bulkAdd(d.paymentOccurrences),
        db.incomeSources.bulkAdd(d.incomeSources),
        db.incomeEvents.bulkAdd(d.incomeEvents),
        db.allowanceBudgets.bulkAdd(d.allowanceBudgets),
        db.planScenarios.bulkAdd(d.planScenarios),
        db.planAllocations.bulkAdd(d.planAllocations),
        db.manualCashAdjustments.bulkAdd(d.manualCashAdjustments),
      ]);
    }
  );
}

export type MergeResult = {
  inserted: number;
  skipped: number;
};

/**
 * Insert records that do not already exist by ID. Existing records are kept.
 * For each table, query existing IDs first, then bulkAdd only the new ones.
 */
export async function importBackupMerge(backup: ValidatedBackup): Promise<MergeResult> {
  const d = backup.data;
  let inserted = 0;
  let skipped = 0;

  await db.transaction(
    'rw',
    [
      db.appSettings,
      db.cashSources,
      db.payments,
      db.paymentOccurrences,
      db.incomeSources,
      db.incomeEvents,
      db.allowanceBudgets,
      db.planScenarios,
      db.planAllocations,
      db.manualCashAdjustments,
    ],
    async () => {
      async function existingIds(table: { where(col: string): { anyOf(ids: string[]): { primaryKeys(): Promise<string[]> } } }, ids: string[]): Promise<Set<string>> {
        if (ids.length === 0) return new Set();
        const found = await table.where('id').anyOf(ids).primaryKeys();
        return new Set(found);
      }

      function split<T extends { id: string }>(records: T[], existing: Set<string>): [T[], number] {
        const toAdd = records.filter((r) => !existing.has(r.id));
        return [toAdd, records.length - toAdd.length];
      }

      const [newSettings, skipSettings] = split(d.appSettings, await existingIds(db.appSettings, d.appSettings.map(r => r.id)));
      const [newCash, skipCash] = split(d.cashSources, await existingIds(db.cashSources, d.cashSources.map(r => r.id)));
      const [newPayments, skipPayments] = split(d.payments, await existingIds(db.payments, d.payments.map(r => r.id)));
      const [newOccs, skipOccs] = split(d.paymentOccurrences, await existingIds(db.paymentOccurrences, d.paymentOccurrences.map(r => r.id)));
      const [newISources, skipISources] = split(d.incomeSources, await existingIds(db.incomeSources, d.incomeSources.map(r => r.id)));
      const [newIEvents, skipIEvents] = split(d.incomeEvents, await existingIds(db.incomeEvents, d.incomeEvents.map(r => r.id)));
      const [newAllowance, skipAllowance] = split(d.allowanceBudgets, await existingIds(db.allowanceBudgets, d.allowanceBudgets.map(r => r.id)));
      const [newScenarios, skipScenarios] = split(d.planScenarios, await existingIds(db.planScenarios, d.planScenarios.map(r => r.id)));
      const [newAllocations, skipAllocations] = split(d.planAllocations, await existingIds(db.planAllocations, d.planAllocations.map(r => r.id)));
      const [newAdjs, skipAdjs] = split(d.manualCashAdjustments, await existingIds(db.manualCashAdjustments, d.manualCashAdjustments.map(r => r.id)));

      await Promise.all([
        newSettings.length > 0 ? db.appSettings.bulkAdd(newSettings) : Promise.resolve(),
        newCash.length > 0 ? db.cashSources.bulkAdd(newCash) : Promise.resolve(),
        newPayments.length > 0 ? db.payments.bulkAdd(newPayments) : Promise.resolve(),
        newOccs.length > 0 ? db.paymentOccurrences.bulkAdd(newOccs) : Promise.resolve(),
        newISources.length > 0 ? db.incomeSources.bulkAdd(newISources) : Promise.resolve(),
        newIEvents.length > 0 ? db.incomeEvents.bulkAdd(newIEvents) : Promise.resolve(),
        newAllowance.length > 0 ? db.allowanceBudgets.bulkAdd(newAllowance) : Promise.resolve(),
        newScenarios.length > 0 ? db.planScenarios.bulkAdd(newScenarios) : Promise.resolve(),
        newAllocations.length > 0 ? db.planAllocations.bulkAdd(newAllocations) : Promise.resolve(),
        newAdjs.length > 0 ? db.manualCashAdjustments.bulkAdd(newAdjs) : Promise.resolve(),
      ]);

      const totalSkipped = skipSettings + skipCash + skipPayments + skipOccs + skipISources + skipIEvents + skipAllowance + skipScenarios + skipAllocations + skipAdjs;
      const totalInserted = newSettings.length + newCash.length + newPayments.length + newOccs.length + newISources.length + newIEvents.length + newAllowance.length + newScenarios.length + newAllocations.length + newAdjs.length;
      inserted = totalInserted;
      skipped = totalSkipped;
    }
  );

  return { inserted, skipped };
}

// ─── Reset ────────────────────────────────────────────────────────────────────

export async function resetAllData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.appSettings,
      db.cashSources,
      db.payments,
      db.paymentOccurrences,
      db.incomeSources,
      db.incomeEvents,
      db.allowanceBudgets,
      db.planScenarios,
      db.planAllocations,
      db.manualCashAdjustments,
    ],
    async () => {
      await Promise.all([
        db.appSettings.clear(),
        db.cashSources.clear(),
        db.payments.clear(),
        db.paymentOccurrences.clear(),
        db.incomeSources.clear(),
        db.incomeEvents.clear(),
        db.allowanceBudgets.clear(),
        db.planScenarios.clear(),
        db.planAllocations.clear(),
        db.manualCashAdjustments.clear(),
      ]);
    }
  );
}
