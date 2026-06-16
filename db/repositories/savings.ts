'use client';

import { db } from '@/db/database';
import type { SavingsGoal, SavingsDeposit } from '@/types';
import { AppError, NotFoundError, toStorageError } from '@/lib/errors';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

// ─── Savings Goals ────────────────────────────────────────────────────────────

export type CreateSavingsGoalInput = Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateSavingsGoalInput = Partial<Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>>;

export async function createSavingsGoal(data: CreateSavingsGoalInput): Promise<SavingsGoal> {
  try {
    const timestamp = now();
    const record: SavingsGoal = { ...data, id: generateId(), createdAt: timestamp, updatedAt: timestamp };
    await db.savingsGoals.add(record);
    return record;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}

export async function getSavingsGoalById(id: string): Promise<SavingsGoal | undefined> {
  try {
    return await db.savingsGoals.get(id);
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function listSavingsGoals(filters?: {
  status?: SavingsGoal['status'];
}): Promise<SavingsGoal[]> {
  try {
    let records = await db.savingsGoals.toArray();
    if (filters?.status !== undefined) {
      records = records.filter((r) => r.status === filters.status);
    }
    return records.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function updateSavingsGoal(
  id: string,
  changes: UpdateSavingsGoalInput
): Promise<SavingsGoal> {
  try {
    const existing = await db.savingsGoals.get(id);
    if (!existing) throw new NotFoundError('SavingsGoal', id);
    const updated: SavingsGoal = { ...existing, ...changes, updatedAt: now() };
    await db.savingsGoals.put(updated);
    return updated;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}

export async function deleteSavingsGoal(id: string): Promise<void> {
  try {
    await db.transaction('rw', db.savingsGoals, db.savingsDeposits, async () => {
      await db.savingsDeposits.where('goalId').equals(id).delete();
      await db.savingsGoals.delete(id);
    });
  } catch (err) {
    throw toStorageError(err);
  }
}

// ─── Savings Deposits ─────────────────────────────────────────────────────────

export type CreateSavingsDepositInput = Omit<SavingsDeposit, 'id' | 'createdAt' | 'updatedAt'>;

export async function addSavingsDeposit(data: CreateSavingsDepositInput): Promise<SavingsDeposit> {
  try {
    const deposit = await db.transaction('rw', db.savingsGoals, db.savingsDeposits, async () => {
      const goal = await db.savingsGoals.get(data.goalId);
      if (!goal) throw new NotFoundError('SavingsGoal', data.goalId);

      const timestamp = now();
      const record: SavingsDeposit = { ...data, id: generateId(), createdAt: timestamp, updatedAt: timestamp };
      await db.savingsDeposits.add(record);

      // Keep savedAmountMinor in sync with deposits
      const newSaved = goal.savedAmountMinor + data.amountMinor;
      const newStatus: SavingsGoal['status'] =
        goal.status === 'active' && newSaved >= goal.targetAmountMinor ? 'completed' : goal.status;
      await db.savingsGoals.put({ ...goal, savedAmountMinor: newSaved, status: newStatus, updatedAt: timestamp });

      return record;
    });
    return deposit;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}

export async function listSavingsDeposits(goalId: string): Promise<SavingsDeposit[]> {
  try {
    return await db.savingsDeposits.where('goalId').equals(goalId).sortBy('date');
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function deleteSavingsDeposit(id: string): Promise<void> {
  try {
    await db.transaction('rw', db.savingsGoals, db.savingsDeposits, async () => {
      const deposit = await db.savingsDeposits.get(id);
      if (!deposit) return;

      const goal = await db.savingsGoals.get(deposit.goalId);
      await db.savingsDeposits.delete(id);

      if (goal) {
        const newSaved = Math.max(0, goal.savedAmountMinor - deposit.amountMinor);
        const newStatus: SavingsGoal['status'] =
          goal.status === 'completed' && newSaved < goal.targetAmountMinor ? 'active' : goal.status;
        await db.savingsGoals.put({ ...goal, savedAmountMinor: newSaved, status: newStatus, updatedAt: now() });
      }
    });
  } catch (err) {
    throw toStorageError(err);
  }
}
