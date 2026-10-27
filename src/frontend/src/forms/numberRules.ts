import type { Rule } from 'antd/es/form';

/**
 * Validation rules for number fields (#125).
 *
 * An InputNumber with `min` or `precision` quietly changes what the user typed
 * (0 becomes 1, 2.5 becomes 3) and the wrong value is saved. Leave those props
 * off and use these rules instead, so a bad value shows an error under the
 * field, like the API does. An empty field is left to the `required` rule.
 */

interface Bounds {
  min?: number;
  max?: number;
}

/** Problem with `value` as a whole number, or null when it is fine. */
export function wholeNumberError(
  label: string,
  value: unknown,
  { min, max }: Bounds = {},
): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return `${label} must be a whole number.`;
  }
  if (min !== undefined && value < min) return `${label} must be at least ${min}.`;
  if (max !== undefined && value > max) return `${label} must be at most ${max}.`;
  return null;
}

/** Problem with `value` as a number with at most `decimals` places, or null. */
export function decimalError(
  label: string,
  value: unknown,
  { min, max, decimals = 2 }: Bounds & { decimals?: number } = {},
): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return `${label} must be a number.`;
  }
  if (Math.abs(Math.round(value * 10 ** decimals) - value * 10 ** decimals) > 1e-6) {
    return `${label} can have at most ${decimals} decimals.`;
  }
  if (min !== undefined && value < min) {
    return min === 0 ? `${label} cannot be negative.` : `${label} must be at least ${min}.`;
  }
  if (max !== undefined && value > max) return `${label} must be at most ${max}.`;
  return null;
}

/**
 * Reads what was typed in a money field shown with dots between thousands
 * (`1.500`). Only a dot that groups three digits is a thousands separator;
 * any other dot or comma is a decimal point, so `10.5` stays 10.5 and the
 * whole-number rule refuses it instead of it becoming 105 (#183).
 */
export function parseGroupedNumber(text: string | undefined): number {
  const typed = (text ?? '').trim();
  if (/^\d{1,3}(\.\d{3})+$/.test(typed)) return Number(typed.replace(/\./g, ''));
  return Number(typed.replace(',', '.'));
}

function asRule(check: (value: unknown) => string | null): Rule {
  return {
    validator: (_, value) => {
      const error = check(value);
      return error ? Promise.reject(new Error(error)) : Promise.resolve();
    },
  };
}

export const wholeNumber = (label: string, bounds?: Bounds): Rule =>
  asRule((v) => wholeNumberError(label, v, bounds));

export const decimal = (label: string, bounds?: Bounds & { decimals?: number }): Rule =>
  asRule((v) => decimalError(label, v, bounds));
