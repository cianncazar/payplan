import { Shield, UserX, Banknote, DownloadCloud, AlertCircle } from 'lucide-react';
import { AnimatedSection } from './animated-section';

const PRIVACY_POINTS = [
  { icon: UserX, text: 'No sign-up required' },
  { icon: Banknote, text: 'No bank connection required' },
  { icon: Shield, text: 'No financial data uploaded by default' },
  { icon: DownloadCloud, text: 'Manual backup export available' },
] as const;

export function PrivacySection() {
  return (
    <section id="privacy" className="bg-background py-16 md:py-24" aria-labelledby="privacy-heading">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16 md:items-center">
          {/* Icon — slide in from left */}
          <AnimatedSection from="left" className="flex justify-center">
            <div className="group flex h-48 w-48 flex-col items-center justify-center rounded-3xl border border-border bg-muted shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30">
              <Shield className="h-20 w-20 text-primary/30 transition-all duration-300 group-hover:text-primary/50 group-hover:scale-110" aria-hidden />
              <p className="mt-3 text-xs font-semibold text-muted-foreground">Local-first</p>
            </div>
          </AnimatedSection>

          {/* Text — slide in from right */}
          <AnimatedSection from="right" delay={100}>
            <h2 id="privacy-heading" className="text-3xl font-bold tracking-tight md:text-4xl">
              No account required. Your plan stays local.
            </h2>
            <p className="mt-4 text-muted-foreground">
              PayPlan stores your planning data in your browser by default. You can export a backup
              file if you want to keep a copy or move your plan to another device.
            </p>

            <ul className="mt-6 space-y-3">
              {PRIVACY_POINTS.map((point) => {
                const Icon = point.icon;
                return (
                  <li
                    key={point.text}
                    className="group flex items-center gap-3 text-sm"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-all duration-200 group-hover:bg-primary/20 group-hover:scale-110">
                      <Icon className="h-4 w-4 text-primary" aria-hidden />
                    </span>
                    {point.text}
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Clearing browser data, using private browsing, or changing devices may remove your
                plan. Export a backup if you want to keep a copy.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
