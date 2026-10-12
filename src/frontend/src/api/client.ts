import axios from 'axios';
import { getDevUser } from '../auth/devUser';

/**
 * Shared HTTP client for every call to the Pharmacy API.
 * The base URL comes from the environment so the same build can point at a
 * different backend without code changes.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});

// TEMPORARY until sign-in (UC16): act as the user chosen in the header bar.
apiClient.interceptors.request.use((config) => {
  config.headers.set('X-Dev-User', getDevUser());
  return config;
});
