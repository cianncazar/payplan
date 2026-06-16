'use client';

import { db } from '@/db/database';
import type { PaymentObligation, PaymentOccurrence, PaymentCategory, PaymentStatus } from '@/types';
import { AppError, NotFoundError, toStorageError } from '@/lib/errors';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export type CreatePaymentInput = Omit<PaymentObligation, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdatePaymentInput = Partial<Omit<PaymentObligation, 'id' | 'createdAt' | 'updatedAt'>>;
export type CreateOccurrenceForPayment = Omit<
  PaymentOccurrence,
  'id' | 'paymentId' | 'createdAt' | 'updatedAt'
>;

export async function createPayment(data: CreatePaymentInput): Promise<PaymentObligation> {
  try {
    const timestamp = now();
    const record: PaymentObligation = { ...data, id: generateId(), createdAt: timestamp, updatedAt: timestamp };
    await db.payments.add(record);
    return record;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}

export async function getPaymentById(id: string): Promise<PaymentObligation | undefined> {
  try {
    return await db.payments.get(id);
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function listPayments(filters?: {
  status?: PaymentStatus;
  category?: PaymentCategory;
}): Promise<PaymentObligation[]> {
  try {
    let records: PaymentObligation[];
    if (filters?.status) {
      records = await db.payments.where('status').equals(filters.status).toArray();
    } else {
      records = await db.payments.toArray();
    }
    if (filters?.category) {
      records = records.filter((r) => r.category === filters.category);
    }
    return records;
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function updatePayment(
  id: string,
  changes: UpdatePaymentInput
): Promise<PaymentObligation> {
  try {
    const existing = await db.payments.get(id);
    if (!existing) throw new NotFoundError('Payment', id);
    const updated: PaymentObligation = { ...existing, ...changes, updatedAt: now() };
    await db.payments.put(updated);
    return updated;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}

// Deletes the payment and all its occurrences atomically.
export async function deletePayment(id: string): Promise<void> {
  try {
    await db.transaction('rw', [db.payments, db.paymentOccurrences], async () => {
      await db.paymentOccurrences.where('paymentId').equals(id).delete();
      await db.payments.delete(id);
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}

/**
 * Update a payment and regenerate its future occurrences.
 * Preserves any occurrences with a paid, partially_paid, or overdue status
 * (historical records). Replaces all scheduled/cancelled occurrences.
 */
export async function updatePaymentAndOccurrences(
  id: string,
  changes: UpdatePaymentInput,
  newOccurrences: CreateOccurrenceForPayment[]
): Promise<{ payment: PaymentObligation; occurrences: PaymentOccurrence[] }> {
  try {
    return await db.transaction('rw', [db.payments, db.paymentOccurrences], async () => {
      const existing = await db.payments.get(id);
      if (!existing) throw new NotFoundError('Payment', id);
      const timestamp = now();

      const payment: PaymentObligation = { ...existing, ...changes, updatedAt: timestamp };
      await db.payments.put(payment);

      // Keep paid/overdue historical occurrences; delete replaceable ones.
      const preserved = ['paid', 'partially_paid', 'overdue', 'waived'] as const;
      const allExisting = await db.paymentOccurrences.where('paymentId').equals(id).toArray();
      const toDelete = allExisting.filter(
        (o) => !preserved.includes(o.status as (typeof preserved)[number])
      );
      if (toDelete.length > 0) {
        await db.paymentOccurrences.bulkDelete(toDelete.map((o) => o.id));
      }

      // Determine the next sequence number after preserved occurrences.
      const maxSeq = allExisting
        .filter((o) => preserved.includes(o.status as (typeof preserved)[number]))
        .reduce((m, o) => Math.max(m, o.sequenceNumber), -1);

      const occurrences: PaymentOccurrence[] = newOccurrences.map((occ, i) => ({
        ...occ,
        id: generateId(),
        paymentId: id,
        sequenceNumber: maxSeq + 1 + i,
        createdAt: timestamp,
        updatedAt: timestamp,
      }));

      if (occurrences.length > 0) {
        await db.paymentOccurrences.bulkAdd(occurrences);
      }

      return { payment, occurrences };
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}

// Creates a payment and its initial occurrences atomically.
export async function createPaymentWithOccurrences(input: {
  payment: CreatePaymentInput;
  occurrences: CreateOccurrenceForPayment[];
}): Promise<{ payment: PaymentObligation; occurrences: PaymentOccurrence[] }> {
  try {
    return await db.transaction('rw', [db.payments, db.paymentOccurrences], async () => {
      const paymentId = generateId();
      const timestamp = now();

      const payment: PaymentObligation = {
        ...input.payment,
        id: paymentId,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await db.payments.add(payment);

      const occurrences: PaymentOccurrence[] = input.occurrences.map((occ) => ({
        ...occ,
        id: generateId(),
        paymentId,
        createdAt: timestamp,
        updatedAt: timestamp,
      }));

      if (occurrences.length > 0) {
        await db.paymentOccurrences.bulkAdd(occurrences);
      }

      return { payment, occurrences };
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}
