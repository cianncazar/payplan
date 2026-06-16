'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { convertMinorToMajor, formatMoneyPlain, toMinorUnits } from '@/lib/money';

interface MoneyInputProps extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
  /** Current value as integer minor units (centavos). */
  value: number | undefined;
  /** Called with the new value as integer minor units after the field is committed. */
  onChange: (minor: number | undefined) => void;
  /** Currency symbol or prefix shown before the input (e.g. "₱"). */
  currencyPrefix?: string;
  /** If true, zero is displayed as empty string when unfocused. */
  zeroAsEmpty?: boolean;
}

export function MoneyInput({
  value,
  onChange,
  currencyPrefix = '₱',
  zeroAsEmpty = true,
  className,
  id,
  placeholder,
  disabled,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...rest
}: MoneyInputProps) {
  const [focused, setFocused] = React.useState(false);
  // editValue is the raw string the user types while the input is focused
  const [editValue, setEditValue] = React.useState('');

  // Derive what to display: while focused show editValue; while blurred
  // show the formatted committed value (or empty for zero when zeroAsEmpty).
  const displayValue = focused
    ? editValue
    : value === undefined || (zeroAsEmpty && value === 0)
      ? ''
      : formatMoneyPlain(value);

  function handleFocus() {
    // Seed the edit buffer with the raw decimal for easy editing
    setEditValue(
      value !== undefined && !(zeroAsEmpty && value === 0)
        ? String(convertMinorToMajor(value))
        : ''
    );
    setFocused(true);
  }

  function handleBlur() {
    setFocused(false);
    if (editValue.trim() === '') {
      onChange(zeroAsEmpty ? 0 : undefined);
      return;
    }
    const minor = toMinorUnits(editValue);
    if (minor !== null && minor >= 0) {
      onChange(minor);
    } else {
      // Revert — the displayed value will re-derive from the unchanged `value` prop
    }
  }

  return (
    <div className="relative flex items-center">
      {currencyPrefix && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 select-none text-sm text-muted-foreground"
        >
          {currencyPrefix}
        </span>
      )}
      <Input
        {...rest}
        id={id}
        type="text"
        inputMode="decimal"
        value={displayValue}
        placeholder={placeholder ?? '0.00'}
        disabled={disabled}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        onChange={(e) => setEditValue(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(currencyPrefix ? 'pl-7' : '', className)}
      />
    </div>
  );
}
