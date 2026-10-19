import { App } from 'antd';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import type { Me } from '../api/me';
import { AuthContext, type AuthState } from './authContext';
import {
  clearSession,
  loadSession,
  saveSession,
  type Session,
  SESSION_ENDED_EVENT,
} from './session';

/**
 * Holds the signed-in user for the whole app (UC16). The session survives a
 * page reload but not closing the tab, and ends when the API refuses the
 * token or when it reaches its expiry time.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { message } = App.useApp();
  const [session, setSession] = useState<Session | null>(loadSession);
  const [signedOutByUser, setSignedOutByUser] = useState(false);

  const end = useCallback(
    (notice?: string) => {
      clearSession();
      setSession(null);
      if (notice) message.warning(notice);
    },
    [message],
  );

  // The API client reports a refused token (expired, or account locked).
  useEffect(() => {
    const onEnded = () => end('Your session has ended. Please sign in again.');
    window.addEventListener(SESSION_ENDED_EVENT, onEnded);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, onEnded);
  }, [end]);

  // Sign out at the expiry time even if no request is made (TC-43).
  useEffect(() => {
    if (!session) return;
    const left = Date.parse(session.expiresAt) - Date.now();
    const timer = window.setTimeout(
      () => end('Your session has expired. Please sign in again.'),
      Math.max(left, 0),
    );
    return () => window.clearTimeout(timer);
  }, [session, end]);

  // After a reload, refresh the permissions: a manager may have changed them.
  const token = session?.accessToken;
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiClient.get<Me>('/auth/me').then(
      ({ data }) => {
        if (cancelled) return;
        setSession((current) => {
          if (!current) return current;
          const next = { ...current, user: data };
          saveSession(next);
          return next;
        });
      },
      () => {
        // A 401 is handled by the API client; anything else keeps the
        // stored user until the next request.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      signedOutByUser,
      signIn: async (username, password) => {
        const { data } = await apiClient.post<Session>('/auth/login', {
          username,
          password,
        });
        saveSession(data);
        setSignedOutByUser(false);
        setSession(data);
        return data.user;
      },
      signOut: async () => {
        try {
          await apiClient.post('/auth/logout');
        } catch {
          // Signing out must work even if the server cannot be reached.
        }
        setSignedOutByUser(true);
        end();
      },
      can: (permission) => session?.user.permissions.includes(permission) ?? false,
    }),
    [session, signedOutByUser, end],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
