import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AllowanceBudgetForm } from '@/components/allowance/allowance-budget-form';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function setup(props?: Partial<React.ComponentProps<typeof AllowanceBudgetForm>>) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();
  const utils = render(
    <AllowanceBudgetForm onSave={onSave} onCancel={onCancel} {...props} />
  );
  return { onSave, onCancel, ...utils };
}

describe('AllowanceBudgetForm', () => {
  it('renders name, start and end date fields', () => {
    setup();
    expect(screen.getByLabelText(/budget name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
  });

  it('shows an error when name is empty', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /add budget/i }));
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const { onCancel } = setup();
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('submits with valid total budget data', async () => {
    const { onSave } = setup();
    await userEvent.clear(screen.getByLabelText(/budget name/i));
    await userEvent.type(screen.getByLabelText(/budget name/i), 'Food Budget');
    await userEvent.type(screen.getByLabelText(/start date/i), '2026-07-01');
    await userEvent.type(screen.getByLabelText(/end date/i), '2026-07-31');
    await userEvent.click(screen.getByRole('button', { name: /add budget/i }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledOnce();
    });
    const saved = onSave.mock.calls[0][0];
    expect(saved.name).toBe('Food Budget');
    expect(saved.startDate).toBe('2026-07-01');
    expect(saved.endDate).toBe('2026-07-31');
    expect(saved.status).toBe('active');
  });

  it('shows Save changes when editing existing budget', () => {
    setup({
      initial: {
        id: '1',
        name: 'Daily Allowance',
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        totalBudgetMinor: 100000,
        spentAmountMinor: 20000,
        status: 'active',
        createdAt: '',
        updatedAt: '',
      },
    });
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Daily Allowance')).toBeInTheDocument();
  });

  it('shows days in range when both dates are filled', async () => {
    setup();
    await userEvent.type(screen.getByLabelText(/start date/i), '2026-07-01');
    await userEvent.type(screen.getByLabelText(/end date/i), '2026-07-07');
    await waitFor(() => {
      expect(screen.getByText(/7 day/i)).toBeInTheDocument();
    });
  });
});
