import { apiClient } from './client';

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  contactPerson: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
}

/** Fields the form edits. An empty optional string clears the value. */
export interface SupplierInput {
  name: string;
  phone: string;
  address?: string;
  contactPerson?: string;
  email?: string;
}

export const suppliersApi = {
  list: (params: { search?: string; includeInactive?: boolean }) =>
    apiClient.get<Supplier[]>('/suppliers', { params }).then((r) => r.data),

  create: (input: SupplierInput) =>
    apiClient.post<Supplier>('/suppliers', input).then((r) => r.data),

  update: (id: string, input: SupplierInput) =>
    apiClient.patch<Supplier>(`/suppliers/${id}`, input).then((r) => r.data),

  setActive: (id: string, active: boolean) =>
    apiClient
      .post<Supplier>(`/suppliers/${id}/${active ? 'activate' : 'deactivate'}`)
      .then((r) => r.data),
};
