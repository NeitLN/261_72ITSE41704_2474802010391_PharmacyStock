import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, loadSession, saveSession, type Session, takeExpiredNotice } from './session';

// The tests run in Node, which has no sessionStorage; a Map stands in for it.
beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });
});

const session = (expiresAt: string): Session => ({
  accessToken: 'token',
  expiresAt,
  user: { id: 'u1', username: 'cashier', fullName: 'Sample Cashier', role: 'CASHIER', permissions: [] },
});

describe('session storage (UC16, #257)', () => {
  it('keeps a session until its expiry and says nothing', () => {
    saveSession(session('2999-01-01T00:00:00Z'));
    expect(loadSession()?.accessToken).toBe('token');
    expect(takeExpiredNotice()).toBe(false);
  });

  it('drops an expired session and leaves the expired notice once', () => {
    saveSession(session('2000-01-01T00:00:00Z'));
    expect(loadSession()).toBeNull();
    expect(takeExpiredNotice()).toBe(true);
    expect(takeExpiredNotice()).toBe(false);
  });

  it('signing out leaves no session and no notice', () => {
    saveSession(session('2999-01-01T00:00:00Z'));
    clearSession();
    expect(loadSession()).toBeNull();
    expect(takeExpiredNotice()).toBe(false);
  });
});
