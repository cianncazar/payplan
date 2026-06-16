# PayPlan

A responsive, privacy-first payment-planning web app. Open it, enter your available cash, add upcoming payments and expected income, and get a clear picture of what you can afford and when.

No account. No sign-in. No bank connection. All data stays in your browser.

---

## What it does

PayPlan answers five practical questions:

1. What payments are coming up?
2. How much money will be available before each due date?
3. Which payments should be prioritized?
4. Will enough money remain for daily needs?
5. Where will a shortfall occur?

It supports one-time bills, recurring payments, installment schedules, buy-now-pay-later plans, loans, credit cards, and custom payment schedules. Income can be entered as salary, remittance, freelance, bonus, or any custom source.

---

## Privacy notice

> Your plan is stored only in this browser. Clearing browser data, using private browsing, or moving to another device may remove it. Export a backup if you want to keep a copy.

No financial data is sent to a server. There is no account, no cloud sync, and no analytics that transmit personal planning information.

---

## Disclaimer

> PayPlan is a budgeting and payment-planning tool. Calculations, forecasts, and suggested schedules are estimates based on the information you enter. Always confirm balances, fees, interest, and due dates with the lender, biller, or payee. PayPlan does not provide financial, legal, tax, or credit advice.

---

## Tech stack

| Concern | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui |
| Local database | IndexedDB via Dexie v4 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| State | Zustand (UI only) |
| Testing | Vitest + React Testing Library + Playwright |

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment variables

Copy `.env.example` to `.env.local`. No secrets are required for the core app.

```bash
cp .env.example .env.local
```

---

## Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript check without emit |
| `npm run test` | Vitest unit and integration tests |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run format` | Prettier |

---

## Project structure

```
app/              Next.js App Router pages
components/       React components
  ui/             shadcn/ui primitives
  dashboard/
  payments/
  income/
  planner/
  calendar/
  scenarios/
  forms/
  charts/
  shared/
db/               Dexie database, schema, migrations, repositories
lib/
  calculations/   Pure calculation functions
  money/          Money parsing, formatting, arithmetic
  backup/         JSON export and import
  validation/
  dates/
  constants/
  errors/
hooks/
stores/           Zustand UI state
types/
tests/
docs/
  payment-planner-no-account-spec.md   Full product specification
  decisions.md                          Architecture decision log
```

---

## Routes

| Route | Description |
|---|---|
| `/` | Dashboard and planning summary |
| `/payments` | Upcoming payment obligations |
| `/income` | Expected income |
| `/planner` | Generated payment plan |
| `/calendar` | Timeline and calendar view |
| `/scenarios` | Compare alternative plans |
| `/backup` | Export, import, and reset |
| `/settings` | Currency, locale, theme, and defaults |
| `/privacy` | Local-storage explanation and disclaimer |

---

## Data storage

All planning data is stored in an IndexedDB database named `PayPlanDB` using Dexie. Money values are stored as **integer minor units** (e.g. ₱1.00 = `100`). JSON backup files can be exported and imported from the `/backup` page.

---

## Deploying

The app has no server-side personal data and can be deployed to any static-compatible host.

**Vercel (recommended):**

```bash
npm run build
vercel deploy
```

Set the `NEXT_PUBLIC_*` environment variables from `.env.example` in your Vercel project settings if you want to override the defaults.

---

## Implementation phases

| Phase | Description |
|---|---|
| 1 | Foundation — shell, Dexie schema, settings defaults, tooling |
| 2 | Core records — cash, payments, income, allowance, dashboard |
| 3 | Calculation engine — money helpers, recurrence, cash-flow, shortfalls |
| 4 | Planner — strategies, manual overrides, locked allocations |
| 5 | Scenarios and views — comparison, calendar, charts, print |
| 6 | Backup and production readiness — export, import, reset, a11y, perf |

See `docs/decisions.md` for architecture decisions.
