import { AlertCircle, CheckCircle } from 'lucide-react';

export function ShortfallExampleSection() {
  return (
    <section className="bg-primary py-16 md:py-24" aria-labelledby="shortfall-heading">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16 md:items-center">
          {/* Text */}
          <div>
            <h2 id="shortfall-heading" className="text-3xl font-bold tracking-tight text-primary-foreground md:text-4xl">
              Shortfalls are shown before they become missed payments.
            </h2>
            <p className="mt-4 text-primary-foreground/80">
              PayPlan checks payment deadlines against available cash, expected income, allowance
              reservations, and cash buffer. If the timing does not work, the app shows the gap
              clearly.
            </p>
            <p className="mt-4 flex items-start gap-2 text-sm text-primary-foreground/70">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-foreground/60" aria-hidden />
              PayPlan suggests options, but never automatically changes your plan.
            </p>
          </div>

          {/* Example alert card */}
          <div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/20">
                  <AlertCircle className="h-4 w-4 text-red-300" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold text-primary-foreground">Shortfall detected</p>
                  <p className="mt-0.5 text-sm text-primary-foreground/80">
                    You will be ₱1,250 short on June 25.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/60">
                  Affected payments
                </p>
                <ul className="mt-1.5 space-y-1 text-sm text-primary-foreground/80">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" aria-hidden />
                    BNPL Installment
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" aria-hidden />
                    Family Obligation
                  </li>
                </ul>
              </div>

              <div className="mt-5 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/60">
                  Try one of these
                </p>
                <ul className="mt-1.5 space-y-1 text-sm text-primary-foreground/80">
                  {[
                    'Reduce allowance',
                    'Delay a non-essential payment',
                    'Wait for upcoming salary',
                    'Compare an alternative scenario',
                  ].map((option) => (
                    <li key={option} className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
                      {option}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
