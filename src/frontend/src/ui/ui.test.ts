import { describe, expect, it } from 'vitest';
import { expiryInfo } from './expiry';
import { formatQty, formatVnd } from './format';
import { statusOf, STATUSES, TONE_COLOURS } from './status';

describe('formatVnd and formatQty', () => {
  it('shows VND with dots and keeps cents only when present', () => {
    expect(formatVnd('1500.00')).toMatch(/^1\.500\s₫$/);
    expect(formatVnd('1750.50')).toMatch(/^1\.750,5\s₫$/);
    expect(formatVnd(null)).toBe('—');
  });

  it('puts the unit after a whole quantity', () => {
    expect(formatQty(8, 'tablet')).toBe('8 tablet');
    expect(formatQty(1200, 'capsule')).toBe('1.200 capsule');
  });
});

describe('expiryInfo against the business date (DEC-01)', () => {
  const on = (expiry: string) => expiryInfo(expiry, '2026-10-22', 90);

  it('a batch expiring on the business date is expired', () => {
    expect(on('2026-10-22')).toEqual({ tier: 'expired', daysLeft: 0, text: 'Expired today' });
    expect(on('2026-10-15')).toMatchObject({ tier: 'expired', text: 'Expired 7 days ago' });
    expect(on('2026-10-21').text).toBe('Expired 1 day ago');
  });

  it('inside the medicine’s alert window it warns; beyond it, it does not', () => {
    expect(on('2026-11-30')).toEqual({ tier: 'within_window', daysLeft: 39, text: '39 days left' });
    expect(on('2027-01-20')).toMatchObject({ tier: 'within_window', daysLeft: 90 });
    expect(on('2027-01-21')).toMatchObject({ tier: 'later', daysLeft: 91 });
    expect(expiryInfo('2026-10-23', '2026-10-22', 0)).toMatchObject({ tier: 'later', text: '1 day left' });
  });
});

describe('one status map', () => {
  it('gives every status a tone with colours and a text label', () => {
    for (const kind of Object.keys(STATUSES) as (keyof typeof STATUSES)[]) {
      for (const value of Object.keys(STATUSES[kind])) {
        const { tone, label } = statusOf(kind, value as never);
        expect(TONE_COLOURS[tone]).toBeDefined();
        expect(label.length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps the meanings of ui-design §5', () => {
    expect(statusOf('prescription', 'verified').tone).toBe('info');
    expect(statusOf('stockAlert', 'out_of_stock').tone).toBe('danger');
    expect(statusOf('returnAssessment', 'pending_assessment').tone).toBe('quarantine');
  });
});
