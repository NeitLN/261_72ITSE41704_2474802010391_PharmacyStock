import { describe, expect, it } from 'vitest';
import { BusinessRuleViolation } from '../common/errors.js';
import { PrescriptionStatus } from '../entities/index.js';
import {
  type PrescriptionState,
  PrescriptionValidator,
} from './prescription-validator.js';

const TODAY = '2026-10-19';

function state(over: Partial<PrescriptionState> = {}): PrescriptionState {
  return {
    status: PrescriptionStatus.VERIFIED,
    validUntil: '2026-10-20',
    prescriberActive: true,
    ...over,
  };
}

/** The rule and code of the error `fn` throws, or null when it passes. */
function refusal(fn: () => void): { rule: string; code: string } | null {
  try {
    fn();
    return null;
  } catch (error) {
    if (!(error instanceof BusinessRuleViolation)) throw error;
    return { rule: error.rule, code: error.code };
  }
}

describe('BR10 prescription validity', () => {
  it('BR10-01 is valid for five days from the issue date', () => {
    expect(PrescriptionValidator.validUntil('2026-10-14')).toBe('2026-10-19');
  });

  it('BR10-02 counts across a month and a year end', () => {
    expect(PrescriptionValidator.validUntil('2026-10-29')).toBe('2026-11-03');
    expect(PrescriptionValidator.validUntil('2026-12-30')).toBe('2027-01-04');
  });

  it('BR10-03 can still be dispensed on its last valid day', () => {
    expect(
      refusal(() =>
        PrescriptionValidator.assertDispensable(
          state({ validUntil: TODAY }),
          TODAY,
        ),
      ),
    ).toBeNull();
    expect(PrescriptionValidator.isExpired(TODAY, TODAY)).toBe(false);
  });

  it('BR10-04 is refused the day after its last valid day', () => {
    expect(
      refusal(() =>
        PrescriptionValidator.assertDispensable(
          state({ validUntil: '2026-10-18' }),
          TODAY,
        ),
      ),
    ).toEqual({ rule: 'BR10', code: 'PRESCRIPTION_EXPIRED' });
    expect(PrescriptionValidator.isExpired('2026-10-18', TODAY)).toBe(true);
  });

  it('BR10-05 an expired prescription cannot be verified either', () => {
    expect(
      refusal(() =>
        PrescriptionValidator.assertVerifiable(
          state({
            status: PrescriptionStatus.RECEIVED,
            validUntil: '2026-10-18',
          }),
          TODAY,
        ),
      ),
    ).toEqual({ rule: 'BR10', code: 'PRESCRIPTION_EXPIRED' });
  });
});

describe('BR04 only a verified prescription from an active prescriber', () => {
  it('BR04-01 a verified or partly dispensed prescription can be dispensed', () => {
    for (const status of [
      PrescriptionStatus.VERIFIED,
      PrescriptionStatus.PARTIALLY_DISPENSED,
    ]) {
      expect(
        refusal(() =>
          PrescriptionValidator.assertDispensable(state({ status }), TODAY),
        ),
      ).toBeNull();
    }
  });

  it('BR04-02 a received prescription waits for the pharmacist', () => {
    expect(
      refusal(() =>
        PrescriptionValidator.assertDispensable(
          state({ status: PrescriptionStatus.RECEIVED }),
          TODAY,
        ),
      ),
    ).toEqual({ rule: 'BR04', code: 'PRESCRIPTION_NOT_DISPENSABLE' });
  });

  it('BR04-03 a fully dispensed or cancelled prescription is closed', () => {
    for (const status of [
      PrescriptionStatus.FULLY_DISPENSED,
      PrescriptionStatus.CANCELLED,
    ]) {
      expect(
        refusal(() =>
          PrescriptionValidator.assertDispensable(state({ status }), TODAY),
        ),
      ).toEqual({ rule: 'BR04', code: 'PRESCRIPTION_NOT_DISPENSABLE' });
    }
  });

  it('BR04-04 a deactivated prescriber stops dispensing and verification', () => {
    expect(
      refusal(() =>
        PrescriptionValidator.assertDispensable(
          state({ prescriberActive: false }),
          TODAY,
        ),
      ),
    ).toEqual({ rule: 'BR04', code: 'PRESCRIBER_INACTIVE' });
    expect(
      refusal(() =>
        PrescriptionValidator.assertVerifiable(
          state({
            status: PrescriptionStatus.RECEIVED,
            prescriberActive: false,
          }),
          TODAY,
        ),
      ),
    ).toEqual({ rule: 'BR04', code: 'PRESCRIBER_INACTIVE' });
  });

  it('BR04-05 only a received prescription can be verified (FR-44)', () => {
    expect(
      refusal(() =>
        PrescriptionValidator.assertVerifiable(
          state({ status: PrescriptionStatus.RECEIVED }),
          TODAY,
        ),
      ),
    ).toBeNull();
    expect(
      refusal(() => PrescriptionValidator.assertVerifiable(state(), TODAY)),
    ).toEqual({ rule: 'FR-44', code: 'PRESCRIPTION_NOT_RECEIVED' });
  });

  it('BR04-06 the status is checked before the date, so a closed prescription is never reported as expired', () => {
    expect(
      refusal(() =>
        PrescriptionValidator.assertDispensable(
          state({
            status: PrescriptionStatus.FULLY_DISPENSED,
            validUntil: '2026-10-01',
          }),
          TODAY,
        ),
      ),
    ).toEqual({ rule: 'BR04', code: 'PRESCRIPTION_NOT_DISPENSABLE' });
  });
});

describe('BR07 never more than prescribed', () => {
  const item = { quantityPrescribed: 20, quantityDispensed: 13 };

  it('BR07-01 the outstanding quantity is prescribed minus dispensed', () => {
    expect(PrescriptionValidator.outstanding(item)).toBe(7);
  });

  it('BR07-02 exactly the outstanding quantity is allowed', () => {
    expect(
      refusal(() => PrescriptionValidator.assertWithinPrescribed([item], [7])),
    ).toBeNull();
  });

  it('BR07-03 one unit more than outstanding is refused on that line', () => {
    try {
      PrescriptionValidator.assertWithinPrescribed(
        [{ quantityPrescribed: 10, quantityDispensed: 0 }, item],
        [10, 8],
      );
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessRuleViolation);
      const violation = error as BusinessRuleViolation;
      expect(violation.rule).toBe('BR07');
      expect(violation.code).toBe('OVER_PRESCRIBED_QUANTITY');
      expect(violation.errors).toEqual([
        {
          field: 'items.1.quantity',
          message: 'Only 7 of 20 prescribed are still outstanding.',
        },
      ]);
    }
  });

  it('BR07-04 a fully dispensed item allows nothing more', () => {
    expect(
      refusal(() =>
        PrescriptionValidator.assertWithinPrescribed(
          [{ quantityPrescribed: 5, quantityDispensed: 5 }],
          [1],
        ),
      ),
    ).toEqual({ rule: 'BR07', code: 'OVER_PRESCRIBED_QUANTITY' });
  });

  it('BR07-05 only a received or verified prescription may be edited', () => {
    for (const status of [
      PrescriptionStatus.RECEIVED,
      PrescriptionStatus.VERIFIED,
    ]) {
      expect(
        refusal(() => PrescriptionValidator.assertEditable(status)),
      ).toBeNull();
    }
    for (const status of [
      PrescriptionStatus.PARTIALLY_DISPENSED,
      PrescriptionStatus.FULLY_DISPENSED,
      PrescriptionStatus.CANCELLED,
    ]) {
      expect(
        refusal(() => PrescriptionValidator.assertEditable(status)),
      ).toEqual({ rule: 'BR07', code: 'PRESCRIPTION_NOT_EDITABLE' });
    }
  });
});
