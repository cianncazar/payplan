# Architecture Decision Log

## ADR-001 — No `src/` directory

**Date:** 2026-06-11

**Decision:** Keep `app/`, `components/`, `lib/`, `db/`, `hooks/`, `stores/`, `types/`, and `tests/` at the repository root rather than nesting them under `src/`.

**Reason:** The project was scaffolded without `src/`. The tsconfig `@/*` alias already maps to the repo root. Moving everything into `src/` would require updating every import path, the tsconfig alias, and the shadcn `components.json` aliases with no functional benefit. The Next.js App Router works identically in both layouts.

---

## ADR-002 — Integer minor units for all money

**Date:** 2026-06-11

**Decision:** Store every monetary value as an integer in the database and perform all intermediate calculations in minor units (centavos for PHP, cents for USD, etc.).

**Reason:** Binary floating-point arithmetic produces rounding errors that accumulate across installment schedules and cash-flow projections. Integer arithmetic is exact. The spec (§11) mandates this approach.

**Implication:** All display-layer formatting goes through `lib/money/format.ts`. All user input is parsed by `lib/money/parse.ts` before storage. Never store decimal strings or floats in the database.

---

## ADR-003 — Pure calculation layer

**Date:** 2026-06-11

**Decision:** All functions under `lib/calculations/` and `lib/money/` accept plain data arguments and return plain data. They have no imports from React, Dexie, Zustand, or any browser API.

**Reason:** Pure functions are trivially unit-tested with Vitest, can be run in any environment, and prevent coupling between business logic and storage/rendering layers. The spec (§12, §33-7) requires this.

---

## ADR-004 — Dexie for IndexedDB

**Date:** 2026-06-11

**Decision:** Use Dexie v4 with `dexie-react-hooks` for all structured local storage. Use `localStorage` only for lightweight, non-financial UI preferences (e.g., sidebar open/closed state).

**Reason:** Dexie provides typed table access, transactions, migrations, and a React hooks API. `fake-indexeddb` makes integration tests straightforward without a browser. The spec (§9) defines the schema and mandates Dexie.

---

## ADR-005 — Zustand for UI-only state

**Date:** 2026-06-11

**Decision:** Zustand stores hold only transient interface state (e.g., which drawer is open, active filter selections, form draft state). No financial record is stored in Zustand — persisted data belongs in IndexedDB via Dexie.

**Reason:** Keeps a clear boundary between ephemeral UI state and durable planning data. Avoids syncing problems between Zustand and IndexedDB.

---

## ADR-006 — shadcn/ui base-nova style

**Date:** 2026-06-11

**Decision:** The project uses the shadcn/ui `base-nova` style with Tailwind CSS v4 CSS-variable theming. Do not switch styles or override primitives in `components/ui/` directly — extend by composition.

**Reason:** The project was initialized with this style. Changing it would require regenerating all installed components.

---

## ADR-007 — No analytics by default

**Date:** 2026-06-11

**Decision:** No analytics SDK is installed in the MVP. If added later, it must be privacy-preserving and must never transmit payment names, amounts, payees, notes, or dates.

**Reason:** The spec (§19, §28) prohibits sending financial information to analytics. A no-analytics default is the safest starting point.

---

## ADR-008 — Vitest for unit and integration tests

**Date:** 2026-06-11

**Decision:** Use Vitest for unit tests (pure calculation functions) and IndexedDB integration tests (using `fake-indexeddb`). Use Playwright for end-to-end tests.

**Reason:** Vitest is already in devDependencies alongside `fake-indexeddb` and `@testing-library/react`. The testing stack is aligned with the spec (§24).

**Pending:** A `vitest.config.ts` must be created in Phase 1.

---

## ADR-009 — Default locale and currency

**Date:** 2026-06-11

**Decision:** Default currency `PHP`, locale `en-PH`, timezone `Asia/Manila`.

**Reason:** The spec (§8.1) specifies these defaults. The sample data (§25) is denominated in Philippine pesos. Stored in `AppSettings` in IndexedDB and overridable by the user in `/settings`.

---

## ADR-010 — Optional Google Drive backup (no backend)

**Date:** 2026-06-16

**Decision:** Add an optional, user-initiated Google Drive backup to the `/backup` page using the Google Identity Services (GIS) token flow and the Drive REST API directly from the browser. No backend proxy, no Supabase, no Firebase. The feature is gated by `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; if that variable is unset, the section shows a configuration notice and no Drive requests are made.

**Scope used:** `https://www.googleapis.com/auth/drive.appdata` — the narrowest available Drive scope. PayPlan can only read and write files it created itself inside the hidden `appDataFolder`; it cannot access any other files in the user's Drive.

**Token storage:** Access tokens are kept in `sessionStorage` (cleared when the tab closes). The last-backup timestamp is stored in `localStorage` under `payplan-drive-last-backup-at`. No token is persisted across sessions — the user must reconnect after closing the tab.

**Backup file:** A single file named `payplan-backup.json` is maintained in `appDataFolder`. On each backup the existing file is overwritten via a multipart PATCH request. The file is invisible to the user in the Drive UI.

**Why not an npm Drive client?** The GIS script is loaded dynamically from `accounts.google.com/gsi/client` (Google's recommended distribution) and Drive is accessed via `fetch` against the REST API. This avoids adding a runtime dependency and keeps the bundle small.

**Conflict resolution:** Restoring from Drive uses the same merge/replace UI and Zod-validated import pipeline as the local JSON import, so validation rules are never bypassed.

**No automatic uploads:** Every upload and restore requires an explicit user click. Nothing is uploaded silently in the background.
