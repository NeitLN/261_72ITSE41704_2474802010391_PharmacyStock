import axios, { isAxiosError } from 'axios';
import { clearSession, loadSession, SESSION_ENDED_EVENT } from '../auth/session';

/**
 * Shared HTTP client for every call to the Pharmacy API.
 * The base URL comes from the environment so the same build can point at a
 * different backend without code changes.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Every request carries the session token from sign-in (UC16).
apiClient.interceptors.request.use((config) => {
  const session = loadSession();
  if (session) config.headers.set('Authorization', `Bearer ${session.accessToken}`);
  return config;
});

// A 401 on anything but the sign-in itself means the session expired or the
// account was locked: drop the token and let the app return to sign-in.
apiClient.interceptors.response.use(undefined, (error: unknown) => {
  if (
    isAxiosError(error) &&
    error.response?.status === 401 &&
    !error.config?.url?.endsWith('/auth/login')
  ) {
    clearSession();
    window.dispatchEvent(new Event(SESSION_ENDED_EVENT));
  }
  return Promise.reject(error);
});
