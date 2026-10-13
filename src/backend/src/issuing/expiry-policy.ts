/** Why a batch that may be issued still deserves a second look (FR-16). */
export type ExpiryWarningKind = 'WITHIN_ALERT_WINDOW' | 'BEFORE_END_OF_USE';

export interface ExpiryWarning {
  kind: ExpiryWarningKind;
  daysLeft: number;
}

const DAY_MS = 86_400_000;

/**
 * BR02 and DEC-01 on calendar dates (`YYYY-MM-DD`, business time zone).
 * Dates come from `Clock.today()`, never `new Date()`, so the rule is the same
 * in tests and in use.
 */
export class ExpiryPolicy {
  /**
   * Pharmacy policy, stricter than the label: a batch is issued only while
   * its expiry date is after the business date, so never on its expiry day.
   */
  static isIssuable(expiryDate: string, businessDate: string): boolean {
    return expiryDate > businessDate;
  }

  /** Whole days from the business date to the expiry date. */
  static daysLeft(expiryDate: string, businessDate: string): number {
    return Math.round(
      (Date.parse(`${expiryDate}T00:00:00Z`) -
        Date.parse(`${businessDate}T00:00:00Z`)) /
        DAY_MS,
    );
  }

  /**
   * The warning shown before an issuable batch is handed over, or null.
   * BEFORE_END_OF_USE — the batch expires before the prescribed days of use
   * run out (days left < days of use) — wins over WITHIN_ALERT_WINDOW, since
   * it affects the treatment itself.
   */
  static warningFor(
    expiryDate: string,
    businessDate: string,
    options: { alertDays: number; daysOfUse?: number | null },
  ): ExpiryWarning | null {
    const daysLeft = ExpiryPolicy.daysLeft(expiryDate, businessDate);
    if (options.daysOfUse != null && daysLeft < options.daysOfUse) {
      return { kind: 'BEFORE_END_OF_USE', daysLeft };
    }
    if (daysLeft <= options.alertDays) {
      return { kind: 'WITHIN_ALERT_WINDOW', daysLeft };
    }
    return null;
  }
}
