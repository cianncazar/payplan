'use client';

import { db } from '@/db/database';
import type { AllowanceBudget, AllowanceBudgetStatus } from '@/types';
import { AppError, NotFoundError, toStorageError } from '@/lib/errors';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export type CreateAllowanceBudgetInput = Omit<
  AllowanceBudget,
  'id' | 'createdAt' | 'updatedAt'
>;
export type UpdateAllowanceBudgetInput = Partial<
  Omit<AllowanceBudget, 'id' | 'createdAt' | 'updatedAt'>
>;

export async function createAllowanceBudget(
  data: CreateAllowanceBudgetInput
): Promise<AllowanceBudget> {
  try {
    const timestamp = now();
    const record: AllowanceBudget = { ...data, id: generateId(), createdAt: timestamp, updatedAt: timestamp };
    await db.allowanceBudgets.add(record);
    return record;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}

export async function getAllowanceBudgetById(
  id: string
): Promise<AllowanceBudget | undefined> {
  try {
    return await db.allowanceBudgets.get(id);
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function listAllowanceBudgets(filters?: {
  status?: AllowanceBudgetStatus;
}): Promise<AllowanceBudget[]> {
  try {
    if (filters?.status) {
      return await db.allowanceBudgets.where('status').equals(filters.status).toArray();
    }
    return await db.allowanceBudgets.toArray();
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function updateAllowanceBudget(
  id: string,
  changes: UpdateAllowanceBudgetInput
): Promise<AllowanceBudget> {
  try {
    const existing = await db.allowanceBudgets.get(id);
    if (!existing) throw new NotFoundError('AllowanceBudget', id);
    const updated: AllowanceBudget = { ...existing, ...changes, updatedAt: now() };
    await db.allowanceBudgets.put(updated);
    return updated;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}

export async function deleteAllowanceBudget(id: string): Promise<void> {
  try {
    await db.allowanceBudgets.delete(id);
  } catch (err) {
    throw toStorageError(err);
  }
}
