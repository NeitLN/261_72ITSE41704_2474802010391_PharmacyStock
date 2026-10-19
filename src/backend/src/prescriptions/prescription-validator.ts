import { BusinessRuleViolation, type FieldError } from '../common/errors.js';
import { PrescriptionStatus } from '../entities/index.js';
import { addDays } from '../stock/clock.js';

/** Validity period of a prescription in days from the issue date (FR-14, BR10). */
export const PRESCRIPTION_VALIDITY_DAYS = 5;

/** Only these statuses may be edited or verified; a dispensed one keeps its history (BR07). */
const EDITABLE = [PrescriptionStatus.RECEIVED, PrescriptionStatus.VERIFIED];

/** A verified prescription, or one already partly handed over (FR-19, DEC-03). */
const DISPENSABLE = [
  PrescriptionStatus.VERIFIED,
  PrescriptionStatus.PARTIALLY_DISPENSED,
];

/** What the rules need to know about a prescription. */
export interface PrescriptionState {
  status: PrescriptionStatus;
  /** `YYYY-MM-DD`, the last day the prescription may be used (BR10). */
  validUntil: string;
  prescriberActive: boolean;
}

/** What BR07 needs to know about one prescribed item. */
export interface PrescribedQuantity {
  quantityPrescribed: number;
  quantityDispensed: number;
}

/**
 * The prescription rules of UC05 and UC06 in one place, without a database:
 * BR04 (only a verified prescription from an active prescriber is honoured),
 * BR07 (never more than prescribed), BR10 (valid for five days from issue).
 *
 * Services load and lock the rows, then ask the validator; the validator
 * throws the domain error the API returns (422 with the rule).
 */
export class PrescriptionValidator {
  /** BR10: the last valid day, computed from the issue date and never edited. */
  static validUntil(issuedDate: string): string {
    return addDays(issuedDate, PRESCRIPTION_VALIDITY_DAYS);
  }

  /** BR10: still usable on its last valid day, expired the day after. */
  static isExpired(validUntil: string, today: string): boolean {
    return today > validUntil;
  }

  /** BR07: a prescription that has been dispensed or cancelled keeps its history. */
  static assertEditable(status: PrescriptionStatus): void {
    if (!EDITABLE.includes(status)) {
      throw new BusinessRuleViolation(
        'BR07',
        'PRESCRIPTION_NOT_EDITABLE',
        'A prescription that has been dispensed or cancelled cannot be edited.',
      );
    }
  }

  /** FR-44: the pharmacist reviews a received prescription that is still valid. */
  static assertVerifiable(state: PrescriptionState, today: string): void {
    if (state.status !== PrescriptionStatus.RECEIVED) {
      throw new BusinessRuleViolation(
        'FR-44',
        'PRESCRIPTION_NOT_RECEIVED',
        'Only a prescription waiting for review can be verified.',
      );
    }
    PrescriptionValidator.assertInDate(state.validUntil, today);
    if (!state.prescriberActive) {
      throw new BusinessRuleViolation(
        'BR04',
        'PRESCRIBER_INACTIVE',
        'The prescriber has been deactivated; this prescription cannot be verified.',
      );
    }
  }

  /** FR-19, FR-21, DEC-03: only a verified prescription, in date, from an active prescriber. */
  static assertDispensable(state: PrescriptionState, today: string): void {
    if (!DISPENSABLE.includes(state.status)) {
      throw new BusinessRuleViolation(
        'BR04',
        'PRESCRIPTION_NOT_DISPENSABLE',
        state.status === PrescriptionStatus.RECEIVED
          ? 'This prescription has not been verified by a pharmacist yet.'
          : 'This prescription cannot be dispensed any more.',
      );
    }
    PrescriptionValidator.assertInDate(state.validUntil, today);
    if (!state.prescriberActive) {
      throw new BusinessRuleViolation(
        'BR04',
        'PRESCRIBER_INACTIVE',
        'The prescriber has been deactivated; this prescription cannot be dispensed.',
      );
    }
  }

  /** BR07: what may still be handed over for one item. */
  static outstanding(item: PrescribedQuantity): number {
    return item.quantityPrescribed - item.quantityDispensed;
  }

  /**
   * BR07: refuses the hand-over when any requested quantity is more than is
   * outstanding, naming each offending line (`items.<i>.quantity`).
   */
  static assertWithinPrescribed(
    items: PrescribedQuantity[],
    quantities: number[],
  ): void {
    const errors: FieldError[] = [];
    items.forEach((item, index) => {
      const left = PrescriptionValidator.outstanding(item);
      if (quantities[index] > left) {
        errors.push({
          field: `items.${index}.quantity`,
          message: `Only ${left} of ${item.quantityPrescribed} prescribed are still outstanding.`,
        });
      }
    });
    if (errors.length > 0) {
      throw new BusinessRuleViolation(
        'BR07',
        'OVER_PRESCRIBED_QUANTITY',
        'A quantity is more than the prescription still allows.',
        errors,
      );
    }
  }

  private static assertInDate(validUntil: string, today: string): void {
    if (PrescriptionValidator.isExpired(validUntil, today)) {
      throw new BusinessRuleViolation(
        'BR10',
        'PRESCRIPTION_EXPIRED',
        `This prescription was valid until ${validUntil}.`,
      );
    }
  }
}
