import { describe, expect, it } from 'vitest';
import { BatchStatus } from '../entities/index.js';
import { FixedClock } from '../stock/clock.js';
import { ExpiryPolicy } from './expiry-policy.js';
import { type BatchCandidate, FefoAllocator } from './fefo-allocator.js';

const TODAY = '2026-10-13';

let seq = 0;
function batch(over: Partial<BatchCandidate> = {}): BatchCandidate {
  seq += 1;
  return {
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    batchNumber: `L${seq}`,
    expiryDate: '2027-06-30',
    receivedAt: new Date('2026-09-01T03:00:00Z'),
    qtySellable: 10,
    status: BatchStatus.ACTIVE,
    ...over,
  };
}

function allocate(
  batches: BatchCandidate[],
  quantity: number,
  daysOfUse?: number,
) {
  return FefoAllocator.allocate({
    batches,
    quantity,
    businessDate: TODAY,
    alertDays: 90,
    daysOfUse,
  });
}

function taken(result: ReturnType<typeof allocate>) {
  return result.lines.map((l) => [l.batch.batchNumber, l.quantity]);
}

describe('BR01 FEFO (DEC-07)', () => {
  it('BR01-01 TC-04: 7 from A=3 (expires first) and B=8 takes 3 from A and 4 from B', () => {
    const a = batch({
      batchNumber: 'A',
      qtySellable: 3,
      expiryDate: '2027-01-31',
    });
    const b = batch({
      batchNumber: 'B',
      qtySellable: 8,
      expiryDate: '2027-03-31',
    });
    const result = allocate([b, a], 7);
    expect(result.ok).toBe(true);
    expect(taken(result)).toEqual([
      ['A', 3],
      ['B', 4],
    ]);
  });

  it('BR01-02 a request one batch can cover takes nothing from the next', () => {
    const a = batch({
      batchNumber: 'A',
      qtySellable: 5,
      expiryDate: '2027-01-31',
    });
    const b = batch({ batchNumber: 'B', expiryDate: '2027-03-31' });
    expect(taken(allocate([a, b], 5))).toEqual([['A', 5]]);
  });

  it('BR01-03 TC-05: a batch holding 0 is skipped', () => {
    const empty = batch({
      batchNumber: 'A',
      qtySellable: 0,
      expiryDate: '2027-01-31',
    });
    const next = batch({
      batchNumber: 'B',
      qtySellable: 5,
      expiryDate: '2027-03-31',
    });
    expect(taken(allocate([empty, next], 2))).toEqual([['B', 2]]);
  });

  it('BR01-04 same expiry: the batch received earlier goes first, then the lower number', () => {
    const late = batch({
      batchNumber: 'A',
      receivedAt: new Date('2026-09-10T00:00:00Z'),
    });
    const early = batch({
      batchNumber: 'Z',
      receivedAt: new Date('2026-09-02T00:00:00Z'),
    });
    const sameDayB = batch({
      batchNumber: 'B',
      receivedAt: new Date('2026-09-10T00:00:00Z'),
    });
    expect(taken(allocate([sameDayB, late, early], 25))).toEqual([
      ['Z', 10],
      ['A', 10],
      ['B', 5],
    ]);
  });

  it('BR01-05 TC-60: a batch on hold, recalled or rejected is skipped even if it expires first', () => {
    const held = [
      BatchStatus.ON_HOLD,
      BatchStatus.RECALLED,
      BatchStatus.REJECTED,
    ].map((status) => batch({ status, expiryDate: '2026-12-31' }));
    const active = batch({ batchNumber: 'OK', expiryDate: '2027-06-30' });
    expect(taken(allocate([...held, active], 4))).toEqual([['OK', 4]]);
  });

  it('BR01-06 FR-18: a shortage allocates nothing and reports what is available', () => {
    const a = batch({ qtySellable: 3 });
    const b = batch({ qtySellable: 2 });
    const result = allocate([a, b], 6);
    expect(result).toEqual({ ok: false, lines: [], available: 5 });
  });

  it('BR01-07 refuses a quantity that is not a positive integer', () => {
    expect(() => allocate([batch()], 0)).toThrow(RangeError);
    expect(() => allocate([batch()], 1.5)).toThrow(RangeError);
  });
});

describe('BR02 expired stock (DEC-01)', () => {
  it('BR02-01 TC-06: a batch that expired before the business date is never issued', () => {
    const result = allocate([batch({ expiryDate: '2026-10-12' })], 1);
    expect(result).toEqual({ ok: false, lines: [], available: 0 });
  });

  it('BR02-02 TC-07: a batch is not issued on its expiry day (pharmacy policy)', () => {
    expect(ExpiryPolicy.isIssuable(TODAY, TODAY)).toBe(false);
    expect(allocate([batch({ expiryDate: TODAY })], 1).ok).toBe(false);
  });

  it('BR02-03 a batch expiring the day after the business date is issued', () => {
    expect(ExpiryPolicy.isIssuable('2026-10-14', TODAY)).toBe(true);
  });

  it('BR02-04 TC-08: with A expired and B in date, only B is used', () => {
    const a = batch({ batchNumber: 'A', expiryDate: '2026-10-01' });
    const b = batch({ batchNumber: 'B', expiryDate: '2027-06-30' });
    expect(taken(allocate([a, b], 4))).toEqual([['B', 4]]);
  });

  it('BR02-05 the business date turns at midnight in Vietnam, not UTC', () => {
    // 17:30 UTC on 13/10 is 00:30 on 14/10 in Asia/Ho_Chi_Minh.
    const businessDate = new FixedClock(
      new Date('2026-10-13T17:30:00Z'),
    ).today();
    expect(businessDate).toBe('2026-10-14');
    expect(ExpiryPolicy.isIssuable('2026-10-14', businessDate)).toBe(false);
  });
});

describe('BR02 near-expiry warnings (FR-16)', () => {
  it('BR02-06 TC-57: a batch inside the alert window is issued with the days left', () => {
    const result = allocate([batch({ expiryDate: '2026-11-12' })], 1);
    expect(result.ok).toBe(true);
    expect(result.lines[0].warning).toEqual({
      kind: 'WITHIN_ALERT_WINDOW',
      daysLeft: 30,
    });
  });

  it('BR02-07 a batch beyond the alert window carries no warning', () => {
    expect(
      allocate([batch({ expiryDate: '2027-06-30' })], 1).lines[0].warning,
    ).toBeNull();
  });

  it('BR02-08 a batch expiring before the days of use run out is flagged as such', () => {
    const result = allocate([batch({ expiryDate: '2026-10-20' })], 1, 10);
    expect(result.lines[0].warning).toEqual({
      kind: 'BEFORE_END_OF_USE',
      daysLeft: 7,
    });
  });

  it('BR02-09 the alert window boundary is inclusive', () => {
    expect(
      ExpiryPolicy.warningFor('2027-01-11', TODAY, { alertDays: 90 }),
    ).toEqual({
      kind: 'WITHIN_ALERT_WINDOW',
      daysLeft: 90,
    });
    expect(
      ExpiryPolicy.warningFor('2027-01-12', TODAY, { alertDays: 90 }),
    ).toBeNull();
  });
});
