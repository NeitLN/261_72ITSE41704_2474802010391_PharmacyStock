import { apiClient } from './client';

export type RoleCode = 'MANAGER' | 'PHARMACIST' | 'CASHIER';

export interface UserRow {
  id: string;
  username: string;
  fullName: string;
  role: { code: RoleCode; name: string };
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface RoleRow {
  code: RoleCode;
  name: string;
  permissions: string[];
  userCount: number;
}

export interface AuditEntry {
  id: string;
  occurredAt: string;
  action: string;
  entityName: string;
  entityId: string | null;
  details: unknown;
  performedBy: { id: string; fullName: string } | null;
}

export interface AuditQuery {
  from?: string;
  to?: string;
  userId?: string;
  action?: string;
  page?: number;
}

/** UC15 users, roles and the audit log (FR-40, FR-41). */
export const usersApi = {
  list: () => apiClient.get<UserRow[]>('/users').then((r) => r.data),

  create: (input: {
    username: string;
    fullName: string;
    roleCode: RoleCode;
    password: string;
    passwordConfirm: string;
  }) => apiClient.post<UserRow>('/users', input).then((r) => r.data),

  update: (id: string, change: { fullName?: string; roleCode?: RoleCode; isActive?: boolean }) =>
    apiClient.patch<UserRow>(`/users/${id}`, change).then((r) => r.data),

  resetPassword: (id: string, password: string, passwordConfirm: string) =>
    apiClient.post(`/users/${id}/password`, { password, passwordConfirm }).then(() => undefined),

  roles: () =>
    apiClient
      .get<{ roles: RoleRow[]; allPermissions: Array<{ code: string; description: string }> }>('/roles')
      .then((r) => r.data),

  setRolePermissions: (code: RoleCode, permissions: string[]) =>
    apiClient.put<RoleRow>(`/roles/${code}/permissions`, { permissions }).then((r) => r.data),

  audit: (query: AuditQuery) =>
    apiClient
      .get<{ items: AuditEntry[]; total: number }>('/audit-logs', { params: query })
      .then((r) => r.data),
};
