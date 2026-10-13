import { createContext, useContext } from 'react';
import type { Me } from '../api/me';

export interface AuthState {
  /** The signed-in user, or null on the sign-in page. */
  user: Me | null;
  /**
   * True after the user chose *Sign out*: the next sign-in starts from the
   * start page instead of the page the previous user was on.
   */
  signedOutByUser: boolean;
  /** Throws the API error on failure, so the form can show it per field. */
  signIn: (username: string, password: string) => Promise<Me>;
  signOut: () => Promise<void>;
  /** For hiding menu items and buttons only; the API checks every request (FR-39). */
  can: (permission: string) => boolean;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>.');
  return auth;
}
