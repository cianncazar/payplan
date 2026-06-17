import type { Metadata } from 'next';
import { AvailableCashCard } from '@/components/dashboard/available-cash-card';
import { DueSoonCard } from '@/components/dashboard/due-soon-card';
import { SavingsSummaryCard } from '@/components/dashboard/savings-summary-card';
import { PlanResultsCard } from '@/components/dashboard/plan-results-card';
import { SmartInsights } from '@/components/dashboard/smart-insights';
import { QuickStartBanner } from '@/components/dashboard/quick-start-banner';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <DashboardHeader />

      {/* Summary metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <AvailableCashCard />
        <DueSoonCard days={7} />
        <DueSoonCard days={30} />
      </div>

      {/* Contextual insight pills */}
      <SmartInsights />

      {/* Live 30-day plan results */}
      <PlanResultsCard />

      {/* Onboarding guide — hidden once user has data */}
      <QuickStartBanner />

      {/* Savings progress */}
      <SavingsSummaryCard />
    </div>
  );
}
