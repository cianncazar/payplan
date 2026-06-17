'use client';

import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { db } from '@/db/database';

function uid() { return crypto.randomUUID(); }
function now() { return new Date().toISOString(); }
function iso(d: Date) { return format(d, 'yyyy-MM-dd'); }

export async function isDatabaseEmpty(): Promise<boolean> {
  const count = await db.cashSources.count();
  return count === 0;
}

export async function seedSampleData(): Promise<void> {
  const today = new Date();
  const todayStr = iso(today);
  const yr = today.getFullYear();
  const mo = today.getMonth(); // 0-indexed
  const t = now();

  // Returns a YYYY-MM-DD string for day D of an offset month (0=current, 1=next)
  function due(day: number, monthOffset = 0): string {
    return iso(new Date(yr, mo + monthOffset, day));
  }

  // Was this date already past today?
  function past(dateStr: string): boolean { return dateStr < todayStr; }

  // ─── IDs ────────────────────────────────────────────────────────────────────
  const bpiId = uid();
  const gcashId = uid();
  const cashId = uid();

  const rentId = uid();
  const electricId = uid();
  const internetId = uid();
  const spotifyId = uid();
  const netflixId = uid();
  const ccId = uid();

  const salaryId = uid();

  const emergencyId = uid();
  const vacationId = uid();
  const laptopId = uid();

  // ─── Payment occurrence builder ──────────────────────────────────────────────
  function occurrence(
    paymentId: string,
    seq: number,
    dueDateStr: string,
    dueAmountMinor: number,
    minimumAmountMinor?: number
  ) {
    const paid = past(dueDateStr);
    return {
      id: uid(),
      paymentId,
      sequenceNumber: seq,
      dueDate: dueDateStr,
      dueAmountMinor,
      minimumAmountMinor,
      feeAmountMinor: 0,
      paidAmountMinor: paid ? dueAmountMinor : 0,
      paidDate: paid ? dueDateStr : undefined,
      status: (paid ? 'paid' : 'scheduled') as 'paid' | 'scheduled',
      amountIsEstimate: false,
      manuallyOverridden: false,
      createdAt: t,
      updatedAt: t,
    };
  }

  await db.transaction(
    'rw',
    [
      db.cashSources,
      db.payments,
      db.paymentOccurrences,
      db.incomeSources,
      db.incomeEvents,
      db.savingsGoals,
      db.savingsDeposits,
      db.allowanceBudgets,
    ],
    async () => {
      // ── Cash sources ──────────────────────────────────────────────────────────
      await db.cashSources.bulkAdd([
        { id: bpiId,   name: 'BPI Savings',   type: 'bank',    balanceMinor: 1_500_000, currency: 'PHP', includeInPlanner: true,  archived: false, createdAt: t, updatedAt: t },
        { id: gcashId, name: 'GCash',          type: 'ewallet', balanceMinor:   350_000, currency: 'PHP', includeInPlanner: true,  archived: false, createdAt: t, updatedAt: t },
        { id: cashId,  name: 'Cash on hand',   type: 'cash',    balanceMinor:   200_000, currency: 'PHP', includeInPlanner: false, archived: false, createdAt: t, updatedAt: t },
      ]);

      // ── Payment obligations ───────────────────────────────────────────────────
      await db.payments.bulkAdd([
        {
          id: rentId, name: 'Monthly Rent', payee: 'Landlord', category: 'rent',
          structure: 'fixed_recurring', currency: 'PHP',
          statedInstallmentMinor: 800_000,
          firstDueDate: due(1), recurrence: { frequency: 'monthly', interval: 1, daysOfMonth: [1], monthDayOverflow: 'last_day', endType: 'never' },
          gracePeriodDays: 5, essential: true, priority: 1, status: 'active', createdAt: t, updatedAt: t,
        },
        {
          id: electricId, name: 'Meralco Electric', payee: 'Meralco', category: 'utility',
          structure: 'variable_recurring', currency: 'PHP',
          statedInstallmentMinor: 250_000,
          firstDueDate: due(15), recurrence: { frequency: 'monthly', interval: 1, daysOfMonth: [15], monthDayOverflow: 'last_day', endType: 'never' },
          gracePeriodDays: 3, essential: true, priority: 2, status: 'active', createdAt: t, updatedAt: t,
        },
        {
          id: internetId, name: 'PLDT Internet', payee: 'PLDT', category: 'utility',
          structure: 'fixed_recurring', currency: 'PHP',
          statedInstallmentMinor: 129_900,
          firstDueDate: due(10), recurrence: { frequency: 'monthly', interval: 1, daysOfMonth: [10], monthDayOverflow: 'last_day', endType: 'never' },
          gracePeriodDays: 5, essential: true, priority: 2, status: 'active', createdAt: t, updatedAt: t,
        },
        {
          id: spotifyId, name: 'Spotify', payee: 'Spotify', category: 'subscription',
          structure: 'fixed_recurring', currency: 'PHP',
          statedInstallmentMinor: 14_900,
          firstDueDate: due(5), recurrence: { frequency: 'monthly', interval: 1, daysOfMonth: [5], monthDayOverflow: 'last_day', endType: 'never' },
          gracePeriodDays: 0, essential: false, priority: 4, status: 'active', createdAt: t, updatedAt: t,
        },
        {
          id: netflixId, name: 'Netflix', payee: 'Netflix', category: 'subscription',
          structure: 'fixed_recurring', currency: 'PHP',
          statedInstallmentMinor: 24_900,
          firstDueDate: due(12), recurrence: { frequency: 'monthly', interval: 1, daysOfMonth: [12], monthDayOverflow: 'last_day', endType: 'never' },
          gracePeriodDays: 0, essential: false, priority: 4, status: 'active', createdAt: t, updatedAt: t,
        },
        {
          id: ccId, name: 'BPI Credit Card', payee: 'BPI', category: 'credit_card',
          structure: 'revolving_credit', currency: 'PHP',
          currentBalanceMinor: 2_500_000, minimumPaymentMinor: 350_000,
          annualInterestRate: '24',
          firstDueDate: due(25), recurrence: { frequency: 'monthly', interval: 1, daysOfMonth: [25], monthDayOverflow: 'last_day', endType: 'never' },
          gracePeriodDays: 0, essential: false, priority: 3, status: 'active', createdAt: t, updatedAt: t,
        },
      ]);

      // ── Payment occurrences (current month + next month) ──────────────────────
      await db.paymentOccurrences.bulkAdd([
        occurrence(rentId,     1, due(1),  800_000),          occurrence(rentId,     2, due(1,  1), 800_000),
        occurrence(electricId, 1, due(15), 250_000),          occurrence(electricId, 2, due(15, 1), 250_000),
        occurrence(internetId, 1, due(10), 129_900),          occurrence(internetId, 2, due(10, 1), 129_900),
        occurrence(spotifyId,  1, due(5),   14_900),          occurrence(spotifyId,  2, due(5,  1),  14_900),
        occurrence(netflixId,  1, due(12),  24_900),          occurrence(netflixId,  2, due(12, 1),  24_900),
        occurrence(ccId,       1, due(25), 350_000, 350_000), occurrence(ccId,       2, due(25, 1), 350_000, 350_000),
      ]);

      // ── Income source ─────────────────────────────────────────────────────────
      await db.incomeSources.add({
        id: salaryId, name: 'Monthly Salary', type: 'salary', currency: 'PHP',
        expectedAmountMinor: 3_500_000,
        recurrence: { frequency: 'semimonthly', interval: 1, daysOfMonth: [5, 20], monthDayOverflow: 'last_day', endType: 'never' },
        active: true, createdAt: t, updatedAt: t,
      });

      // ── Income events (last 2 months + current month) ─────────────────────────
      const incomeEvents = [-2, -1, 0].flatMap((offset) => {
        const d5  = iso(new Date(yr, mo + offset, 5));
        const d20 = iso(new Date(yr, mo + offset, 20));
        const bothPast = past(d5) && past(d20);
        const firstPast = past(d5);
        return [
          {
            id: uid(), incomeSourceId: salaryId, cashSourceId: bpiId,
            expectedDate: d5,
            receivedDate: firstPast ? d5 : undefined,
            expectedAmountMinor: 1_750_000,
            receivedAmountMinor: firstPast ? 1_750_000 : undefined,
            status: (firstPast ? 'received' : 'expected') as 'received' | 'expected',
            createdAt: t, updatedAt: t,
          },
          {
            id: uid(), incomeSourceId: salaryId, cashSourceId: bpiId,
            expectedDate: d20,
            receivedDate: bothPast ? d20 : undefined,
            expectedAmountMinor: 1_750_000,
            receivedAmountMinor: bothPast ? 1_750_000 : undefined,
            status: (bothPast ? 'received' : 'expected') as 'received' | 'expected',
            createdAt: t, updatedAt: t,
          },
        ];
      });
      await db.incomeEvents.bulkAdd(incomeEvents);

      // ── Savings goals ─────────────────────────────────────────────────────────
      await db.savingsGoals.bulkAdd([
        {
          id: emergencyId, name: 'Emergency Fund',
          targetAmountMinor: 5_000_000, savedAmountMinor: 1_200_000,
          targetDate: iso(new Date(yr + 1, 0, 1)),
          currency: 'PHP', status: 'active',
          notes: '3 months of living expenses',
          createdAt: t, updatedAt: t,
        },
        {
          id: vacationId, name: 'Palawan Vacation',
          targetAmountMinor: 3_000_000, savedAmountMinor: 750_000,
          targetDate: iso(new Date(yr, 11, 20)),
          currency: 'PHP', status: 'active',
          createdAt: t, updatedAt: t,
        },
        {
          id: laptopId, name: 'New Laptop',
          targetAmountMinor: 4_500_000, savedAmountMinor: 4_500_000,
          currency: 'PHP', status: 'completed',
          createdAt: t, updatedAt: t,
        },
      ]);

      // ── Savings deposits ──────────────────────────────────────────────────────
      await db.savingsDeposits.bulkAdd([
        // Emergency fund — monthly ₱300 for the past 4 months
        ...[-3, -2, -1, 0].map((offset) => ({
          id: uid(), goalId: emergencyId, amountMinor: 300_000,
          date: iso(new Date(yr, mo + offset, 1)),
          notes: 'Monthly allocation',
          createdAt: t, updatedAt: t,
        })),
        // Vacation — ₱250 for past 3 months
        ...[-2, -1, 0].map((offset) => ({
          id: uid(), goalId: vacationId, amountMinor: 250_000,
          date: iso(new Date(yr, mo + offset, 15)),
          createdAt: t, updatedAt: t,
        })),
        // Laptop — 3 lump-sum deposits, completed
        { id: uid(), goalId: laptopId, amountMinor: 1_500_000, date: iso(new Date(yr, mo - 6, 1)), createdAt: t, updatedAt: t },
        { id: uid(), goalId: laptopId, amountMinor: 1_500_000, date: iso(new Date(yr, mo - 3, 1)), createdAt: t, updatedAt: t },
        { id: uid(), goalId: laptopId, amountMinor: 1_500_000, date: iso(new Date(yr, mo - 1, 1)), createdAt: t, updatedAt: t },
      ]);

      // ── Allowance budget (current month) ──────────────────────────────────────
      const monthStart = startOfMonth(today);
      const monthEnd   = endOfMonth(today);
      const dayOfMonth = today.getDate();
      const daysInMonth = monthEnd.getDate();
      await db.allowanceBudgets.add({
        id: uid(), name: 'Monthly Allowance',
        startDate: iso(monthStart), endDate: iso(monthEnd),
        totalBudgetMinor: 950_000,
        dailyTargetMinor: Math.round(950_000 / daysInMonth),
        spentAmountMinor: Math.round(950_000 * (dayOfMonth / daysInMonth) * 0.72),
        status: 'active', createdAt: t, updatedAt: t,
      });
    }
  );
}
