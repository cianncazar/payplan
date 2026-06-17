import Link from 'next/link';
import { Shield, TriangleAlert, CheckCircle, CircleDollarSign } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function HeroPreviewCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Next 30 days
        </span>
        <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
          Shortfall
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2.5">
          <span className="text-sm text-muted-foreground">Cash available</span>
          <span className="font-semibold tabular-nums">₱8,500</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-800 dark:bg-emerald-950/30">
          <span className="text-sm text-emerald-800 dark:text-emerald-200">Salary (Jun 30)</span>
          <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">+₱12,000</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
          <span className="text-sm text-destructive/90">Rent (Jun 25)</span>
          <span className="font-semibold tabular-nums text-destructive">−₱8,000</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
          <span className="text-sm text-destructive/90">BNPL (Jun 22)</span>
          <span className="font-semibold tabular-nums text-destructive">−₱1,500</span>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
        <p className="text-xs font-medium text-destructive">
          ₱1,250 gap on June 25 — cash won&apos;t cover rent before salary arrives.
        </p>
      </div>
    </div>
  );
}

export function LandingHero() {
  return (
    <section
      className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-muted/30 py-16 md:py-24"
      aria-label="Hero"
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          {/* Left column */}
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Shield className="h-3.5 w-3.5" aria-hidden />
              No account required
            </span>

            <div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
                Know if you&apos;ll have enough money before payday.
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Enter your cash, next income, and upcoming payments. PayPlan shows what you can
                cover, what is at risk, and where a shortfall may happen.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className={cn(buttonVariants({ size: 'lg' }), 'w-full justify-center sm:w-auto')}
              >
                Start Planning
              </Link>
              <a
                href="#how-it-works"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'w-full justify-center sm:w-auto'
                )}
              >
                See how it works
              </a>
            </div>

            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
              Your plan stays in this browser unless you choose to export or back it up.
            </p>
          </div>

          {/* Right column: preview card */}
          <div className="relative flex justify-center md:justify-end">
            <div className="w-full max-w-sm">
              <HeroPreviewCard />
              <div className="mt-3 flex items-center gap-1.5 justify-center">
                <CircleDollarSign className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                <span className="text-xs text-muted-foreground">Sample data — not your real plan</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
