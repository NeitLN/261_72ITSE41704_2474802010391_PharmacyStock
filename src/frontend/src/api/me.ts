import { apiClient } from './client';
import { useLoad } from './useLoad';

export interface Me {
  id: string;
  username: string;
  fullName: string;
  role: 'MANAGER' | 'PHARMACIST' | 'CASHIER';
  permissions: string[];
}

const fetchMe = () => apiClient.get<Me>('/auth/me').then((r) => r.data);

/**
 * The signed-in user and their permissions. Screens use it only to hide
 * actions the user cannot take; the API checks every request regardless.
 */
export function useMe() {
  // fetchMe is a module-level function, so it is the same on every render.
  const { data } = useLoad<Me | null>(fetchMe, null);
  return {
    me: data,
    can: (permission: string) => data?.permissions.includes(permission) ?? false,
  };
}
