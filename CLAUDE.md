@AGENTS.md

# PayPlan — Claude Code Instructions

## Spec

The authoritative specification is `docs/payment-planner-no-account-spec.md`. Read it completely before making changes to application features.

## Hard constraints

- No user accounts, authentication, or sign-in flows.
- No Supabase, no remote personal database, no Express server.
- All user data stays in IndexedDB (Dexie). Use `localStorage` only for lightweight UI preferences.
- All money values stored and calculated as **integer minor units** (centavos). Never use floating-point for final money calculations.
- Calculation functions must be **pure** — no React hooks, no Dexie calls inside `lib/calculations/` or `lib/money/`.
- Validate every form and every imported file with **Zod**.
- Use **strict TypeScript**. Never use `any`.
- **Mobile-first** layout with bottom navigation on small screens.

## Project layout

The project uses root-level folders, not a `src/` wrapper. The tsconfig `@/*` alias maps to the repo root.

```
app/              Next.js App Router pages and layouts
components/
  ui/             shadcn/ui primitives (do not edit directly)
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
  calculations/   Pure calculation functions (no React, no Dexie)
  money/          Money parsing, formatting, arithmetic
  backup/         Export, import, Zod schemas
  validation/
  dates/
  constants/
  errors/
hooks/
stores/           Zustand (UI-only state; persisted records go in IndexedDB)
types/
tests/
  fixtures/
  factories/
docs/
```

## Technology

| Concern | Package |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript 5 strict |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (base-nova style) |
| Icons | lucide-react |
| Forms | react-hook-form + @hookform/resolvers |
| Validation | zod |
| Dates | date-fns |
| Charts | recharts (lazy-loaded) |
| Local DB | dexie + dexie-react-hooks |
| State | zustand (UI only) |
| Drag and drop | @dnd-kit/* |
| Toasts | sonner |
| Theme | next-themes |
| CSV | papaparse |
| Testing | vitest + @testing-library/react + fake-indexeddb + playwright |

Do not install additional runtime dependencies without a clear reason documented in `docs/decisions.md`.

## Client components

Dexie, Zustand, React Hook Form, and any component using browser APIs must have `'use client'` at the top. Route pages and layouts are Server Components by default in Next.js 16.

## Money rules

- Store and calculate in integer **minor units** (e.g. ₱1.00 = `100`).
- Use helpers from `lib/money/` exclusively for arithmetic.
- Round only at defined boundaries. Add rounding remainders to the final installment.
- Zero is valid. Use explicit `=== 0` checks — never falsy checks for amounts.

## Calculation rules

All functions in `lib/calculations/` must be:

- Pure (no side effects, no I/O).
- Deterministic.
- Tested with Vitest.
- Never mutating input objects.

## Database

- Dexie database name: `PayPlanDB`.
- Version migrations must not delete existing local data.
- Wrap multi-table changes in Dexie transactions.
- Validate imported data with Zod before inserting.

## Testing

Run before declaring a phase complete:

```bash
npm run type-check   # tsc --noEmit
npm run lint
npm run test         # vitest
npm run test:e2e     # playwright (for E2E phases)
```

## Comments

Only comment non-obvious business rules, hidden constraints, or lender-specific estimate labeling. Do not comment what the code does.

## Phases

Implement one phase at a time. See `docs/decisions.md` for rationale on key choices.
