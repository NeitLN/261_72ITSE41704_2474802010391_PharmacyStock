import { describe, expect, it } from 'vitest';
import { BusinessRuleViolation } from '../common/errors.js';
import { addDays, businessDateOf, FixedClock } from './clock.js';
import { applyDeltas, negate } from './stock-deltas.js';

const stock = { qtySellable: 5, qtyQuarantine: 2, qtyPendingDestruction: 1 };
const deltas = (s = 0, q = 0, p = 0) => ({
  deltaSellable: s,
  deltaQuarantine: q,
  deltaPendingDestruction: p,
});

describe('applyDeltas (BR03)', () => {
  it('BR03-U1 issuing the exact remaining quantity leaves zero (TC-10)', () => {
    expect(applyDeltas(stock, deltas(-5), 'A1').qtySellable).toBe(0);
  });

  it('BR03-U2 issuing one more than sellable is refused with the quantity left', () => {
    let thrown: unknown;
    try {
      applyDeltas(stock, deltas(-6), 'A1');
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(BusinessRuleViolation);
    expect(thrown).toMatchObject({ rule: 'BR03', code: 'INSUFFICIENT_STOCK' });
    expect((thrown as Error).message).toContain('only 5 sellable');
  });

  it('BR03-U3 no stock state may go negative, also quarantine and pending destruction', () => {
    expect(() => applyDeltas(stock, deltas(0, -3), 'A1')).toThrow(
      BusinessRuleViolation,
    );
    expect(() => applyDeltas(stock, deltas(0, 0, -2), 'A1')).toThrow(
      BusinessRuleViolation,
    );
  });

  it('BR05-U1 a transfer moves quantity between states in one movement', () => {
    // RELEASE: quarantine → sellable
    expect(applyDeltas(stock, deltas(2, -2), 'A1')).toEqual({
      qtySellable: 7,
      qtyQuarantine: 0,
      qtyPendingDestruction: 1,
    });
  });

  it('BR05-U2 a reversal is the exact negation and restores the quantities', () => {
    const write = deltas(-3, 0, 3);
    const after = applyDeltas(stock, write, 'A1');
    expect(applyDeltas(after, negate(write), 'A1')).toEqual(stock);
  });

  it('refuses an empty or fractional movement as a programming error', () => {
    expect(() => applyDeltas(stock, deltas(), 'A1')).toThrow('at least one');
    expect(() => applyDeltas(stock, deltas(0.5), 'A1')).toThrow(
      'whole numbers',
    );
  });
});

describe('Clock (decision 10)', () => {
  it('uses the Vietnam calendar day, not UTC', () => {
    // 17:30 UTC on 14/10 is 00:30 on 15/10 in Asia/Ho_Chi_Minh (UTC+7).
    expect(businessDateOf(new Date('2026-10-14T17:30:00Z'))).toBe('2026-10-15');
    expect(businessDateOf(new Date('2026-10-14T16:59:59Z'))).toBe('2026-10-14');
  });

  it('FixedClock returns the fixed day', () => {
    const clock = new FixedClock(new Date('2026-12-31T20:00:00Z'));
    expect(clock.today()).toBe('2027-01-01');
  });

  it('addDays crosses month and year ends', () => {
    expect(addDays('2026-10-12', 5)).toBe('2026-10-17');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});
