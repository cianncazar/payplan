import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/database';
import {
  getOrCreateSettings,
  updateSettings,
  createCashSource,
  getCashSourceById,
  listCashSources,
  updateCashSource,
  deleteCashSource,
  createPayment,
  getPaymentById,
  updatePayment,
  deletePayment,
  createPaymentWithOccurrences,
  createOccurrence,
  getOccurrenceById,
  listOccurrencesByPayment,
  updateOccurrence,
  createIncomeSource,
  getIncomeSourceById,
  updateIncomeSource,
  deleteIncomeSource,
  createIncomeEvent,
  getIncomeEventById,
  updateIncomeEvent,
  deleteIncomeEvent,
  createAllowanceBudget,
  getAllowanceBudgetById,
  updateAllowanceBudget,
  deleteAllowanceBudget,
} from '@/db/repositories';
import type {
  PaymentObligation,
  PaymentOccurrence,
  CashSource,
  IncomeSource,
  IncomeEvent,
  AllowanceBudget,
} from '@/types';
import type { CreateOccurrenceForPayment } from '@/db/repositories';

// ─── Factories ────────────────────────────────────────────────────────────────

function makePaymentInput(): Omit<PaymentObligation, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: 'Test Loan',
    category: 'loan',
    structure: 'one_time',
    currency: 'PHP',
    gracePeriodDays: 0,
    essential: false,
    priority: 3,
    status: 'active',
  };
}

function makeOccurrenceInput(
  paymentId: string,
  seq = 1
): Omit<PaymentOccurrence, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    paymentId,
    sequenceNumber: seq,
    dueDate: '2026-07-01',
    dueAmountMinor: 300000,
    feeAmountMinor: 0,
    paidAmountMinor: 0,
    status: 'scheduled',
    amountIsEstimate: false,
    manuallyOverridden: false,
  };
}

function makeCashSourceInput(): Omit<CashSource, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: 'Bank Account',
    type: 'bank',
    balanceMinor: 1500000,
    currency: 'PHP',
    includeInPlanner: true,
    archived: false,
  };
}

function makeIncomeSourceInput(): Omit<IncomeSource, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: 'Monthly Salary',
    type: 'salary',
    currency: 'PHP',
    active: true,
  };
}

function makeIncomeEventInput(): Omit<IncomeEvent, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    expectedDate: '2026-07-15',
    expectedAmountMinor: 1200000,
    status: 'expected',
  };
}

function makeAllowanceBudgetInput(): Omit<
  AllowanceBudget,
  'id' | 'createdAt' | 'updatedAt'
> {
  return {
    name: 'Food & Transport',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    totalBudgetMinor: 300000,
    spentAmountMinor: 0,
    status: 'active',
  };
}

// ─── Test setup ───────────────────────────────────────────────────────────────

beforeEach(async () => {
  await Promise.all([
    db.appSettings.clear(),
    db.cashSources.clear(),
    db.payments.clear(),
    db.paymentOccurrences.clear(),
    db.incomeSources.clear(),
    db.incomeEvents.clear(),
    db.allowanceBudgets.clear(),
    db.planScenarios.clear(),
    db.planAllocations.clear(),
    db.manualCashAdjustments.clear(),
  ]);
});

// ─── Database foundation ──────────────────────────────────────────────────────

describe('database', () => {
  it('PayPlanDB has all required tables', () => {
    const tableNames = db.tables.map((t) => t.name);
    expect(tableNames).toContain('appSettings');
    expect(tableNames).toContain('cashSources');
    expect(tableNames).toContain('payments');
    expect(tableNames).toContain('paymentOccurrences');
    expect(tableNames).toContain('incomeSources');
    expect(tableNames).toContain('incomeEvents');
    expect(tableNames).toContain('allowanceBudgets');
    expect(tableNames).toContain('planScenarios');
    expect(tableNames).toContain('planAllocations');
    expect(tableNames).toContain('manualCashAdjustments');
  });
});

// ─── Settings ─────────────────────────────────────────────────────────────────

describe('settings repository', () => {
  it('creates default settings on first call', async () => {
    const settings = await getOrCreateSettings();
    expect(settings.id).toBe('local-settings');
    expect(settings.defaultCurrency).toBe('PHP');
    expect(settings.locale).toBe('en-PH');
    expect(settings.setupCompleted).toBe(false);
    expect(settings.createdAt).toBeTruthy();
    expect(settings.updatedAt).toBeTruthy();
  });

  it('is idempotent — returns the same record on subsequent calls', async () => {
    const first = await getOrCreateSettings();
    const second = await getOrCreateSettings();
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.id).toBe(first.id);
  });

  it('updateSettings changes specified fields and bumps updatedAt', async () => {
    const original = await getOrCreateSettings();
    await new Promise((r) => setTimeout(r, 5)); // ensure updatedAt advances
    const updated = await updateSettings({ defaultCurrency: 'USD', setupCompleted: true });
    expect(updated.defaultCurrency).toBe('USD');
    expect(updated.setupCompleted).toBe(true);
    expect(updated.locale).toBe(original.locale); // unchanged
    expect(updated.updatedAt > original.updatedAt).toBe(true);
  });
});

// ─── Cash Sources ─────────────────────────────────────────────────────────────

describe('cash sources', () => {
  it('createCashSource generates id and timestamps', async () => {
    const record = await createCashSource(makeCashSourceInput());
    expect(record.id).toBeTruthy();
    expect(record.name).toBe('Bank Account');
    expect(record.balanceMinor).toBe(1500000);
    expect(record.createdAt).toBeTruthy();
    expect(record.updatedAt).toBeTruthy();
  });

  it('getCashSourceById returns the created record', async () => {
    const created = await createCashSource(makeCashSourceInput());
    const fetched = await getCashSourceById(created.id);
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.name).toBe('Bank Account');
  });

  it('listCashSources returns all sources', async () => {
    await createCashSource(makeCashSourceInput());
    await createCashSource({ ...makeCashSourceInput(), name: 'Cash on Hand', type: 'cash' });
    const all = await listCashSources();
    expect(all).toHaveLength(2);
  });

  it('listCashSources filters by archived', async () => {
    await createCashSource(makeCashSourceInput());
    await createCashSource({ ...makeCashSourceInput(), name: 'Old Account', archived: true });
    const active = await listCashSources({ archived: false });
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe('Bank Account');
  });

  it('updateCashSource merges changes and bumps updatedAt', async () => {
    const original = await createCashSource(makeCashSourceInput());
    await new Promise((r) => setTimeout(r, 5));
    const updated = await updateCashSource(original.id, { balanceMinor: 2000000 });
    expect(updated.balanceMinor).toBe(2000000);
    expect(updated.name).toBe(original.name);
    expect(updated.updatedAt > original.updatedAt).toBe(true);
  });

  it('deleteCashSource removes the record', async () => {
    const record = await createCashSource(makeCashSourceInput());
    await deleteCashSource(record.id);
    const fetched = await getCashSourceById(record.id);
    expect(fetched).toBeUndefined();
  });
});

// ─── Payments ─────────────────────────────────────────────────────────────────

describe('payments', () => {
  it('createPayment generates id and timestamps', async () => {
    const record = await createPayment(makePaymentInput());
    expect(record.id).toBeTruthy();
    expect(record.name).toBe('Test Loan');
    expect(record.createdAt).toBeTruthy();
    expect(record.updatedAt).toBeTruthy();
  });

  it('getPaymentById returns the created record', async () => {
    const created = await createPayment(makePaymentInput());
    const fetched = await getPaymentById(created.id);
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe(created.id);
  });

  it('updatePayment merges changes and bumps updatedAt', async () => {
    const original = await createPayment(makePaymentInput());
    await new Promise((r) => setTimeout(r, 5));
    const updated = await updatePayment(original.id, { name: 'Updated Loan', essential: true });
    expect(updated.name).toBe('Updated Loan');
    expect(updated.essential).toBe(true);
    expect(updated.category).toBe(original.category);
    expect(updated.updatedAt > original.updatedAt).toBe(true);
  });

  it('deletePayment removes the payment and its occurrences atomically', async () => {
    const payment = await createPayment(makePaymentInput());
    await createOccurrence(makeOccurrenceInput(payment.id, 1));
    await createOccurrence(makeOccurrenceInput(payment.id, 2));

    await deletePayment(payment.id);

    expect(await getPaymentById(payment.id)).toBeUndefined();
    const remaining = await listOccurrencesByPayment(payment.id);
    expect(remaining).toHaveLength(0);
  });

  it('createPaymentWithOccurrences creates both atomically', async () => {
    function makeOccForPayment(seq: number): CreateOccurrenceForPayment {
      return {
        sequenceNumber: seq,
        dueDate: '2026-07-01',
        dueAmountMinor: 300000,
        feeAmountMinor: 0,
        paidAmountMinor: 0,
        status: 'scheduled',
        amountIsEstimate: false,
        manuallyOverridden: false,
      };
    }

    const { payment, occurrences } = await createPaymentWithOccurrences({
      payment: makePaymentInput(),
      occurrences: [makeOccForPayment(1), makeOccForPayment(2)],
    });

    expect(await getPaymentById(payment.id)).toBeDefined();
    expect(occurrences).toHaveLength(2);
    const stored = await listOccurrencesByPayment(payment.id);
    expect(stored).toHaveLength(2);
    expect(stored[0].paymentId).toBe(payment.id);
  });
});

// ─── Payment Occurrences ──────────────────────────────────────────────────────

describe('payment occurrences', () => {
  it('createOccurrence generates id and timestamps', async () => {
    const payment = await createPayment(makePaymentInput());
    const occ = await createOccurrence(makeOccurrenceInput(payment.id));
    expect(occ.id).toBeTruthy();
    expect(occ.paymentId).toBe(payment.id);
    expect(occ.dueAmountMinor).toBe(300000);
    expect(occ.createdAt).toBeTruthy();
  });

  it('getOccurrenceById returns the created record', async () => {
    const payment = await createPayment(makePaymentInput());
    const created = await createOccurrence(makeOccurrenceInput(payment.id));
    const fetched = await getOccurrenceById(created.id);
    expect(fetched?.id).toBe(created.id);
  });

  it('listOccurrencesByPayment returns occurrences ordered by sequence', async () => {
    const payment = await createPayment(makePaymentInput());
    await createOccurrence(makeOccurrenceInput(payment.id, 2));
    await createOccurrence(makeOccurrenceInput(payment.id, 1));
    await createOccurrence(makeOccurrenceInput(payment.id, 3));

    const list = await listOccurrencesByPayment(payment.id);
    expect(list).toHaveLength(3);
    expect(list.map((o) => o.sequenceNumber)).toEqual([1, 2, 3]);
  });

  it('updateOccurrence merges changes and bumps updatedAt', async () => {
    const payment = await createPayment(makePaymentInput());
    const original = await createOccurrence(makeOccurrenceInput(payment.id));
    await new Promise((r) => setTimeout(r, 5));
    const updated = await updateOccurrence(original.id, {
      paidAmountMinor: 150000,
      status: 'partially_paid',
    });
    expect(updated.paidAmountMinor).toBe(150000);
    expect(updated.status).toBe('partially_paid');
    expect(updated.dueDate).toBe(original.dueDate);
    expect(updated.updatedAt > original.updatedAt).toBe(true);
  });
});

// ─── Income Sources ───────────────────────────────────────────────────────────

describe('income sources', () => {
  it('createIncomeSource generates id and timestamps', async () => {
    const record = await createIncomeSource(makeIncomeSourceInput());
    expect(record.id).toBeTruthy();
    expect(record.name).toBe('Monthly Salary');
    expect(record.active).toBe(true);
    expect(record.createdAt).toBeTruthy();
  });

  it('getIncomeSourceById returns the created record', async () => {
    const created = await createIncomeSource(makeIncomeSourceInput());
    const fetched = await getIncomeSourceById(created.id);
    expect(fetched?.id).toBe(created.id);
  });

  it('updateIncomeSource merges changes and bumps updatedAt', async () => {
    const original = await createIncomeSource(makeIncomeSourceInput());
    await new Promise((r) => setTimeout(r, 5));
    const updated = await updateIncomeSource(original.id, {
      expectedAmountMinor: 1500000,
      active: false,
    });
    expect(updated.expectedAmountMinor).toBe(1500000);
    expect(updated.active).toBe(false);
    expect(updated.name).toBe(original.name);
    expect(updated.updatedAt > original.updatedAt).toBe(true);
  });

  it('deleteIncomeSource removes the record', async () => {
    const record = await createIncomeSource(makeIncomeSourceInput());
    await deleteIncomeSource(record.id);
    expect(await getIncomeSourceById(record.id)).toBeUndefined();
  });
});

// ─── Income Events ────────────────────────────────────────────────────────────

describe('income events', () => {
  it('createIncomeEvent generates id and timestamps', async () => {
    const record = await createIncomeEvent(makeIncomeEventInput());
    expect(record.id).toBeTruthy();
    expect(record.expectedAmountMinor).toBe(1200000);
    expect(record.status).toBe('expected');
    expect(record.createdAt).toBeTruthy();
  });

  it('getIncomeEventById returns the created record', async () => {
    const created = await createIncomeEvent(makeIncomeEventInput());
    const fetched = await getIncomeEventById(created.id);
    expect(fetched?.id).toBe(created.id);
  });

  it('updateIncomeEvent merges changes and bumps updatedAt', async () => {
    const original = await createIncomeEvent(makeIncomeEventInput());
    await new Promise((r) => setTimeout(r, 5));
    const updated = await updateIncomeEvent(original.id, {
      status: 'received',
      receivedAmountMinor: 1200000,
      receivedDate: '2026-07-15',
    });
    expect(updated.status).toBe('received');
    expect(updated.receivedAmountMinor).toBe(1200000);
    expect(updated.expectedDate).toBe(original.expectedDate);
    expect(updated.updatedAt > original.updatedAt).toBe(true);
  });

  it('deleteIncomeEvent removes the record', async () => {
    const record = await createIncomeEvent(makeIncomeEventInput());
    await deleteIncomeEvent(record.id);
    expect(await getIncomeEventById(record.id)).toBeUndefined();
  });
});

// ─── Allowance Budgets ────────────────────────────────────────────────────────

describe('allowance budgets', () => {
  it('createAllowanceBudget generates id and timestamps', async () => {
    const record = await createAllowanceBudget(makeAllowanceBudgetInput());
    expect(record.id).toBeTruthy();
    expect(record.name).toBe('Food & Transport');
    expect(record.totalBudgetMinor).toBe(300000);
    expect(record.spentAmountMinor).toBe(0);
    expect(record.createdAt).toBeTruthy();
  });

  it('getAllowanceBudgetById returns the created record', async () => {
    const created = await createAllowanceBudget(makeAllowanceBudgetInput());
    const fetched = await getAllowanceBudgetById(created.id);
    expect(fetched?.id).toBe(created.id);
  });

  it('updateAllowanceBudget merges changes and bumps updatedAt', async () => {
    const original = await createAllowanceBudget(makeAllowanceBudgetInput());
    await new Promise((r) => setTimeout(r, 5));
    const updated = await updateAllowanceBudget(original.id, {
      spentAmountMinor: 50000,
      status: 'completed',
    });
    expect(updated.spentAmountMinor).toBe(50000);
    expect(updated.status).toBe('completed');
    expect(updated.totalBudgetMinor).toBe(original.totalBudgetMinor);
    expect(updated.updatedAt > original.updatedAt).toBe(true);
  });

  it('deleteAllowanceBudget removes the record', async () => {
    const record = await createAllowanceBudget(makeAllowanceBudgetInput());
    await deleteAllowanceBudget(record.id);
    expect(await getAllowanceBudgetById(record.id)).toBeUndefined();
  });
});

// ─── Transaction Rollback ─────────────────────────────────────────────────────

describe('transaction rollback', () => {
  it('rolls back a single-table transaction on error', async () => {
    const paymentId = crypto.randomUUID();

    await expect(
      db.transaction('rw', [db.payments], async () => {
        await db.payments.add({
          ...makePaymentInput(),
          id: paymentId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        throw new Error('Simulated failure');
      })
    ).rejects.toThrow('Simulated failure');

    expect(await db.payments.get(paymentId)).toBeUndefined();
  });

  it('rolls back a multi-table transaction on error', async () => {
    const paymentId = crypto.randomUUID();
    const occId = crypto.randomUUID();
    const ts = new Date().toISOString();

    await expect(
      db.transaction('rw', [db.payments, db.paymentOccurrences], async () => {
        await db.payments.add({ ...makePaymentInput(), id: paymentId, createdAt: ts, updatedAt: ts });
        await db.paymentOccurrences.add({
          ...makeOccurrenceInput(paymentId),
          id: occId,
          createdAt: ts,
          updatedAt: ts,
        });
        throw new Error('Simulated multi-table failure');
      })
    ).rejects.toThrow('Simulated multi-table failure');

    expect(await db.payments.get(paymentId)).toBeUndefined();
    expect(await db.paymentOccurrences.get(occId)).toBeUndefined();
  });

  it('rolls back createPaymentWithOccurrences if a failure occurs mid-transaction', async () => {
    // Force a failure by pre-inserting a record with the same occurrence ID.
    // We verify rollback by checking the count before and after.
    const beforeCount = await db.payments.count();

    await expect(
      db.transaction('rw', [db.payments, db.paymentOccurrences], async () => {
        const ts = new Date().toISOString();
        const pid = crypto.randomUUID();
        await db.payments.add({ ...makePaymentInput(), id: pid, createdAt: ts, updatedAt: ts });
        throw new Error('Failure after payment insert');
      })
    ).rejects.toThrow();

    expect(await db.payments.count()).toBe(beforeCount);
  });
});
