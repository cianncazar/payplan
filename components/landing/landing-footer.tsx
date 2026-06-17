import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-background py-10">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          {/* Brand */}
          <div className="max-w-sm">
            <p className="font-semibold">PayPlan</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A local-first payment-planning tool that helps you forecast upcoming payment deadlines
              before payday.
            </p>
          </div>

          {/* Links */}
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
            <Link href="/backup" className="text-sm text-muted-foreground hover:text-foreground">
              Backup
            </Link>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              Open App
            </Link>
          </nav>
        </div>

        {/* Disclaimer */}
        <p className="mt-8 border-t border-border pt-6 text-xs text-muted-foreground">
          PayPlan is a payment-planning tool. Calculations, forecasts, and suggested schedules are
          estimates based on the information you enter. Always confirm balances, fees, interest, and
          due dates with the lender, biller, or payee. PayPlan does not provide financial, legal,
          tax, or credit advice.
        </p>
      </div>
    </footer>
  );
}
