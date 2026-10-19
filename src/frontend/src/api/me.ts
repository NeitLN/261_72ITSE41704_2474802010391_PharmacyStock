import { useAuth } from '../auth/authContext';

export interface Me {
  id: string;
  username: string;
  fullName: string;
  role: 'MANAGER' | 'PHARMACIST' | 'CASHIER';
  permissions: string[];
}

/**
 * The signed-in user and their permissions, from the session (UC16). Screens
 * use it only to hide actions the user cannot take; the API checks every
 * request regardless.
 */
export function useMe() {
  const { user, can } = useAuth();
  return { me: user, can };
}
