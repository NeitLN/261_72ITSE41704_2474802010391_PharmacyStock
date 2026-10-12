import { Injectable } from '@nestjs/common';

/** Business dates are calendar days in Vietnam time (decision 10). */
export const BUSINESS_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const dateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** `YYYY-MM-DD` of an instant in Asia/Ho_Chi_Minh. */
export function businessDateOf(instant: Date): string {
  return dateFormat.format(instant);
}

/**
 * The only source of "now" and "today" for business rules. Rules never call
 * `new Date()`, so tests can fix the date (FixedClock) and the time zone is
 * applied in one place.
 */
export abstract class Clock {
  abstract now(): Date;

  /** Today's business date, `YYYY-MM-DD` in Asia/Ho_Chi_Minh. */
  today(): string {
    return businessDateOf(this.now());
  }
}

@Injectable()
export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}

/** A clock stopped at one instant, for tests. */
export class FixedClock extends Clock {
  constructor(private instant: Date) {
    super();
  }

  now(): Date {
    return new Date(this.instant);
  }

  set(instant: Date): void {
    this.instant = instant;
  }
}

/** Adds whole days to a `YYYY-MM-DD` date. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
