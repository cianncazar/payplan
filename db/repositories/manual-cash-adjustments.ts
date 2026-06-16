'use client';

import { db } from '@/db/database';
import type { ManualCashAdjustment } from '@/types';
import { AppError, NotFoundError, toStorageError } from '@/lib/errors';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export type CreateManualCashAdjustmentInput = Omit<ManualCashAdjustment, 'id' | 'createdAt' | 'updatedAt'>;

export async function createManualCashAdjustment(
  data: CreateManualCashAdjustmentInput
): Promise<ManualCashAdjustment> {
  try {
    const timestamp = now();
    const record: ManualCashAdjustment = { ...data, id: generateId(), createdAt: timestamp, updatedAt: timestamp };
    await db.manualCashAdjustments.add(record);
    return record;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}

export async function listManualCashAdjustments(): Promise<ManualCashAdjustment[]> {
  try {
    return await db.manualCashAdjustments.orderBy('date').toArray();
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function deleteManualCashAdjustment(id: string): Promise<void> {
  try {
    const existing = await db.manualCashAdjustments.get(id);
    if (!existing) throw new NotFoundError('ManualCashAdjustment', id);
    await db.manualCashAdjustments.delete(id);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}
