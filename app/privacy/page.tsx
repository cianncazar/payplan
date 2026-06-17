import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Privacy &amp; Storage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How your data is stored and what that means.
        </p>
      </div>

      <div className="prose prose-sm max-w-2xl dark:prose-invert">
        <h2>Local-only storage</h2>
        <p>
          Your plan is stored only in this browser using IndexedDB. Clearing browser data,
          using private browsing, or moving to another device may remove it. Export a backup
          from the{' '}
          <a href="/backup">Backup page</a> if you want to keep a copy.
        </p>

        <h2>What is stored</h2>
        <p>PayPlan stores the following data locally on your device:</p>
        <ul>
          <li>App settings and preferences</li>
          <li>Cash sources and balances</li>
          <li>Payment obligations and occurrences</li>
          <li>Income sources and events</li>
          <li>Allowance budgets</li>
          <li>Savings goals and deposit history</li>
          <li>Plan scenarios and allocations</li>
          <li>Manual cash adjustments</li>
        </ul>

        <h2>Google Drive backup (optional)</h2>
        <p>
          You can optionally back up your plan to your own Google Drive from the{' '}
          <a href="/backup">Backup page</a>. This feature is entirely opt-in and works
          as follows:
        </p>
        <ul>
          <li>
            PayPlan requests only the <code>drive.appdata</code> permission — a restricted
            scope that lets the app read and write only the files it created itself. It
            cannot access, view, or modify any other files in your Drive.
          </li>
          <li>
            The backup file is stored in a hidden app folder in your Drive, not visible
            in My Drive.
          </li>
          <li>
            PayPlan never uploads or downloads automatically. Every backup and restore
            requires an explicit action from you.
          </li>
          <li>
            Your Google access token is stored in <code>sessionStorage</code> only — it
            is cleared when the browser tab closes and is never written to disk or sent
            to any PayPlan server.
          </li>
          <li>
            Disconnecting Google Drive from the Backup page revokes PayPlan&apos;s access
            immediately. Any backup file already in your Drive is not deleted — you can
            remove it manually from Google Drive settings.
          </li>
        </ul>

        <h2>What is not stored or transmitted</h2>
        <ul>
          <li>No planning data is sent to any PayPlan server.</li>
          <li>No account, email, or password is required or stored by PayPlan.</li>
          <li>No bank credentials or card numbers are requested or stored.</li>
          <li>No analytics are collected that include payment names, amounts, or dates.</li>
        </ul>

        <h2>Limitation</h2>
        <p>
          Anyone with access to this browser profile may be able to view your plan.
          PayPlan does not provide encryption or identity-based access control in this version.
        </p>

        <h2>Disclaimer</h2>
        <p>
          PayPlan is a budgeting and payment-planning tool. Calculations, forecasts, and
          suggested schedules are estimates based on the information you enter. Always confirm
          balances, fees, interest, and due dates with the lender, biller, or payee. PayPlan
          does not provide financial, legal, tax, or credit advice.
        </p>
      </div>
    </div>
  );
}
