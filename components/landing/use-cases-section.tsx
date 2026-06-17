import { CircleDollarSign, CalendarCheck, Wallet, CalendarDays } from 'lucide-react';
import { AnimatedSection } from './animated-section';

const USE_CASES = [
  {
    icon: CircleDollarSign,
    title: 'Salary before bills',
    body: 'Check whether your next salary arrives before your rent, utilities, or installment payments.',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-950',
  },
  {
    icon: CalendarCheck,
    title: 'Installment planning',
    body: 'Track BNPL, loans, and fixed payments without guessing which deadline comes first.',
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
  },
  {
    icon: Wallet,
    title: 'Daily allowance planning',
    body: 'Reserve money for daily needs before deciding which payments can be made.',
    iconColor: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-violet-100 dark:bg-violet-950',
  },
  {
    icon: CalendarDays,
    title: 'Irregular income',
    body: 'Add expected income events and see how delayed payments affect your plan.',
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-950',
  },
] as const;

export function UseCasesSection() {
  return (
    <section className="bg-muted/40 py-16 md:py-24" aria-labelledby="usecases-heading">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <AnimatedSection className="mx-auto max-w-2xl text-center">
          <h2 id="usecases-heading" className="text-3xl font-bold tracking-tight md:text-4xl">
            Useful when timing matters.
          </h2>
        </AnimatedSection>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {USE_CASES.map((uc, i) => {
            const Icon = uc.icon;
            return (
              <AnimatedSection key={uc.title} delay={i * 100}>
                <div className="group h-full rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md">
                  <span
                    className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 ${uc.iconBg}`}
                  >
                    <Icon className={`h-5 w-5 ${uc.iconColor}`} aria-hidden />
                  </span>
                  <h3 className="font-semibold">{uc.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{uc.body}</p>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}
