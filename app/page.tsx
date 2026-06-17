import type { Metadata } from 'next';
import { AvailableCashCard } from '@/components/dashboard/available-cash-card';
import { DueSoonCard } from '@/components/dashboard/due-soon-card';
import { SavingsSummaryCard } from '@/components/dashboard/savings-summary-card';
import { UpcomingPaymentsList } from '@/components/dashboard/upcoming-payments-list';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your payment planning summary.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <AvailableCashCard />
        <DueSoonCard days={7} />
        <DueSoonCard days={30} />
      </div>

      {/* Savings summary */}
      <SavingsSummaryCard />

      {/* Upcoming payments list */}
      <UpcomingPaymentsList maxItems={5} />
    </div>
  );
}
