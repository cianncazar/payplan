'use client';

import { db } from '@/db/database';
import type { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/lib/constants';
import { toStorageError } from '@/lib/errors';

function now(): string {
  return new Date().toISOString();
}

export async function getSettings(): Promise<AppSettings | undefined> {
  try {
    return await db.appSettings.get('local-settings');
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function getOrCreateSettings(): Promise<AppSettings> {
  try {
    const existing = await db.appSettings.get('local-settings');
    if (existing) return existing;

    const timestamp = now();
    const settings: AppSettings = {
      ...DEFAULT_SETTINGS,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.appSettings.put(settings);
    return settings;
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function updateSettings(
  partial: Partial<Omit<AppSettings, 'id' | 'createdAt'>>
): Promise<AppSettings> {
  try {
    const current = await getOrCreateSettings();
    const updated: AppSettings = { ...current, ...partial, updatedAt: now() };
    await db.appSettings.put(updated);
    return updated;
  } catch (err) {
    throw toStorageError(err);
  }
}
