'use client';

import { db } from '@/db/database';
import type { PaymentOccurrence, PaymentOccurrenceStatus } from '@/types';
import { AppError, NotFoundError, toStorageError } from '@/lib/errors';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export type CreateOccurrenceInput = Omit<PaymentOccurrence, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateOccurrenceInput = Partial<
  Omit<PaymentOccurrence, 'id' | 'paymentId' | 'sequenceNumber' | 'createdAt' | 'updatedAt'>
>;

export async function createOccurrence(
  data: CreateOccurrenceInput
): Promise<PaymentOccurrence> {
  try {
    const timestamp = now();
    const record: PaymentOccurrence = { ...data, id: generateId(), createdAt: timestamp, updatedAt: timestamp };
    await db.paymentOccurrences.add(record);
    return record;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}

export async function getOccurrenceById(id: string): Promise<PaymentOccurrence | undefined> {
  try {
    return await db.paymentOccurrences.get(id);
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function listOccurrencesByPayment(
  paymentId: string
): Promise<PaymentOccurrence[]> {
  try {
    return await db.paymentOccurrences
      .where('paymentId')
      .equals(paymentId)
      .sortBy('sequenceNumber');
  } catch (err) {
    throw toStorageError(err);
  }
}

// ISO date string comparison is lexicographic — correct for YYYY-MM-DD.
export async function listOccurrencesDueBetween(
  startDate: string,
  endDate: string
): Promise<PaymentOccurrence[]> {
  try {
    return await db.paymentOccurrences
      .where('dueDate')
      .between(startDate, endDate, true, true)
      .toArray();
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function listOccurrencesByStatus(
  status: PaymentOccurrenceStatus
): Promise<PaymentOccurrence[]> {
  try {
    return await db.paymentOccurrences.where('status').equals(status).toArray();
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function updateOccurrence(
  id: string,
  changes: UpdateOccurrenceInput
): Promise<PaymentOccurrence> {
  try {
    const existing = await db.paymentOccurrences.get(id);
    if (!existing) throw new NotFoundError('PaymentOccurrence', id);
    const updated: PaymentOccurrence = { ...existing, ...changes, updatedAt: now() };
    await db.paymentOccurrences.put(updated);
    return updated;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}

export async function deleteOccurrence(id: string): Promise<void> {
  try {
    await db.paymentOccurrences.delete(id);
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function deleteOccurrencesByPayment(paymentId: string): Promise<void> {
  try {
    await db.paymentOccurrences.where('paymentId').equals(paymentId).delete();
  } catch (err) {
    throw toStorageError(err);
  }
}
