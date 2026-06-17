import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AnimatedSection } from './animated-section';

export function LandingCTA() {
  return (
    <section className="bg-primary py-16 md:py-24" aria-labelledby="cta-heading">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <AnimatedSection className="mx-auto max-w-2xl text-center">
          <h2 id="cta-heading" className="text-3xl font-bold tracking-tight text-primary-foreground md:text-4xl">
            Start with your next payday.
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            Add your cash, next income, and upcoming payments to see what is covered and what needs
            attention.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'w-full justify-center bg-white text-primary transition-all duration-200 hover:bg-white/90 hover:scale-[1.03] active:scale-[0.97] sm:w-auto'
              )}
            >
              Start Planning
            </Link>
          </div>
          <p className="mt-4 text-sm text-primary-foreground/60">No account required.</p>
        </AnimatedSection>
      </div>
    </section>
  );
}
