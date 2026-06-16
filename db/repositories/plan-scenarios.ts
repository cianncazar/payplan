'use client';

import { db } from '@/db/database';
import type { PlanScenario, PlannerStrategy, PlannerSummary } from '@/types';
import { AppError, NotFoundError, toStorageError } from '@/lib/errors';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export type CreateScenarioInput = Omit<PlanScenario, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateScenarioInput = Partial<
  Omit<PlanScenario, 'id' | 'createdAt' | 'updatedAt'>
>;

export async function createScenario(data: CreateScenarioInput): Promise<PlanScenario> {
  try {
    const timestamp = now();
    const record: PlanScenario = { ...data, id: generateId(), createdAt: timestamp, updatedAt: timestamp };
    await db.planScenarios.add(record);
    return record;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}

export async function getScenarioById(id: string): Promise<PlanScenario | undefined> {
  try {
    return await db.planScenarios.get(id);
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function getActiveScenario(): Promise<PlanScenario | undefined> {
  try {
    return await db.planScenarios.where('active').equals(1).first();
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function listScenarios(): Promise<PlanScenario[]> {
  try {
    return await db.planScenarios.orderBy('createdAt').reverse().toArray();
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function updateScenario(
  id: string,
  changes: UpdateScenarioInput
): Promise<PlanScenario> {
  try {
    const existing = await db.planScenarios.get(id);
    if (!existing) throw new NotFoundError('PlanScenario', id);
    const updated: PlanScenario = { ...existing, ...changes, updatedAt: now() };
    await db.planScenarios.put(updated);
    return updated;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}

/** Set a scenario as the active plan; deactivates any currently active scenario. */
export async function setActiveScenario(id: string): Promise<void> {
  try {
    await db.transaction('rw', db.planScenarios, async () => {
      const current = await db.planScenarios.where('active').equals(1).toArray();
      for (const s of current) {
        await db.planScenarios.put({ ...s, active: false, updatedAt: now() });
      }
      const target = await db.planScenarios.get(id);
      if (!target) throw new NotFoundError('PlanScenario', id);
      await db.planScenarios.put({ ...target, active: true, updatedAt: now() });
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw toStorageError(err);
  }
}

/** Attach a computed summary to a scenario (called after running the planner). */
export async function saveScenarioSummary(
  id: string,
  summary: PlannerSummary
): Promise<PlanScenario> {
  return updateScenario(id, { summary });
}

export async function deleteScenario(id: string): Promise<void> {
  try {
    await db.planScenarios.delete(id);
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function updateScenarioStrategy(
  id: string,
  strategy: PlannerStrategy
): Promise<PlanScenario> {
  return updateScenario(id, { strategy });
}
