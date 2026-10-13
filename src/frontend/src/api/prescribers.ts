import { apiClient } from './client';

export interface Prescriber {
  id: string;
  licenceNumber: string;
  fullName: string;
  clinicName: string | null;
  isActive: boolean;
}

/** Fields the form edits. An empty clinic string clears the value. */
export interface PrescriberInput {
  licenceNumber: string;
  fullName: string;
  clinicName?: string;
}

export const prescribersApi = {
  list: (params: { search?: string; active?: boolean }) =>
    apiClient.get<Prescriber[]>('/prescribers', { params }).then((r) => r.data),

  get: (id: string) => apiClient.get<Prescriber>(`/prescribers/${id}`).then((r) => r.data),

  create: (input: PrescriberInput) =>
    apiClient.post<Prescriber>('/prescribers', input).then((r) => r.data),

  update: (id: string, input: Partial<PrescriberInput>) =>
    apiClient.patch<Prescriber>(`/prescribers/${id}`, input).then((r) => r.data),

  deactivate: (id: string) =>
    apiClient.post<Prescriber>(`/prescribers/${id}/deactivate`).then((r) => r.data),

  activate: (id: string) =>
    apiClient.post<Prescriber>(`/prescribers/${id}/activate`).then((r) => r.data),
};
