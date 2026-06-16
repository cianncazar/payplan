'use client';

import { db } from '@/db/database';
import type { IncomeEvent, IncomeEventStatus } from '@/types';
import { AppError, NotFoundError, toStorageError } from '@/lib/errors';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export type CreateIncomeEventInput = Omit<IncomeEvent, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateIncomeEventInput = Partial<
  Omit<IncomeEvent, 'id' | 'createdAt' | 'updatedAt'>
>;

export async function createIncomeEvent(
  data: CreateIncomeEventInput
): Promise<IncomeEvent> {
  try {
    const timestamp = now();
    const record: IncomeEvent = { ...data, id: generateId(), createdAt: timestamp, updatedAt: timestamp };
    await db.incomeEvents.add(record);
    return record;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}

export async function getIncomeEventById(id: string): Promise<IncomeEvent | undefined> {
  try {
    return await db.incomeEvents.get(id);
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function listIncomeEvents(filters?: {
  status?: IncomeEventStatus;
}): Promise<IncomeEvent[]> {
  try {
    if (filters?.status) {
      return await db.incomeEvents.where('status').equals(filters.status).toArray();
    }
    return await db.incomeEvents.toArray();
  } catch (err) {
    throw toStorageError(err);
  }
}

// ISO date string lexicographic comparison is valid for YYYY-MM-DD.
export async function listIncomeEventsByDateRange(
  startDate: string,
  endDate: string
): Promise<IncomeEvent[]> {
  try {
    return await db.incomeEvents
      .where('expectedDate')
      .between(startDate, endDate, true, true)
      .toArray();
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function updateIncomeEvent(
  id: string,
  changes: UpdateIncomeEventInput
): Promise<IncomeEvent> {
  try {
    const existing = await db.incomeEvents.get(id);
    if (!existing) throw new NotFoundError('IncomeEvent', id);
    const updated: IncomeEvent = { ...existing, ...changes, updatedAt: now() };
    await db.incomeEvents.put(updated);
    return updated;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}

export async function deleteIncomeEvent(id: string): Promise<void> {
  try {
    await db.incomeEvents.delete(id);
  } catch (err) {
    throw toStorageError(err);
  }
}
