'use client';

import { db } from '@/db/database';
import type { CashSource } from '@/types';
import { AppError, NotFoundError, toStorageError } from '@/lib/errors';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export type CreateCashSourceInput = Omit<CashSource, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateCashSourceInput = Partial<Omit<CashSource, 'id' | 'createdAt' | 'updatedAt'>>;

export async function createCashSource(data: CreateCashSourceInput): Promise<CashSource> {
  try {
    const timestamp = now();
    const record: CashSource = { ...data, id: generateId(), createdAt: timestamp, updatedAt: timestamp };
    await db.cashSources.add(record);
    return record;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}

export async function getCashSourceById(id: string): Promise<CashSource | undefined> {
  try {
    return await db.cashSources.get(id);
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function listCashSources(filters?: {
  archived?: boolean;
  includeInPlanner?: boolean;
}): Promise<CashSource[]> {
  try {
    let records = await db.cashSources.toArray();
    if (filters?.archived !== undefined) {
      records = records.filter((r) => r.archived === filters.archived);
    }
    if (filters?.includeInPlanner !== undefined) {
      records = records.filter((r) => r.includeInPlanner === filters.includeInPlanner);
    }
    return records;
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function updateCashSource(
  id: string,
  changes: UpdateCashSourceInput
): Promise<CashSource> {
  try {
    const existing = await db.cashSources.get(id);
    if (!existing) throw new NotFoundError('CashSource', id);
    const updated: CashSource = { ...existing, ...changes, updatedAt: now() };
    await db.cashSources.put(updated);
    return updated;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}

export async function deleteCashSource(id: string): Promise<void> {
  try {
    await db.cashSources.delete(id);
  } catch (err) {
    throw toStorageError(err);
  }
}
