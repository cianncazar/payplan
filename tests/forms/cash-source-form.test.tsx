import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CashSourceForm } from '@/components/cash-sources/cash-source-form';

// Silence sonner in tests
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function setup(props?: Partial<React.ComponentProps<typeof CashSourceForm>>) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();
  const utils = render(
    <CashSourceForm
      onSave={onSave}
      onCancel={onCancel}
      {...props}
    />
  );
  return { onSave, onCancel, ...utils };
}

describe('CashSourceForm', () => {
  it('renders required fields', () => {
    setup();
    expect(screen.getByLabelText(/source name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add source/i })).toBeInTheDocument();
  });

  it('shows validation error when name is empty', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /add source/i }));
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const { onCancel } = setup();
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onSave with correct data when form is valid', async () => {
    const { onSave } = setup();
    await userEvent.type(screen.getByLabelText(/source name/i), 'BDO Savings');
    await userEvent.click(screen.getByRole('button', { name: /add source/i }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledOnce();
    });
    const saved = onSave.mock.calls[0][0];
    expect(saved.name).toBe('BDO Savings');
    expect(saved.currency).toBe('PHP');
    expect(typeof saved.balanceMinor).toBe('number');
  });

  it('shows Save changes button when editing existing record', () => {
    const existing = {
      id: 'abc',
      name: 'Cash on hand',
      type: 'cash' as const,
      balanceMinor: 5000,
      currency: 'PHP',
      includeInPlanner: true,
      archived: false,
      createdAt: '',
      updatedAt: '',
    };
    setup({ initial: existing });
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('pre-fills fields from initial prop', () => {
    const existing = {
      id: 'abc',
      name: 'GCash',
      type: 'ewallet' as const,
      balanceMinor: 25000,
      currency: 'PHP',
      includeInPlanner: false,
      archived: false,
      createdAt: '',
      updatedAt: '',
    };
    setup({ initial: existing });
    expect(screen.getByDisplayValue('GCash')).toBeInTheDocument();
  });
});
