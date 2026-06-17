import {
  TriangleAlert,
  CalendarDays,
  Wallet,
  Bell,
  GitCompare,
  LockKeyhole,
} from 'lucide-react';

const BENEFITS = [
  {
    icon: TriangleAlert,
    title: 'See upcoming payment risk',
    body: 'Know which payments are due soon and whether they can be funded.',
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-950',
  },
  {
    icon: CalendarDays,
    title: 'Forecast cash before payday',
    body: 'Compare available cash, expected income, and payment deadlines in one timeline.',
    iconColor: 'text-sky-600 dark:text-sky-400',
    iconBg: 'bg-sky-100 dark:bg-sky-950',
  },
  {
    icon: Wallet,
    title: 'Reserve daily allowance',
    body: 'Keep money for daily needs before allocating funds to payments.',
    iconColor: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-violet-100 dark:bg-violet-950',
  },
  {
    icon: Bell,
    title: 'Spot shortfalls early',
    body: 'Get a clear alert when a payment deadline may not be covered.',
    iconColor: 'text-destructive',
    iconBg: 'bg-destructive/10',
  },
  {
    icon: GitCompare,
    title: 'Compare scenarios',
    body: 'Test what happens if you lower allowance, wait for salary, or delay a non-essential payment.',
    iconColor: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-100 dark:bg-teal-950',
  },
  {
    icon: LockKeyhole,
    title: 'Works without an account',
    body: 'Start planning immediately. Your data stays in your browser by default.',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-950',
  },
] as const;

export function BenefitsSection() {
  return (
    <section id="benefits" className="bg-muted/40 py-16 md:py-24" aria-labelledby="benefits-heading">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="benefits-heading" className="text-3xl font-bold tracking-tight md:text-4xl">
            Built for payment planning, not complicated budgeting.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className="rounded-xl border border-border bg-card p-6 shadow-sm"
              >
                <span
                  className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${b.iconBg}`}
                >
                  <Icon className={`h-5 w-5 ${b.iconColor}`} aria-hidden />
                </span>
                <h3 className="font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
