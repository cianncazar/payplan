'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Banknote, CreditCard, CalendarCheck, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/db/database';
import { Button } from '@/components/ui/button';
import { LOCAL_STORAGE_KEYS } from '@/lib/constants';
import { isDatabaseEmpty, seedSampleData } from '@/lib/sample-data/seed';

const STEPS = [
  {
    icon: Banknote,
    label: 'Add your cash',
    description: 'Bank, GCash, wallet',
    href: '/cash-sources',
  },
  {
    icon: CreditCard,
    label: 'Add your bills',
    description: 'Rent, loans, subscriptions',
    href: '/payments',
  },
  {
    icon: CalendarCheck,
    label: 'Run the Planner',
    description: 'See your coverage',
    href: '/planner',
  },
] as const;

// useSyncExternalStore avoids the setState-in-effect lint rule by using
// React 18's recommended pattern for reading external stores.
function subscribe(_: () => void) {
  return () => {};
}
function getSnapshot() {
  try {
    return !!localStorage.getItem(LOCAL_STORAGE_KEYS.quickStartDismissed);
  } catch {
    return true;
  }
}
function getServerSnapshot() {
  return false;
}

export function QuickStartBanner() {
  const dismissed = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [localDismissed, setLocalDismissed] = React.useState(false);
  const [seeding, setSeeding] = React.useState(false);

  const cashCount = useLiveQuery(() => db.cashSources.count(), []);
  const paymentCount = useLiveQuery(() => db.payments.count(), []);

  function dismiss() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.quickStartDismissed, 'true');
    } catch { /* ignore */ }
    setLocalDismissed(true);
  }

  async function handleLoadSample() {
    setSeeding(true);
    try {
      const empty = await isDatabaseEmpty();
      if (!empty) {
        toast.info('Sample data can only be loaded into an empty database.');
        return;
      }
      await seedSampleData();
      toast.success('Sample data loaded — explore the dashboard to see it in action.');
      dismiss();
    } catch {
      toast.error('Failed to load sample data. Please try again.');
    } finally {
      setSeeding(false);
    }
  }

  if (cashCount === undefined || paymentCount === undefined) return null;
  if (dismissed || localDismissed || cashCount > 0 || paymentCount > 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-start justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Get started in 3 steps</p>
          <p className="text-xs text-muted-foreground">
            Know if you&apos;ll have enough money before payday.
          </p>
        </div>
        <button
          aria-label="Dismiss quick start"
          onClick={dismiss}
          className="ml-2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border">
        {STEPS.map(({ icon: Icon, label, description, href }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-2 px-3 py-4 text-center transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <Icon className="h-4 w-4 text-primary" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="border-t border-border px-4 py-3 text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLoadSample}
          disabled={seeding}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {seeding ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="mr-1.5 h-3.5 w-3.5" />
          )}
          Or load sample data to explore
        </Button>
      </div>
    </div>
  );
}
