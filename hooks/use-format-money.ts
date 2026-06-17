'use client';

import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { formatMoney } from '@/lib/money';

/**
 * Returns a formatMoney function bound to the user's saved currency and locale.
 * Falls back to PHP / en-PH while settings are loading.
 */
export function useFormatMoney(): (minor: number) => string {
  const settings = useLiveQuery(() => db.appSettings.get('local-settings'), []);
  const currency = settings?.defaultCurrency ?? 'PHP';
  const locale = settings?.locale ?? 'en-PH';
  return useCallback((minor: number) => formatMoney(minor, currency, locale), [currency, locale]);
}
