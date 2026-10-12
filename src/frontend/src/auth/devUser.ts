/**
 * TEMPORARY until sign-in (UC16, issue #44): the user the UI acts as.
 *
 * The backend runs with AUTH_MODE=dev and trusts the X-Dev-User header, so
 * the header picks one of the seeded sample accounts. The login page replaces
 * this file; nothing else in the UI reads it directly.
 */
export type DevUsername = 'manager' | 'pharmacist' | 'cashier';

export const DEV_USERS: { username: DevUsername; label: string }[] = [
  { username: 'manager', label: 'Manager' },
  { username: 'pharmacist', label: 'Pharmacist' },
  { username: 'cashier', label: 'Cashier' },
];

const STORAGE_KEY = 'pharmacy.devUser';

export function getDevUser(): DevUsername {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (DEV_USERS.some((u) => u.username === stored)) {
      return stored as DevUsername;
    }
  } catch {
    // Storage unavailable: fall back to the default.
  }
  return 'manager';
}

export function setDevUser(username: DevUsername): void {
  try {
    localStorage.setItem(STORAGE_KEY, username);
  } catch {
    // Storage unavailable: the choice lasts until the page reloads.
  }
}
