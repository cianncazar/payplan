'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import { db } from '@/db/database';
import { getOrCreateSettings, updateSettings } from '@/db/repositories/settings';
import {
  CURRENCY_OPTIONS,
  LOCALE_OPTIONS,
  PLANNER_STRATEGIES,
  PLANNER_STRATEGY_LABELS,
} from '@/lib/constants';
import type { PlannerStrategy } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

async function save(partial: Parameters<typeof updateSettings>[0]) {
  await getOrCreateSettings();
  await updateSettings(partial);
}

export function PreferencesForm() {
  const settings = useLiveQuery(() => db.appSettings.get('local-settings'), []);

  const currency = settings?.defaultCurrency ?? 'PHP';
  const locale = settings?.locale ?? 'en-PH';
  const strategy = (settings?.defaultStrategy ?? 'deadline_first') as PlannerStrategy;
  const includeExpected = settings?.includeExpectedIncomeDefault ?? false;

  async function handleCurrency(value: string | null) {
    if (!value) return;
    try {
      await save({ defaultCurrency: value });
      toast.success('Currency updated.');
    } catch {
      toast.error('Failed to save currency.');
    }
  }

  async function handleLocale(value: string | null) {
    if (!value) return;
    try {
      await save({ locale: value });
      toast.success('Locale updated.');
    } catch {
      toast.error('Failed to save locale.');
    }
  }

  async function handleStrategy(value: string | null) {
    if (!value) return;
    try {
      await save({ defaultStrategy: value as PlannerStrategy });
      toast.success('Default strategy updated.');
    } catch {
      toast.error('Failed to save strategy.');
    }
  }

  async function handleIncludeExpected(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      await save({ includeExpectedIncomeDefault: e.target.checked });
      toast.success('Planner default updated.');
    } catch {
      toast.error('Failed to save preference.');
    }
  }

  return (
    <div className="space-y-4">
      {/* Display section */}
      <div className="rounded-lg border border-border divide-y divide-border">
        <div className="px-4 py-3">
          <p className="text-sm font-semibold">Display</p>
        </div>

        {/* Currency */}
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Currency</p>
            <p className="text-xs text-muted-foreground">Symbol shown on all money amounts</p>
          </div>
          <Select value={currency} onValueChange={handleCurrency}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Locale */}
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Number format</p>
            <p className="text-xs text-muted-foreground">Determines how numbers and dates are displayed</p>
          </div>
          <Select value={locale} onValueChange={handleLocale}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCALE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Planner defaults section */}
      <div className="rounded-lg border border-border divide-y divide-border">
        <div className="px-4 py-3">
          <p className="text-sm font-semibold">Planner defaults</p>
        </div>

        {/* Default strategy */}
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Default strategy</p>
            <p className="text-xs text-muted-foreground">Pre-selected when you open the Planner</p>
          </div>
          <Select value={strategy} onValueChange={handleStrategy}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLANNER_STRATEGIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {PLANNER_STRATEGY_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Include expected income */}
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Include expected income</p>
            <p className="text-xs text-muted-foreground">
              Count expected (unconfirmed) income in plans by default
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeExpected}
              onChange={handleIncludeExpected}
              className="h-4 w-4 rounded border-border accent-primary"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
