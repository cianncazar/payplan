'use client';

import { db } from '@/db/database';
import type { IncomeSource } from '@/types';
import { AppError, NotFoundError, toStorageError } from '@/lib/errors';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export type CreateIncomeSourceInput = Omit<IncomeSource, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateIncomeSourceInput = Partial<
  Omit<IncomeSource, 'id' | 'createdAt' | 'updatedAt'>
>;

export async function createIncomeSource(
  data: CreateIncomeSourceInput
): Promise<IncomeSource> {
  try {
    const timestamp = now();
    const record: IncomeSource = { ...data, id: generateId(), createdAt: timestamp, updatedAt: timestamp };
    await db.incomeSources.add(record);
    return record;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}

export async function getIncomeSourceById(id: string): Promise<IncomeSource | undefined> {
  try {
    return await db.incomeSources.get(id);
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function listIncomeSources(filters?: {
  active?: boolean;
}): Promise<IncomeSource[]> {
  try {
    const records = await db.incomeSources.toArray();
    if (filters?.active !== undefined) {
      return records.filter((r) => r.active === filters.active);
    }
    return records;
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function updateIncomeSource(
  id: string,
  changes: UpdateIncomeSourceInput
): Promise<IncomeSource> {
  try {
    const existing = await db.incomeSources.get(id);
    if (!existing) throw new NotFoundError('IncomeSource', id);
    const updated: IncomeSource = { ...existing, ...changes, updatedAt: now() };
    await db.incomeSources.put(updated);
    return updated;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}

export async function deleteIncomeSource(id: string): Promise<void> {
  try {
    await db.incomeSources.delete(id);
  } catch (err) {
    throw toStorageError(err);
  }
}
