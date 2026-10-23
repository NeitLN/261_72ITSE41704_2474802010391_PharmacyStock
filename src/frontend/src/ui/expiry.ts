/**
 * How close a batch is to its expiry on the business date (ui-design.md §5):
 * expired on or after its expiry date (DEC-01), within the medicine's own
 * alert window, or later. Dates are `YYYY-MM-DD` strings; never the browser's
 * clock, always the server's business date.
 */
export type ExpiryTier = 'expired' | 'within_window' | 'later';

export interface ExpiryInfo {
  tier: ExpiryTier;
  /** Days from the business date to the expiry date; negative once expired. */
  daysLeft: number;
  text: string;
}

const DAY = 86_400_000;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function expiryInfo(expiryDate: string, businessDate: string, alertDays: number): ExpiryInfo {
  const daysLeft = daysBetween(businessDate, expiryDate);
  if (daysLeft <= 0) {
    return {
      tier: 'expired',
      daysLeft,
      text: daysLeft === 0 ? 'Expired today' : `Expired ${plural(-daysLeft, 'day')} ago`,
    };
  }
  return {
    tier: daysLeft <= alertDays ? 'within_window' : 'later',
    daysLeft,
    text: `${plural(daysLeft, 'day')} left`,
  };
}
