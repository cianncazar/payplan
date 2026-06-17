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

### Optional: Google Drive backup

PayPlan can back up your plan to your own Google Drive. The feature is entirely opt-in and only activates when you click **Connect Google Drive** on the `/backup` page.

#### 1. Create a Google Cloud project

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com) and create a new project (e.g. `payplan`).
2. In the left menu go to **APIs & Services → Library** and enable the **Google Drive API**.

#### 2. Configure the OAuth consent screen

1. Go to **APIs & Services → OAuth consent screen**.
2. Choose **External** (or Internal if this is a personal Workspace app).
3. Fill in the required fields:
   - App name: `PayPlan`
   - User support email: your email
   - Developer contact email: your email
4. On the **Scopes** step, click **Add or Remove Scopes** and add:
   ```
   https://www.googleapis.com/auth/drive.appdata
   ```
   This is the narrowest Drive scope — PayPlan can only read and write files it created itself. It cannot access the rest of your Drive.
5. Add any test users if the app is in **Testing** mode (required until you publish).
6. Save and continue.

#### 3. Create an OAuth 2.0 Client ID

1. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Name: `PayPlan Web`.
4. Under **Authorised redirect URIs** add:
   - `http://localhost:3000/api/auth/google/callback` (local development)
   - `https://your-production-domain.com/api/auth/google/callback` (production)

   Replace `your-production-domain.com` with your actual Vercel URL (e.g. `payplan.vercel.app`).
5. Click **Create** and copy both the **Client ID** and **Client Secret**.

#### 4. Set environment variables

**Local development** — add to `.env.local`:

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
# Optional — defaults to http://localhost:3000
# NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Vercel deployment** — add in **Project → Settings → Environment Variables**:

| Variable | Value | Visibility |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client ID from step 3 | Public (client + server) |
| `GOOGLE_CLIENT_SECRET` | Client secret from step 3 | **Secret (server only)** |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` | Public — set this if the OAuth redirect URL is wrong |

> **Important:** Do not prefix `GOOGLE_CLIENT_SECRET` with `NEXT_PUBLIC_`. Doing so would expose it in the browser bundle.

Restart the dev server (or redeploy on Vercel). The **Google Drive Backup** section will appear on the `/backup` page.

#### How the OAuth flow works

PayPlan uses the **PKCE Authorization Code** flow (not the legacy implicit flow):

1. You click **Connect Google Drive** → browser redirects to Google's sign-in page.
2. After you approve, Google redirects to `/api/auth/google/callback`.
3. The server-side callback exchanges the authorization code for an access token using `GOOGLE_CLIENT_SECRET`.
4. The token is placed in a short-lived cookie and the browser is redirected back to `/backup`.
5. The backup page picks up the token, moves it to `sessionStorage`, and clears the cookie.

#### Security notes

- The client secret is only used on the server; it is never included in the browser bundle.
- The access token is stored in `sessionStorage` only — cleared when the browser tab closes.
- No token is persisted to disk or sent to any server controlled by PayPlan.
- The Drive scope `drive.appdata` is hidden from the user's Drive UI; files are not visible in **My Drive**.
- PayPlan never uploads automatically. Every backup and restore requires an explicit click.

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

The core app needs no environment variables. To enable Google Drive backup, set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in **Project → Settings → Environment Variables** — see the [Google Drive setup](#optional-google-drive-backup) section above.

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
