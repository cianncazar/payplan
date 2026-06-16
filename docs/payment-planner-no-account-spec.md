# Payment Planner Web App — No-Account Claude Code Specification

> **Working title:** PayPlan
>
> Build a responsive, privacy-first web application that helps people plan upcoming payments without creating an account, signing in, or connecting a bank.
>
> The application must open directly into the planning experience. All user-entered data is stored locally on the current device and browser unless the user explicitly exports a backup file.
>
> This document is intended to be used as the primary implementation brief in Claude Code.

---

## 1. Product Summary

PayPlan is a lightweight payment-planning web app for people who want to answer five practical questions:

1. What payments are coming up?
2. How much money will be available before each due date?
3. Which payments should be prioritized?
4. Will enough money remain for daily needs?
5. Where will a shortfall occur?

The app may be used for:

- Rent
- Utilities
- Credit-card payments
- Personal loans
- Installment plans
- Buy now, pay later purchases
- Tuition
- Insurance
- Taxes
- Medical bills
- Subscriptions
- Family obligations
- One-time bills
- Daily or weekly spending allowances
- Other custom payments

PayPlan is a planning tool only. It does not process payments, connect to banks, lend money, create financial accounts, or provide financial advice.

---

## 2. Core Product Decision

### No account is required

The MVP must not include:

- Sign-up
- Sign-in
- Passwords
- Magic links
- User profiles
- Cloud accounts
- Social login
- Supabase Auth
- Remote personal databases
- Email reminders
- Account recovery
- Account deletion
- Multi-user sharing

The user must be able to open the app and begin planning immediately.

### Local-first storage

All planning data must remain in the current browser by default.

Use:

- IndexedDB for primary structured storage
- A small localStorage entry only for lightweight interface preferences when appropriate
- JSON export and import for manual backup and transfer

Display a clear notice:

> Your plan is stored only in this browser. Clearing browser data, using private browsing, or changing devices may remove it. Export a backup if you want to keep a copy.

Do not silently upload financial data to a server.

---

## 3. Product Principles

1. **Start immediately** — no account wall or onboarding requirement.
2. **Simple planning** — focus on upcoming money, deadlines, and affordability.
3. **Local privacy** — data stays on the device unless exported by the user.
4. **Clear calculations** — explain how every total and shortfall was produced.
5. **Cash-flow aware** — never schedule money before it is available.
6. **Deadline aware** — overdue and near-due payments must stand out.
7. **Daily-needs aware** — reserve allowance and cash buffer before optional payments.
8. **Flexible inputs** — support exact and estimated amounts.
9. **User controlled** — suggestions never modify the plan without confirmation.
10. **Non-judgmental language** — avoid shaming labels.
11. **Mobile first** — common tasks must be easy on a phone.
12. **Easy recovery** — support export, import, and reset controls.

---

## 4. Recommended Technology Stack

### Application

- **Framework:** Next.js App Router
- **Language:** TypeScript with strict mode
- **Rendering:** Static or client-focused deployment; no authenticated server rendering required
- **Hosting:** Vercel or any static-compatible host
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **Icons:** Lucide React
- **Forms:** React Hook Form
- **Validation:** Zod
- **Dates:** date-fns
- **Charts:** Recharts
- **Local database:** IndexedDB using Dexie.js
- **State:** Zustand only for temporary interface or planner state; persisted records belong in IndexedDB
- **Drag and drop:** dnd-kit where manual priority ordering is needed

### Testing and quality

- **Unit tests:** Vitest
- **Component tests:** React Testing Library
- **End-to-end tests:** Playwright
- **Linting:** ESLint
- **Formatting:** Prettier

### Architecture decision

Do not create an Express server, Supabase project, authentication layer, or remote database for the MVP.

Calculation logic must remain independent from React and IndexedDB code.

---

## 5. Primary User Journey

1. User opens the website.
2. A brief local-storage notice appears.
3. User enters:
   - Current available cash
   - Optional minimum cash buffer
   - Expected income
   - Upcoming payments
   - Optional daily or weekly allowance
4. User selects a planning period and strategy.
5. The app generates a payment plan.
6. The user reviews:
   - Planned payment dates
   - Amount allocated to each payment
   - Remaining cash
   - Shortfalls
   - Payments that may need rescheduling
7. The user manually adjusts the plan when needed.
8. The plan is automatically saved in the browser.
9. The user may export a JSON backup or print the plan.

There must be no mandatory onboarding wizard. A guided setup may be offered, but the user must also be able to skip it and add data directly.

---

## 6. Main Application Sections

Use a simple tab or route structure:

- `/` — dashboard and immediate planning summary
- `/payments` — upcoming payment obligations
- `/income` — expected income
- `/planner` — generated payment plan
- `/calendar` — timeline or calendar view
- `/scenarios` — compare alternative plans
- `/backup` — export, import, and reset
- `/settings` — currency, date format, theme, and planner defaults
- `/privacy` — local-storage explanation and disclaimer

No login, signup, callback, profile, security, or account routes are required.

---

## 7. MVP Features

### 7.1 Quick setup

On first use, show a dismissible setup panel with:

- Default currency
- Current available cash
- Planning start date
- Optional minimum cash buffer
- Optional daily allowance
- Button to add the first payment
- Button to add expected income

The setup state must be stored locally.

### 7.2 Dashboard

The dashboard must answer:

- What is due next?
- How much is due in the next 7, 14, and 30 days?
- How much income is expected before those deadlines?
- How much money is available to allocate?
- Will the plan fall below the cash buffer?
- Is any payment overdue or underfunded?
- How much remains for daily needs?

Suggested dashboard components:

- `AvailableCashCard`
- `DueSoonCard`
- `ExpectedIncomeCard`
- `ReservedAllowanceCard`
- `PlanHealthCard`
- `UpcomingPaymentsList`
- `CashFlowChart`
- `ShortfallAlert`
- `QuickAddMenu`

Plan-health values:

- `on_track`
- `tight`
- `shortfall`
- `overdue`
- `not_enough_data`

Every status must include a reason, such as:

> ₱1,250 short on June 25 after reserving your ₱2,000 cash buffer.

### 7.3 Payment obligations

The user can:

- Add a payment
- Edit a payment
- Duplicate a payment
- Archive a payment
- Restore an archived payment
- Delete a payment after confirmation
- Mark a payment as paid
- Record a partial amount paid
- Postpone or change a future due date
- Add notes
- Assign priority
- Mark a payment as essential
- Add an estimated amount
- Add recurring payments
- Add installment schedules
- Add custom payment dates

### 7.4 Payment categories

Initial categories:

- `rent`
- `utility`
- `loan`
- `credit_card`
- `bnpl`
- `subscription`
- `insurance`
- `tuition`
- `tax`
- `medical`
- `family_obligation`
- `savings_commitment`
- `one_time_bill`
- `other`

Allow a custom display label while retaining one standard category for filtering.

### 7.5 Payment structures

Supported structures:

- `one_time`
- `fixed_recurring`
- `variable_recurring`
- `fixed_installment`
- `amortizing_loan`
- `revolving_credit`
- `no_interest_borrowing`
- `custom_schedule`

The form must show only fields relevant to the selected structure.

### 7.6 Expected income

The user can add:

- Salary
- Business income
- Allowance
- Remittance
- Freelance income
- Bonus
- Refund
- Other income

Income can be:

- One-time
- Weekly
- Every two weeks
- Twice monthly
- Monthly
- Irregular/custom

Each income event has a status:

- `expected`
- `received`
- `delayed`
- `cancelled`

Expected income must be visually distinguished from money already received.

### 7.7 Available cash

For the MVP, keep cash input simple.

Support:

- One combined available-cash balance
- Optional manual adjustments
- Optional labels for cash sources such as Cash, Bank, or E-wallet

Do not require bank account details.

The user may choose whether individual cash sources are included in the plan.

### 7.8 Daily or weekly allowance

Allow the user to reserve money for food, transportation, and other daily needs.

Inputs:

- Start date
- End date
- Daily amount, weekly amount, or total allowance
- Optional weekday and weekend amounts
- Amount already spent

Outputs:

- Total reserved allowance
- Remaining allowance
- Recommended amount per remaining day
- Effect on payment affordability

### 7.9 Payment planner

The planner must support:

1. **Deadline first** — earliest due payment first.
2. **Essential first** — rent, utilities, medicine, and manually essential items first.
3. **Minimums first** — required minimums before extra amounts.
4. **Smallest balance first** — smallest remaining balance after minimums.
5. **Highest interest first** — highest known comparable rate after minimums.
6. **Lowest cash-flow risk** — prioritize items due before the next expected income.
7. **Custom order** — user manually controls priority.

The generated plan must:

- Never allocate more cash than is available on a date.
- Reserve the cash buffer.
- Reserve the daily or weekly allowance.
- Distinguish received income from expected income.
- Display shortfalls instead of inventing money.
- Explain each allocation.
- Permit manual amount and date adjustments.
- Preserve locked manual adjustments during recalculation.
- Flag a manual adjustment that makes another required payment underfunded.

### 7.10 Scenario comparison

The user can create temporary scenarios such as:

- Current plan
- Lower allowance
- Higher allowance
- Earlier expected income
- Add a bonus
- Delay a nonessential payment
- Smallest balance first
- Highest interest first
- Custom priority order

Compare:

- Total planned payments
- Number of fully funded payments
- Number of underfunded payments
- Earliest shortfall date
- Lowest projected cash balance
- Remaining cash
- Estimated interest or fees when data is available

Scenarios must not alter the main plan until the user chooses **Apply scenario**.

### 7.11 Calendar and timeline

Include:

- Month view
- Agenda view
- Cash-flow timeline
- Payment and income events together
- Filters by type, status, and category
- Clear labels for overdue, due today, due soon, expected income, and paid

### 7.12 Lightweight payment tracking

The MVP is primarily a planner, not a full accounting system.

Support only:

- Mark as paid
- Enter paid amount
- Enter paid date
- Optional reference or note
- Undo the most recent paid-state change
- Show remaining amount

A complex double-entry ledger, bank reconciliation, and payment processor are out of scope.

### 7.13 Search and filters

Support:

- Search by payment name, payee, category, or note
- Filter by due date
- Filter by status
- Filter by category
- Filter by essential status
- Sort by due date, amount, priority, or balance

### 7.14 Export, import, and printing

Provide:

- JSON backup export
- JSON backup import
- Import validation and preview
- CSV export for payment and income lists
- Printer-friendly monthly plan
- Reset all local data

The app must never overwrite current local data during import without a clear choice:

- Replace current data
- Merge compatible records
- Cancel

Before reset, require explicit confirmation and recommend exporting a backup.

---

## 8. Local Data Model

Use UUIDs generated in the browser. Store date-only values as ISO `YYYY-MM-DD` strings.

### 8.1 `app_settings`

```ts
type AppSettings = {
  id: 'local-settings';
  defaultCurrency: string;
  locale: string;
  timezone: string;
  minimumCashBufferMinor: number;
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  defaultStrategy: PlannerStrategy;
  theme: 'light' | 'dark' | 'system';
  privacyMode: boolean;
  setupCompleted: boolean;
  createdAt: string;
  updatedAt: string;
};
```

Default values:

- Currency: `PHP`
- Locale: `en-PH`
- Time zone: `Asia/Manila`
- Cash buffer: `0`
- Theme: `system`

### 8.2 `cash_sources`

```ts
type CashSource = {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'ewallet' | 'other';
  balanceMinor: number;
  currency: string;
  includeInPlanner: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};
```

### 8.3 `payments`

```ts
type PaymentObligation = {
  id: string;
  name: string;
  payee?: string;
  category: PaymentCategory;
  customCategoryLabel?: string;
  structure: PaymentStructure;
  currency: string;

  originalAmountMinor?: number;
  currentBalanceMinor?: number;
  statedInstallmentMinor?: number;
  minimumPaymentMinor?: number;

  annualInterestRate?: string;
  dailyFeeRate?: string;
  upfrontFeeMinor?: number;

  startDate?: string;
  endDate?: string;
  firstDueDate?: string;
  recurrence?: RecurrenceRule;
  installmentCount?: number;

  gracePeriodDays: number;
  essential: boolean;
  priority: 1 | 2 | 3 | 4 | 5;
  status: 'active' | 'paused' | 'completed' | 'archived';

  notes?: string;
  createdAt: string;
  updatedAt: string;
};
```

### 8.4 `payment_occurrences`

Each expected payment date must be represented as an occurrence.

```ts
type PaymentOccurrence = {
  id: string;
  paymentId: string;
  sequenceNumber: number;
  dueDate: string;
  graceDate?: string;

  dueAmountMinor: number;
  minimumAmountMinor?: number;
  principalAmountMinor?: number;
  interestAmountMinor?: number;
  feeAmountMinor: number;

  paidAmountMinor: number;
  paidDate?: string;

  status:
    | 'scheduled'
    | 'partially_paid'
    | 'paid'
    | 'overdue'
    | 'waived'
    | 'cancelled';

  amountIsEstimate: boolean;
  manuallyOverridden: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
```

Unique logical key:

```text
paymentId + sequenceNumber
```

### 8.5 `income_sources`

```ts
type IncomeSource = {
  id: string;
  name: string;
  type:
    | 'salary'
    | 'business'
    | 'allowance'
    | 'remittance'
    | 'freelance'
    | 'bonus'
    | 'refund'
    | 'other';
  currency: string;
  recurrence?: RecurrenceRule;
  expectedAmountMinor?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
```

### 8.6 `income_events`

```ts
type IncomeEvent = {
  id: string;
  incomeSourceId?: string;
  cashSourceId?: string;
  expectedDate: string;
  receivedDate?: string;
  expectedAmountMinor: number;
  receivedAmountMinor?: number;
  status: 'expected' | 'received' | 'delayed' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
```

### 8.7 `allowance_budgets`

```ts
type AllowanceBudget = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  totalBudgetMinor: number;
  dailyTargetMinor?: number;
  weekdayTargetMinor?: number;
  weekendTargetMinor?: number;
  spentAmountMinor: number;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
};
```

### 8.8 `plan_scenarios`

```ts
type PlanScenario = {
  id: string;
  name: string;
  strategy: PlannerStrategy;
  startDate: string;
  endDate: string;
  openingCashMinor: number;
  cashBufferMinor: number;
  reservedAllowanceMinor: number;
  includeExpectedIncome: boolean;
  settings: Record<string, unknown>;
  summary?: PlannerSummary;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
```

### 8.9 `plan_allocations`

```ts
type PlanAllocation = {
  id: string;
  scenarioId: string;
  occurrenceId: string;
  plannedDate: string;
  plannedAmountMinor: number;
  allocationType: 'minimum' | 'required' | 'extra' | 'manual';
  reason: string;
  manuallyLocked: boolean;
  createdAt: string;
  updatedAt: string;
};
```

### 8.10 `manual_cash_adjustments`

```ts
type ManualCashAdjustment = {
  id: string;
  date: string;
  amountMinor: number;
  direction: 'inflow' | 'outflow';
  label: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
```

---

## 9. IndexedDB Schema

Create a Dexie database named `PayPlanDB`.

Suggested tables:

```ts
db.version(1).stores({
  appSettings: 'id',
  cashSources: 'id, type, archived',
  payments: 'id, category, status, priority, essential',
  paymentOccurrences: 'id, paymentId, dueDate, status, [paymentId+sequenceNumber]',
  incomeSources: 'id, type, active',
  incomeEvents: 'id, incomeSourceId, expectedDate, status',
  allowanceBudgets: 'id, startDate, endDate, status',
  planScenarios: 'id, active, startDate, endDate',
  planAllocations: 'id, scenarioId, occurrenceId, plannedDate',
  manualCashAdjustments: 'id, date, direction'
});
```

Requirements:

- Add schema-version migrations when the model changes.
- Do not delete existing local data during an upgrade.
- Wrap multi-table changes in Dexie transactions.
- Validate imported data before inserting it.
- Use an application-level backup version.

---

## 10. Backup File Format

Export one JSON file containing:

```ts
type PayPlanBackup = {
  format: 'payplan-backup';
  version: 1;
  exportedAt: string;
  appVersion: string;
  data: {
    appSettings: AppSettings[];
    cashSources: CashSource[];
    payments: PaymentObligation[];
    paymentOccurrences: PaymentOccurrence[];
    incomeSources: IncomeSource[];
    incomeEvents: IncomeEvent[];
    allowanceBudgets: AllowanceBudget[];
    planScenarios: PlanScenario[];
    planAllocations: PlanAllocation[];
    manualCashAdjustments: ManualCashAdjustment[];
  };
};
```

Import requirements:

1. Confirm `format`.
2. Confirm supported backup `version`.
3. Validate every collection with Zod.
4. Reject malformed dates and invalid amounts.
5. Show a summary before importing.
6. Offer replace or merge.
7. Resolve duplicate IDs deterministically.
8. Make the import atomic.
9. Keep the original file untouched.
10. Show a success or failure report.

---

## 11. Money Rules

Use integer minor units for stored and calculated money.

Examples:

- `₱1.00` is stored as `100`
- `₱1,250.50` is stored as `125050`

Never use binary floating-point values for final money calculations.

Create helpers under `src/lib/money`:

- `parseMoneyInput`
- `formatMoney`
- `addMoney`
- `subtractMoney`
- `multiplyMoney`
- `divideMoney`
- `allocateRemainder`
- `convertMajorToMinor`
- `convertMinorToMajor`

Requirements:

- Zero is valid.
- Negative values are allowed only for explicit balance adjustments or negative opening cash.
- Round only at defined boundaries.
- Installment rounding differences must be added to the final installment.
- Do not use truthy checks for amounts.

---

## 12. Calculation Rules

All calculation functions must be pure, deterministic, and tested.

Store them under:

```text
src/lib/calculations/
```

### 12.1 Remaining payment amount

```text
remaining = max(0, due amount - paid amount - waived amount)
```

### 12.2 Zero-interest installment

```text
base installment = principal / number of installments
```

Allocate any rounding remainder to the final installment.

### 12.3 Fixed installment

When the user enters a lender-provided installment amount, treat it as authoritative.

```text
total scheduled = installment amount × installment count
estimated financing cost = total scheduled + upfront fees - principal
```

Do not invent an interest rate.

### 12.4 Amortizing loan estimate

For a standard fixed-rate amortizing estimate:

```text
payment = P × [r(1+r)^n] / [(1+r)^n - 1]
```

Where:

- `P` is principal
- `r` is the periodic rate
- `n` is the installment count

When `r = 0`, use `P / n`.

Always label the result as an estimate.

### 12.5 Daily fee estimate

For a disclosed non-compounding daily rate:

```text
service fee = principal × daily rate × chargeable days
```

Do not use this formula for compounding or declining-balance fees.

### 12.6 Allowance

```text
remaining allowance = max(0, allowance budget - amount spent)
recommended daily amount = remaining allowance / remaining inclusive days
```

### 12.7 Projected cash

For chronological events:

```text
closing balance =
  opening balance
  + received income
  + included expected income
  + manual inflows
  - planned payments
  - reserved allowance
  - manual outflows
```

Expected income must carry a warning because it has not been received.

### 12.8 Allocatable cash

```text
allocatable cash =
  projected cash
  - minimum cash buffer
  - allowance reserved for the relevant period
```

### 12.9 Shortfall

```text
shortfall = max(0, required planned amount - allocatable cash)
```

### 12.10 Comparable interest rate

Only include a payment in highest-interest ranking when sufficient rate information exists.

For missing rate data, show:

> Rate not provided. This payment was placed after debts with known comparable rates.

---

## 13. Planner Types

```ts
type PlannerStrategy =
  | 'deadline_first'
  | 'essential_first'
  | 'minimums_first'
  | 'smallest_balance_first'
  | 'highest_interest_first'
  | 'lowest_cash_flow_risk'
  | 'custom';

type PlannerInput = {
  periodStart: string;
  periodEnd: string;
  openingCashMinor: number;
  minimumCashBufferMinor: number;
  allowanceReservations: AllowanceReservation[];
  incomeEvents: PlannerIncomeEvent[];
  occurrences: PlannerPaymentOccurrence[];
  manualAdjustments: ManualCashAdjustment[];
  strategy: PlannerStrategy;
  customPriority?: string[];
  includeExpectedIncome: boolean;
  manualLocks?: ManualAllocationLock[];
};

type PlannerResult = {
  allocations: PlannedAllocation[];
  timeline: CashFlowPoint[];
  shortfalls: Shortfall[];
  warnings: PlannerWarning[];
  summary: PlannerSummary;
  explanations: string[];
};
```

---

## 14. Planner Algorithm

Implement the planner as a pure function.

1. Validate the date range.
2. Normalize date-only values.
3. Calculate opening cash from included cash sources.
4. Build chronological events for:
   - Received income
   - Included expected income
   - Allowance reservations
   - Payment deadlines
   - Manual cash adjustments
   - Locked allocations
5. Reserve the minimum cash buffer.
6. Apply valid locked allocations.
7. Determine required amount for each unpaid occurrence.
8. Rank occurrences using the selected strategy.
9. Allocate required minimums without exceeding available cash.
10. Record every unfunded amount as a shortfall.
11. Allocate remaining cash to optional additional amounts.
12. Recalculate balance after every event.
13. Return explanations and warnings.
14. Never mutate input objects.

### Ranking rules

#### Deadline first

1. Due date ascending
2. Essential first
3. Priority ascending
4. Remaining amount descending

#### Essential first

1. Essential first
2. Due date ascending
3. Priority ascending

#### Minimums first

1. Required minimum exists
2. Due date ascending
3. Essential first
4. Priority ascending

#### Smallest balance first

After minimums:

1. Remaining payment balance ascending
2. Due date ascending

#### Highest interest first

After minimums:

1. Comparable annual rate descending
2. Remaining balance descending
3. Due date ascending

#### Lowest cash-flow risk

1. Due before next expected income
2. Due date ascending
3. Essential first
4. Priority ascending

#### Custom

Use the user-defined payment ID order, then due date.

---

## 15. Planner Warning Examples

- Expected income is included but has not been received.
- The electricity payment is still an estimate.
- This plan falls below your cash buffer on June 18.
- No rate was provided, so this payment was not ranked by interest.
- A locked manual allocation causes another required payment to be underfunded.
- This payment is due before the next expected income.
- The plan contains a currency that does not match the selected cash source.
- There is not enough information to calculate a complete plan.

Warnings must identify the affected date and payment whenever possible.

---

## 16. Dynamic Payment Form

### Common fields

- Payment name
- Payee, optional
- Category
- Custom category label, optional
- Currency
- Essential toggle
- Priority
- Notes

### One-time

- Amount
- Due date
- Grace period
- Optional fees

### Fixed recurring

- Amount
- Frequency
- First due date
- End condition

### Variable recurring

- Estimated amount
- Frequency
- Next due date
- Prompt to replace estimate with actual amount

### Fixed installment

- Principal, optional
- Installment amount
- Number of installments
- First due date
- Frequency
- Upfront fees

### Amortizing loan

- Principal
- Annual rate
- Term
- Payment frequency
- First due date
- Fees
- Preview schedule

### Revolving credit

- Current balance
- Minimum payment
- Due date
- Optional annual rate

### No-interest borrowing

- Amount borrowed
- Agreed installment amount or installment count
- First due date
- Frequency
- Optional flexible deadline

### Custom schedule

Editable rows:

- Date
- Amount
- Label
- Notes

Allow add, remove, duplicate, and reorder.

### Form behavior

- Autosave unfinished form drafts locally.
- Do not treat a draft as a saved payment.
- Show a schedule preview.
- Warn before replacing future occurrences.
- Preserve paid historical occurrences.
- Validate all fields with Zod.
- Use accessible labels and inline errors.

---

## 17. Recurrence Rule

```ts
type RecurrenceRule = {
  frequency:
    | 'weekly'
    | 'biweekly'
    | 'semimonthly'
    | 'monthly'
    | 'quarterly'
    | 'yearly';
  interval?: number;
  dayOfWeek?: number;
  daysOfMonth?: number[];
  monthDayOverflow?: 'last_day' | 'next_month' | 'skip';
  endType: 'never' | 'on_date' | 'after_count';
  endDate?: string;
  occurrenceCount?: number;
};
```

For twice-monthly income, support two dates, such as the 15th and last day.

Generate a rolling 12- to 18-month horizon. Extend it when needed.

Default month-day overflow policy:

```text
last day of month
```

---

## 18. User Interface Requirements

### Layout

Mobile:

- Bottom navigation
- Floating quick-add button
- Drawer-based forms
- Compact cards instead of wide tables

Desktop:

- Sidebar navigation
- Main content area
- Optional right-side summary panel
- Keyboard-accessible command menu

### Status presentation

Use both text and icons:

- Overdue — critical
- Due today — urgent
- Due soon — warning
- Underfunded — warning or critical
- Paid — success
- Expected income — informational
- Estimated payment — informational
- Archived or waived — muted

Do not rely on color alone.

### Privacy mode

Provide a privacy-mode toggle that masks visible amounts:

```text
₱•••••
```

Privacy mode affects display only and does not encrypt local data.

### Empty states

Include useful actions for:

- No payments
- No income
- No allowance
- No active scenario
- No upcoming items
- No local backup created

### Error handling

- Never show stack traces.
- Explain IndexedDB failures in plain language.
- Offer retry.
- Warn when private browsing may prevent persistence.
- Preserve unsaved form input when possible.

---

## 19. Local Privacy and Security

Because the app has no accounts, security expectations must be explained clearly.

Requirements:

- Do not send entered financial information to analytics.
- Do not include payment names, notes, amounts, or balances in error reports.
- Do not use third-party session-recording tools.
- Do not store full card numbers, CVVs, passwords, OTPs, or banking credentials.
- Escape user-entered text.
- Validate imported files.
- Use a strict Content Security Policy where practical.
- Keep dependencies current.
- Avoid remote fonts or trackers when possible.
- Provide a clear **Delete all local data** control.

Important limitation:

> Anyone with access to this browser profile may be able to view the plan. The MVP does not provide encryption or identity-based access control.

Optional post-MVP feature:

- Passphrase-encrypted backup files using the Web Crypto API

Do not claim that local browser storage is equivalent to secure encrypted banking storage.

---

## 20. Accessibility

Target WCAG 2.2 AA where practical.

- Full keyboard navigation
- Visible focus indicators
- Semantic headings
- Accessible dialogs and drawers
- Connected form labels
- Error summaries
- Screen-reader text for status icons
- Sufficient contrast
- Reduced-motion support
- Text summaries for charts
- Touch targets of at least 44 by 44 CSS pixels where possible

---

## 21. Performance and Offline Behavior

- Load the application shell quickly.
- Lazy-load chart code.
- Query IndexedDB by indexed fields.
- Do not load years of historical occurrences into the dashboard.
- Use virtualized lists only when needed.
- Cache static application assets.
- Make the app usable after the first successful load when practical.
- Consider a PWA manifest and service worker after the core MVP is stable.
- Never cache remote user-specific content because the MVP has no remote user data.

---

## 22. Suggested Project Structure

```text
src/
  app/
    page.tsx
    payments/
    income/
    planner/
    calendar/
    scenarios/
    backup/
    settings/
    privacy/
    layout.tsx
  components/
    ui/
    dashboard/
    payments/
    income/
    planner/
    calendar/
    scenarios/
    forms/
    charts/
    shared/
  db/
    database.ts
    schema.ts
    migrations.ts
    repositories/
  lib/
    calculations/
      amortization.ts
      allowance.ts
      cash-flow.ts
      fees.ts
      planner.ts
      recurrence.ts
      scenario-comparison.ts
      strategy-ranking.ts
    money/
      parse.ts
      format.ts
      arithmetic.ts
    backup/
      export.ts
      import.ts
      schemas.ts
    validation/
    dates/
    constants/
    errors/
  hooks/
  stores/
  types/
  tests/
    fixtures/
    factories/
public/
docs/
  decisions.md
```

---

## 23. Validation and Edge Cases

Explicitly handle:

- Partial payments
- Overpayments
- Undoing paid status
- Duplicate form submission
- Estimated payment later replaced with actual amount
- Due dates on the 29th, 30th, and 31st
- February and leap years
- Irregular income
- Zero-interest payment plans
- Fees greater than principal
- Zero-amount waived items
- Paused recurring payments
- Editing future occurrences after earlier ones are paid
- Negative opening cash
- Multiple payments due on one day
- Income expected after a deadline
- Currency mismatch
- Manual allocations exceeding available cash
- Browser refresh during editing
- IndexedDB unavailable
- Private browsing storage limitations
- Importing an old backup version
- Importing malformed or duplicate records
- Clearing all data accidentally
- Clock or time-zone changes

---

## 24. Testing Requirements

### Unit tests

Test:

- Money parsing and formatting
- Integer minor-unit arithmetic
- Rounding remainder allocation
- Zero-interest installments
- Amortization estimates
- Daily fees
- Recurrence generation
- Month-end overflow
- Remaining balance
- Daily allowance
- Cash-flow projection
- Every strategy
- Manual locked allocations
- Shortfall detection
- Scenario comparison
- Backup validation
- Import merge behavior

### IndexedDB integration tests

Test:

- Initial database creation
- Version migration
- Creating and editing a payment
- Generating payment occurrences
- Multi-table transaction rollback
- Backup export
- Backup import
- Replace import
- Merge import
- Reset all data

Use a test-compatible IndexedDB implementation such as `fake-indexeddb` where appropriate.

### End-to-end tests

1. Open the app with no account prompt.
2. Set available cash.
3. Add monthly rent.
4. Add a fixed installment.
5. Add expected salary.
6. Add a daily allowance.
7. Generate a plan.
8. Confirm a shortfall is detected correctly.
9. Mark a payment partially paid.
10. Recalculate the plan.
11. Compare two strategies.
12. Export a JSON backup.
13. Reset local data.
14. Import the backup.
15. Confirm restored totals match.
16. Print or export the monthly plan.

---

## 25. Development Seed Data

Provide a **Load sample plan** button for development and optional demonstration.

Sample data:

- Cash: ₱15,000
- Salary: ₱12,000 on the 15th and 30th
- Rent: ₱8,000 monthly
- Electricity: estimated ₱2,500
- Personal loan installment: ₱3,000
- BNPL installment: ₱1,500
- Family obligation: ₱2,000
- Daily food and transportation allowance
- One paid item
- One partially paid item
- One overdue item
- Two scenarios

Do not automatically load sample data for real users.

---

## 26. Environment Variables

The core MVP should not require secrets.

A minimal `.env.example` may contain:

```bash
NEXT_PUBLIC_APP_NAME=PayPlan
NEXT_PUBLIC_DEFAULT_CURRENCY=PHP
NEXT_PUBLIC_DEFAULT_LOCALE=en-PH
NEXT_PUBLIC_DEFAULT_TIMEZONE=Asia/Manila
```

Rules:

- Do not add Supabase variables.
- Do not add auth secrets.
- Do not add email-provider keys.
- Do not add service-role keys.
- Do not add analytics by default.
- Never commit real secrets if optional integrations are added later.

---

## 27. Error Types

Define typed errors:

- `ValidationError`
- `NotFoundError`
- `ConflictError`
- `CalculationError`
- `StorageError`
- `BackupFormatError`
- `UnsupportedBackupVersionError`

Use user-friendly messages.

Example result type:

```ts
type Result<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: {
        code: string;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };
```

---

## 28. Analytics and Observability

Analytics are optional and must be privacy preserving.

Allowed anonymous events:

- Setup completed
- Payment form opened
- Plan generated
- Scenario compared
- Backup exported
- Backup imported

Never send:

- Payment names
- Payee names
- Notes
- Exact amounts
- Exact balances
- Due dates
- Income values
- Backup contents

The application must work fully with analytics disabled.

---

## 29. Out of Scope for MVP

Do not implement:

- User accounts
- Authentication
- Cloud synchronization
- Multi-device automatic sync
- Bank connections
- E-wallet connections
- Payment processing
- Loan applications
- Credit scoring
- Financial adviser access
- Household collaboration
- Email or SMS reminders
- Push notifications
- Receipt OCR
- Statement OCR
- Full accounting ledger
- Automatic currency conversion
- Server-side personal-data storage
- Admin dashboard

---

## 30. Optional Post-MVP Features

After the no-account planner is stable, consider:

- Installable PWA
- Browser notifications with explicit permission
- Passphrase-encrypted backup files
- Optional user-chosen cloud backup
- Read-only shareable plan file
- Calendar file export
- Plain-language payment entry
- OCR from statements
- Multi-currency planning
- More detailed credit-card estimates

Any future cloud feature must remain optional. The basic planner must continue to work without an account.

---

## 31. Implementation Phases

### Phase 1 — Foundation

- Initialize Next.js and TypeScript
- Configure Tailwind and shadcn/ui
- Configure Dexie and IndexedDB schema
- Add application shell
- Add local-storage notice
- Add settings defaults
- Add linting, formatting, and tests

### Phase 2 — Core planning records

- Cash sources
- Payments
- Payment occurrences
- Income sources
- Income events
- Allowance budgets
- Dashboard summaries

### Phase 3 — Calculation engine

- Money helpers
- Recurrence generation
- Installment calculations
- Cash-flow projection
- Shortfall detection
- Calculation explanations

### Phase 4 — Planner

- Deadline-first strategy
- Essential-first strategy
- Minimums-first logic
- Lowest cash-flow risk
- Manual overrides
- Locked allocations
- Save active plan

### Phase 5 — Scenarios and views

- Smallest balance strategy
- Highest interest strategy
- Custom ordering
- Scenario comparison
- Calendar
- Cash-flow chart
- Print view

### Phase 6 — Backup and production readiness

- JSON export
- JSON import
- Replace and merge flows
- CSV export
- Reset all data
- Accessibility review
- Privacy review
- Performance review
- Deployment documentation

---

## 32. MVP Acceptance Criteria

The MVP is complete when:

1. The application opens without requesting an account.
2. The user can immediately enter available cash.
3. The user can add one-time, recurring, installment, and custom payments.
4. The user can add expected and received income.
5. The user can reserve a daily or weekly allowance.
6. The planner never allocates unavailable cash.
7. The planner clearly identifies shortfalls.
8. Expected income is visibly distinguished from received income.
9. The user can manually adjust and lock allocations.
10. The user can mark a payment fully or partially paid.
11. The dashboard updates after payment changes.
12. The user can compare at least two scenarios.
13. The calendar and list show consistent dates.
14. Data remains available after refreshing the browser.
15. No personal planning data is sent to a server.
16. The user can export a complete JSON backup.
17. The user can restore a valid backup.
18. The user can reset all local data.
19. Core calculations have passing tests.
20. The main flows work on common mobile and desktop sizes.
21. The app clearly warns about browser-only storage.
22. The disclaimer is visible in the planner and print view.

---

## 33. Claude Code Execution Instructions

When implementing this specification:

1. Read the entire file before generating code.
2. Create a task checklist and implement by phase.
3. Keep changes small and reviewable.
4. Do not add authentication.
5. Do not add Supabase.
6. Do not add a remote personal database.
7. Keep calculations independent from React and Dexie.
8. Use strict TypeScript and avoid `any`.
9. Validate every form and imported file with Zod.
10. Add concise comments only for non-obvious business rules.
11. Create a clear `README.md`.
12. Document IndexedDB schema versions and migrations.
13. Create `docs/decisions.md`.
14. Run linting, type checking, unit tests, and relevant end-to-end tests before declaring a phase complete.
15. Label every lender-specific calculation as an estimate unless the user supplied the authoritative amount.
16. Do not add paid services or trackers by default.
17. Preserve the core no-account experience in all implementation decisions.

---

## 34. Initial Deliverables

Claude Code should produce:

- Working Next.js application
- Responsive application shell
- IndexedDB database through Dexie
- Local data repositories
- Payment and income forms
- Payment occurrence generator
- Allowance planner
- Cash-flow calculation engine
- Payment-plan generator
- Scenario comparison
- Dashboard
- Calendar and agenda views
- JSON backup export
- JSON backup import
- CSV exports
- Print-friendly payment plan
- Automated tests
- `.env.example`
- `README.md`
- `docs/decisions.md`
- Vercel deployment instructions

---

## 35. Disclaimer Copy

Use wording similar to:

> PayPlan is a budgeting and payment-planning tool. Calculations, forecasts, and suggested schedules are estimates based on the information you enter. Always confirm balances, fees, interest, and due dates with the lender, biller, or payee. PayPlan does not provide financial, legal, tax, or credit advice.

Add a local-storage notice:

> Your plan is stored only in this browser. Clearing browser data, using private browsing, or moving to another device may remove it. Export a backup if you want to keep a copy.

---

## 36. Definition of Success

The application succeeds when a person can open it without an account and quickly understand:

- what needs to be paid,
- when each payment is due,
- what money will be available,
- how much should remain for daily needs,
- whether a deadline is at risk,
- and what realistic adjustment would improve the plan.
