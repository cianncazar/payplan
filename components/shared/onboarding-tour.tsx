'use client';

import * as React from 'react';
import {
  LayoutDashboard,
  CreditCard,
  CalendarCheck,
  PiggyBank,
  Zap,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { LOCAL_STORAGE_KEYS } from '@/lib/constants';
import { useTourStore } from '@/stores/tour-store';
import { isDatabaseEmpty, seedSampleData } from '@/lib/sample-data/seed';

// ─── Tour steps ───────────────────────────────────────────────────────────────

const STEPS = [
  {
    icon: LayoutDashboard,
    iconClass: 'bg-primary/10 text-primary',
    title: 'Welcome to PayPlan',
    description:
      'A privacy-first payment planner. No account needed — all your data stays in this browser, on your device.',
    detail:
      'Track payments, plan your cash flow, and save toward your goals. Nothing is ever sent to a server.',
  },
  {
    icon: CreditCard,
    iconClass: 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
    title: 'Track payments & income',
    description:
      'Add recurring bills, credit cards, loans, and installment plans. Add your salary and any other income sources.',
    detail:
      'PayPlan knows when money comes in and when it\'s due — so it can show you how much cash you\'ll have on any date.',
  },
  {
    icon: CalendarCheck,
    iconClass: 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
    title: 'Get a payment plan',
    description:
      'The Planner builds a day-by-day schedule showing what to pay, when to pay it, and where you might fall short.',
    detail:
      'Choose a strategy: pay essential bills first, clear the smallest balances, or set your own priority order.',
  },
  {
    icon: PiggyBank,
    iconClass: 'bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400',
    title: 'Track your savings goals',
    description:
      'Create goals for emergency funds, vacations, or anything else. Log deposits and watch progress over time.',
    detail: 'Savings goals appear on your dashboard with progress bars so you always see where each goal stands.',
  },
  {
    icon: Zap,
    iconClass: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400',
    title: 'Try it with sample data',
    description:
      'Load a realistic set of bills, income, and savings goals to explore the app with actual numbers.',
    detail: null,
    isFinal: true,
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingTour() {
  const { isOpen, open, close } = useTourStore();
  const [step, setStep] = React.useState(0);
  const [seeding, setSeeding] = React.useState(false);

  // Auto-open on first visit
  React.useEffect(() => {
    try {
      if (!localStorage.getItem(LOCAL_STORAGE_KEYS.tourCompleted)) {
        open();
      }
    } catch {
      // localStorage blocked (private browsing) — skip auto-open
    }
  }, [open]);

  function dismiss() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.tourCompleted, 'true');
    } catch { /* ignore */ }
    close();
    setStep(0);
  }

  async function handleLoadSample() {
    setSeeding(true);
    try {
      const empty = await isDatabaseEmpty();
      if (!empty) {
        toast.info('Sample data can only be loaded into an empty database. Clear all data first from the Backup page, then try again.');
        setSeeding(false);
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

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) dismiss(); }}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          {/* Step icon */}
          <div
            className={cn(
              'mb-2 flex h-11 w-11 items-center justify-center rounded-xl',
              current.iconClass
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <DialogTitle className="text-lg">{current.title}</DialogTitle>
          <DialogDescription className="text-sm">{current.description}</DialogDescription>
        </DialogHeader>

        {/* Detail text */}
        {current.detail && (
          <p className="text-sm text-muted-foreground">{current.detail}</p>
        )}

        {/* Sample data CTA */}
        {'isFinal' in current && current.isFinal && (
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={handleLoadSample}
              disabled={seeding}
            >
              {seeding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              Load sample data
            </Button>
            <Button variant="outline" className="w-full" onClick={dismiss}>
              Start with an empty plan
            </Button>
          </div>
        )}

        {/* Step dots + navigation */}
        <div className="flex items-center justify-between pt-1">
          {/* Dots */}
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === step
                    ? 'w-4 bg-primary'
                    : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                )}
              />
            ))}
          </div>

          {/* Prev / Next */}
          {!isLast && (
            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                Next
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          {isLast && step > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
