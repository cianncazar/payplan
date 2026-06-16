'use client';

import { db } from '@/db/database';
import type { PlanAllocation, PlannedAllocation } from '@/types';
import { AppError, toStorageError } from '@/lib/errors';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export async function listAllocationsByScenario(
  scenarioId: string
): Promise<PlanAllocation[]> {
  try {
    return await db.planAllocations.where('scenarioId').equals(scenarioId).toArray();
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function deleteAllocationsByScenario(scenarioId: string): Promise<void> {
  try {
    await db.planAllocations.where('scenarioId').equals(scenarioId).delete();
  } catch (err) {
    throw toStorageError(err);
  }
}

/**
 * Replace all allocations for a scenario in a single transaction.
 * Called after running the planner to persist the computed plan.
 */
export async function saveScenarioAllocations(
  scenarioId: string,
  allocations: PlannedAllocation[]
): Promise<PlanAllocation[]> {
  try {
    const timestamp = now();
    const records: PlanAllocation[] = allocations.map((a) => ({
      id: generateId(),
      scenarioId,
      occurrenceId: a.occurrenceId,
      plannedDate: a.plannedDate,
      plannedAmountMinor: a.plannedAmountMinor,
      allocationType: a.allocationType,
      reason: a.reason,
      manuallyLocked: a.manuallyLocked,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    await db.transaction('rw', db.planAllocations, async () => {
      await db.planAllocations.where('scenarioId').equals(scenarioId).delete();
      await db.planAllocations.bulkAdd(records);
    });

    return records;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}

export async function updateAllocationLock(
  id: string,
  manuallyLocked: boolean,
  plannedAmountMinor?: number,
  plannedDate?: string
): Promise<PlanAllocation> {
  try {
    const existing = await db.planAllocations.get(id);
    if (!existing) throw new Error(`PlanAllocation not found: ${id}`);
    const updated: PlanAllocation = {
      ...existing,
      manuallyLocked,
      ...(plannedAmountMinor !== undefined && { plannedAmountMinor }),
      ...(plannedDate !== undefined && { plannedDate }),
      updatedAt: now(),
    };
    await db.planAllocations.put(updated);
    return updated;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}
