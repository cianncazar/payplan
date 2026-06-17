import { AlertCircle, CheckCircle, CircleDollarSign, CalendarDays } from 'lucide-react';

function PreviewDashboardCard() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="text-xs text-muted-foreground">Next 30 days</p>
          <p className="font-semibold">Can I afford everything?</p>
        </div>
        <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
          Shortfall
        </span>
      </div>

      {/* Alert */}
      <div className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
        <p className="text-xs text-destructive">
          You are short ₱1,250 for upcoming obligations.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 p-5">
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CircleDollarSign className="h-3.5 w-3.5" aria-hidden />
            Money available today
          </div>
          <p className="mt-1 font-semibold tabular-nums">₱8,500</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle className="h-3.5 w-3.5" aria-hidden />
            Next income
          </div>
          <p className="mt-1 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            Salary — Jun 30
          </p>
        </div>
      </div>

      {/* Next payment */}
      <div className="border-t border-border px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span>Rent due June 25</span>
          </div>
          <span className="font-semibold tabular-nums">₱8,000</span>
        </div>
      </div>

      {/* Recommendation */}
      <div className="border-t border-border px-5 py-3">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Recommended:</span> Compare a scenario or
          reduce allowance.
        </p>
      </div>

      {/* Sample data notice */}
      <div className="border-t border-border px-5 py-2.5">
        <p className="text-center text-xs text-muted-foreground">Sample data — not your real plan</p>
      </div>
    </div>
  );
}

export function ProductPreviewSection() {
  return (
    <section className="bg-background py-16 md:py-24" aria-labelledby="preview-heading">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="preview-heading" className="text-3xl font-bold tracking-tight md:text-4xl">
            See your plan at a glance.
          </h2>
          <p className="mt-4 text-muted-foreground">
            The dashboard answers the key question immediately — can you cover what is due before
            your next income arrives?
          </p>
        </div>

        <div className="mt-12 flex justify-center">
          <PreviewDashboardCard />
        </div>
      </div>
    </section>
  );
}
