import Link from 'next/link';
import { Wallet, CalendarCheck, TriangleAlert } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AnimatedSection } from './animated-section';

const STEPS = [
  {
    number: 1,
    icon: Wallet,
    title: 'Add your available cash',
    body: 'Enter what you can use today from cash, bank, or e-wallet balances.',
  },
  {
    number: 2,
    icon: CalendarCheck,
    title: 'Add income and deadlines',
    body: 'Enter your next salary, bills, loans, rent, installment payments, or other obligations.',
  },
  {
    number: 3,
    icon: TriangleAlert,
    title: 'See what is covered',
    body: 'PayPlan shows funded payments, upcoming risks, remaining cash, and any shortfall before payday.',
  },
] as const;

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-background py-16 md:py-24" aria-labelledby="hiw-heading">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <AnimatedSection className="mx-auto max-w-2xl text-center">
          <h2 id="hiw-heading" className="text-3xl font-bold tracking-tight md:text-4xl">
            Plan your payments in three steps.
          </h2>
        </AnimatedSection>

        <div className="relative mt-12 grid gap-8 sm:grid-cols-3">
          {/* Connector lines (desktop) */}
          <div className="absolute left-0 right-0 top-10 hidden sm:block" aria-hidden="true">
            <div className="mx-auto max-w-lg">
              <div className="h-px bg-border" />
            </div>
          </div>

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <AnimatedSection key={step.number} delay={i * 150}>
                <div className="group relative flex flex-col items-center text-center transition-transform duration-300 hover:-translate-y-1">
                  <span className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card shadow-sm transition-shadow duration-300 group-hover:shadow-md">
                    <Icon className="h-8 w-8 text-primary transition-transform duration-300 group-hover:scale-110" aria-hidden />
                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground transition-transform duration-300 group-hover:scale-110">
                      {step.number}
                    </span>
                  </span>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
                </div>
              </AnimatedSection>
            );
          })}
        </div>

        <AnimatedSection delay={500} className="mt-10 flex justify-center">
          <Link
            href="/"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]'
            )}
          >
            Create my first plan
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}
