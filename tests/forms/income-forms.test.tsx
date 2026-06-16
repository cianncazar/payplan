import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncomeSourceForm } from '@/components/income/income-source-form';
import { IncomeEventForm } from '@/components/income/income-event-form';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// ─── IncomeSourceForm ─────────────────────────────────────────────────────────

describe('IncomeSourceForm', () => {
  function setup(props?: Partial<React.ComponentProps<typeof IncomeSourceForm>>) {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();
    const utils = render(
      <IncomeSourceForm onSave={onSave} onCancel={onCancel} {...props} />
    );
    return { onSave, onCancel, ...utils };
  }

  it('renders the name field', () => {
    setup();
    expect(screen.getByLabelText(/source name/i)).toBeInTheDocument();
  });

  it('shows error when name is empty', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /add source/i }));
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it('submits with valid name', async () => {
    const { onSave } = setup();
    await userEvent.type(screen.getByLabelText(/source name/i), 'Monthly Salary');
    await userEvent.click(screen.getByRole('button', { name: /add source/i }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledOnce();
    });
    const saved = onSave.mock.calls[0][0];
    expect(saved.name).toBe('Monthly Salary');
    expect(saved.active).toBe(true);
  });

  it('calls onCancel on cancel', async () => {
    const { onCancel } = setup();
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows Save changes when editing', () => {
    setup({
      initial: {
        id: '1',
        name: 'Salary',
        type: 'salary',
        currency: 'PHP',
        active: true,
        createdAt: '',
        updatedAt: '',
      },
    });
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });
});

// ─── IncomeEventForm ──────────────────────────────────────────────────────────

describe('IncomeEventForm', () => {
  function setup(props?: Partial<React.ComponentProps<typeof IncomeEventForm>>) {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();
    const utils = render(
      <IncomeEventForm onSave={onSave} onCancel={onCancel} {...props} />
    );
    return { onSave, onCancel, ...utils };
  }

  it('renders expected date and amount fields', () => {
    setup();
    expect(screen.getByLabelText(/expected date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/expected amount/i)).toBeInTheDocument();
  });

  it('shows error when expected date is missing', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /add income event/i }));
    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    });
  });

  it('submits with valid data', async () => {
    const { onSave } = setup();
    await userEvent.type(screen.getByLabelText(/expected date/i), '2026-07-01');
    await userEvent.click(screen.getByRole('button', { name: /add income event/i }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledOnce();
    });
    const saved = onSave.mock.calls[0][0];
    expect(saved.expectedDate).toBe('2026-07-01');
    expect(saved.status).toBe('expected');
  });

  it('shows received fields when status is received', async () => {
    setup({
      initial: {
        id: '1',
        expectedDate: '2026-07-01',
        expectedAmountMinor: 10000,
        status: 'received',
        createdAt: '',
        updatedAt: '',
      },
    });
    expect(screen.getByLabelText(/received date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/received amount/i)).toBeInTheDocument();
  });

  it('does not show received fields when status is expected', () => {
    setup();
    expect(screen.queryByLabelText(/received date/i)).not.toBeInTheDocument();
  });

  it('shows linked source selector when sources are provided', () => {
    setup({
      sources: [
        {
          id: 's1',
          name: 'My Salary',
          type: 'salary',
          currency: 'PHP',
          active: true,
          createdAt: '',
          updatedAt: '',
        },
      ],
    });
    expect(screen.getByLabelText(/income source/i)).toBeInTheDocument();
  });
});
