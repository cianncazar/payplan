import { describe, it, expect } from 'vitest';
import {
  convertMajorToMinor,
  convertMinorToMajor,
  parseMoneyInput,
  toMinorUnits,
  addMoney,
  subtractMoney,
  multiplyMoney,
  divideMoney,
  allocateInstallments,
} from './index';

describe('convertMajorToMinor', () => {
  it('converts whole pesos to centavos', () => {
    expect(convertMajorToMinor(1)).toBe(100);
    expect(convertMajorToMinor(100)).toBe(10000);
  });

  it('converts fractional pesos', () => {
    expect(convertMajorToMinor(1.5)).toBe(150);
    expect(convertMajorToMinor(12.99)).toBe(1299);
  });

  it('handles floating-point drift', () => {
    expect(convertMajorToMinor(0.1 + 0.2)).toBe(30);
  });
});

describe('convertMinorToMajor', () => {
  it('converts centavos to pesos', () => {
    expect(convertMinorToMajor(100)).toBe(1);
    expect(convertMinorToMajor(1299)).toBe(12.99);
  });
});

describe('parseMoneyInput', () => {
  it('parses plain numbers', () => {
    expect(parseMoneyInput('100')).toBe(100);
    expect(parseMoneyInput('1.50')).toBe(1.5);
  });

  it('strips commas', () => {
    expect(parseMoneyInput('1,000')).toBe(1000);
    expect(parseMoneyInput('1,250.75')).toBe(1250.75);
  });

  it('returns null for empty or invalid input', () => {
    expect(parseMoneyInput('')).toBeNull();
    expect(parseMoneyInput('abc')).toBeNull();
    expect(parseMoneyInput('.')).toBeNull();
    expect(parseMoneyInput('-')).toBeNull();
  });
});

describe('toMinorUnits', () => {
  it('parses money string to minor units', () => {
    expect(toMinorUnits('100')).toBe(10000);
    expect(toMinorUnits('1.50')).toBe(150);
    expect(toMinorUnits('0')).toBe(0);
  });

  it('returns null for unparseable input', () => {
    expect(toMinorUnits('')).toBeNull();
    expect(toMinorUnits('not a number')).toBeNull();
  });
});

describe('addMoney', () => {
  it('adds two amounts', () => {
    expect(addMoney(100, 200)).toBe(300);
    expect(addMoney(0, 500)).toBe(500);
  });
});

describe('subtractMoney', () => {
  it('subtracts two amounts', () => {
    expect(subtractMoney(500, 200)).toBe(300);
    expect(subtractMoney(100, 150)).toBe(-50);
  });
});

describe('multiplyMoney', () => {
  it('multiplies and rounds', () => {
    expect(multiplyMoney(100, 3)).toBe(300);
    expect(multiplyMoney(100, 1.5)).toBe(150);
    expect(multiplyMoney(1, 0.015)).toBe(0);
  });
});

describe('divideMoney', () => {
  it('divides and rounds', () => {
    expect(divideMoney(100, 3)).toBe(33);
    expect(divideMoney(300, 3)).toBe(100);
  });
});

describe('allocateInstallments', () => {
  it('returns empty array for count <= 0', () => {
    expect(allocateInstallments(1000, 0)).toEqual([]);
    expect(allocateInstallments(1000, -1)).toEqual([]);
  });

  it('splits evenly when divisible', () => {
    expect(allocateInstallments(300, 3)).toEqual([100, 100, 100]);
    expect(allocateInstallments(1000, 4)).toEqual([250, 250, 250, 250]);
  });

  it('adds remainder to the last installment', () => {
    expect(allocateInstallments(100, 3)).toEqual([33, 33, 34]);
    expect(allocateInstallments(101, 3)).toEqual([33, 33, 35]);
    expect(allocateInstallments(1, 3)).toEqual([0, 0, 1]);
  });

  it('sum of installments always equals total', () => {
    for (const total of [100, 199, 1000, 997, 1]) {
      for (const count of [1, 2, 3, 5, 12]) {
        const parts = allocateInstallments(total, count);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      }
    }
  });
});
