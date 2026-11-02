import type { Me } from '../api/me';

/** What `POST /api/auth/login` returns (UC16). */
export interface Session {
  accessToken: string;
  /** ISO time; the API refuses the token after it (8 hours, FR-38). */
  expiresAt: string;
  user: Me;
}

const STORAGE_KEY = 'pharmacy.session';
const EXPIRED_KEY = 'pharmacy.session-expired';

/**
 * Kept in sessionStorage, so closing the tab signs the user out. Scripts on
 * the page can read it, which is why the client loads no third-party scripts
 * (docs/design/access-control.md, Limitations).
 */
export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (Date.parse(session.expiresAt) <= Date.now()) {
      sessionStorage.removeItem(STORAGE_KEY);
      // Expired while the page was closed: sign-in says so (#257).
      sessionStorage.setItem(EXPIRED_KEY, '1');
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/** True once after `loadSession` found the stored session expired. */
export function takeExpiredNotice(): boolean {
  try {
    const expired = sessionStorage.getItem(EXPIRED_KEY) !== null;
    sessionStorage.removeItem(EXPIRED_KEY);
    return expired;
  } catch {
    return false;
  }
}

export function saveSession(session: Session): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage unavailable: the session lasts until the page reloads.
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored.
  }
}

/** Fired by the API client when the server refuses the token (401). */
export const SESSION_ENDED_EVENT = 'pharmacy:session-ended';
