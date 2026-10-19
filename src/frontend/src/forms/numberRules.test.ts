import { describe, expect, it } from 'vitest';
import { decimalError, wholeNumberError } from './numberRules';

// TC-02: 0, -1 and 2.5 must be refused, not changed into a valid quantity (#125).
describe('wholeNumberError', () => {
  const quantity = (v: unknown) => wholeNumberError('Quantity', v, { min: 1, max: 1_000_000 });

  it('refuses the TC-02 values', () => {
    expect(quantity(0)).toBe('Quantity must be at least 1.');
    expect(quantity(-1)).toBe('Quantity must be at least 1.');
    expect(quantity(2.5)).toBe('Quantity must be a whole number.');
  });

  it('accepts whole numbers in range and leaves empty to required', () => {
    expect(quantity(1)).toBeNull();
    expect(quantity(1_000_000)).toBeNull();
    expect(quantity(null)).toBeNull();
    expect(quantity(undefined)).toBeNull();
  });

  it('refuses values above the maximum', () => {
    expect(quantity(1_000_001)).toBe('Quantity must be at most 1000000.');
  });
});

describe('decimalError', () => {
  const cost = (v: unknown) => decimalError('Unit cost', v, { min: 0, decimals: 2 });

  it('refuses a negative cost and more than two decimals', () => {
    expect(cost(-1)).toBe('Unit cost cannot be negative.');
    expect(cost(1.234)).toBe('Unit cost can have at most 2 decimals.');
  });

  it('accepts zero and two decimals', () => {
    expect(cost(0)).toBeNull();
    expect(cost(1500.25)).toBeNull();
    expect(cost(0.1)).toBeNull();
  });
});
