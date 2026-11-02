import { describe, expect, it } from 'vitest';
import { formatMoneyInput } from './moneyFormat';
import { parseGroupedNumber, wholeNumberError } from './numberRules';

/**
 * Replays what antd's InputNumber does on each key (#244): the new text is
 * parsed, and the formatter decides what the field shows next.
 */
function type(keys: string, start = '', editing = true) {
  let shown = start;
  let value: number | undefined;
  for (const key of keys) {
    const input = shown + key;
    value = parseGroupedNumber(input);
    shown = formatMoneyInput(value, { userTyping: true, input }, editing);
  }
  return { shown, value };
}

const blur = (value: number | undefined) => formatMoneyInput(value, { userTyping: false, input: '' }, false);
const focus = (value: number | undefined) => formatMoneyInput(value, { userTyping: false, input: '' }, true);

describe('price field typed key by key (#244)', () => {
  it('keeps every digit of a price of five digits or more', () => {
    expect(type('100000').value).toBe(100000);
    expect(type('10500').value).toBe(10500);
    expect(type('12500').value).toBe(12500);
    expect(type('1250000').value).toBe(1250000);
  });

  it('shows the digits as typed, then groups thousands when the field is left', () => {
    const { shown, value } = type('100000');
    expect(shown).toBe('100000');
    expect(blur(value)).toBe('100.000');
  });

  it('shows plain digits again when the field is entered, so an edit is read right', () => {
    expect(focus(100000)).toBe('100000');
    expect(type('0', focus(100000)).value).toBe(1000000);
  });

  it('still refuses a decimal point typed by the user (#183)', () => {
    const { value } = type('10.5');
    expect(value).toBe(10.5);
    expect(wholeNumberError('Price', value, { min: 1 })).toBe('Price must be a whole number.');
  });

  it('reads a pasted grouped number', () => {
    expect(parseGroupedNumber('100.000')).toBe(100000);
  });

  it('shows an empty field as empty', () => {
    expect(blur(undefined)).toBe('');
    expect(focus(undefined)).toBe('');
  });
});
