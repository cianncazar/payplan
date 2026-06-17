import { CalendarDays, Wallet, TriangleAlert } from 'lucide-react';
import { AnimatedSection } from './animated-section';

const PROBLEMS = [
  {
    icon: CalendarDays,
    title: 'Payments come before payday',
    body: 'See which deadlines arrive before your next income.',
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-950',
  },
  {
    icon: Wallet,
    title: 'Daily needs reduce available cash',
    body: 'Reserve allowance for food, transport, and essentials before planning payments.',
    iconColor: 'text-sky-600 dark:text-sky-400',
    iconBg: 'bg-sky-100 dark:bg-sky-950',
  },
  {
    icon: TriangleAlert,
    title: 'Small gaps become missed deadlines',
    body: 'Spot shortfalls early and compare safer payment choices.',
    iconColor: 'text-destructive',
    iconBg: 'bg-destructive/10',
  },
] as const;

export function ProblemSection() {
  return (
    <section className="bg-muted/40 py-16 md:py-24" aria-labelledby="problem-heading">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <AnimatedSection className="mx-auto max-w-2xl text-center">
          <h2 id="problem-heading" className="text-3xl font-bold tracking-tight md:text-4xl">
            Bills are easy to list. Timing is the hard part.
          </h2>
          <p className="mt-4 text-muted-foreground">
            A payment can look affordable until you realize it is due before your next salary.
            PayPlan focuses on timing, cash flow, and deadlines so you can plan before a shortfall
            happens.
          </p>
        </AnimatedSection>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {PROBLEMS.map((p, i) => {
            const Icon = p.icon;
            return (
              <AnimatedSection key={p.title} delay={i * 120}>
                <div className="group h-full rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md">
                  <span
                    className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 ${p.iconBg}`}
                  >
                    <Icon className={`h-5 w-5 ${p.iconColor}`} aria-hidden />
                  </span>
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}
