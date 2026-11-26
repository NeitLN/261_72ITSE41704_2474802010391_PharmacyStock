import { describe, expect, it } from 'vitest';
import { ExpiryPolicy } from '../issuing/expiry-policy.js';
import { PrescriptionValidator } from '../prescriptions/prescription-validator.js';
import { businessDateOf } from './clock.js';

/**
 * The business date turns at midnight in Vietnam (UTC+7), not at midnight
 * UTC. BR02 and BR10 compare business dates, so their boundary is this turn.
 */
describe('business date at midnight in Asia/Ho_Chi_Minh', () => {
  const lastSecond = new Date('2026-11-25T16:59:59Z'); // 23:59:59 on 25/11 in Vietnam
  const midnight = new Date('2026-11-25T17:00:00Z'); // 00:00:00 on 26/11 in Vietnam

  it('turns at 17:00 UTC', () => {
    expect(businessDateOf(lastSecond)).toBe('2026-11-25');
    expect(businessDateOf(midnight)).toBe('2026-11-26');
  });

  it('BR02: a batch expiring on 26/11 can be issued until 23:59:59 on 25/11, not at midnight', () => {
    expect(ExpiryPolicy.isIssuable('2026-11-26', businessDateOf(lastSecond))).toBe(true);
    expect(ExpiryPolicy.isIssuable('2026-11-26', businessDateOf(midnight))).toBe(false);
  });

  it('BR10: a prescription valid until 25/11 is in date until 23:59:59, expired at midnight', () => {
    const validUntil = PrescriptionValidator.validUntil('2026-11-20');
    expect(validUntil).toBe('2026-11-25');
    expect(PrescriptionValidator.isExpired(validUntil, businessDateOf(lastSecond))).toBe(false);
    expect(PrescriptionValidator.isExpired(validUntil, businessDateOf(midnight))).toBe(true);
  });
});
