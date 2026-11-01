import { apiClient } from './client';

export type Classification = 'otc' | 'prescription' | 'controlled';

export interface Reference {
  id: string;
  code: string;
  name: string;
}

export interface Medicine {
  id: string;
  code: string;
  name: string;
  activeIngredient: string | null;
  strength: string | null;
  classification: Classification;
  classificationSource: string | null;
  classificationDate: string | null;
  reorderLevel: number;
  lowStockMonitored: boolean;
  expiryAlertDays: number;
  isActive: boolean;
  category: Reference;
  baseUnit: Reference;
  /** Numeric string in VND, e.g. "1500.00"; null if no price is in force. */
  currentPrice: string | null;
}

export interface MedicineInput {
  code: string;
  name: string;
  activeIngredient?: string;
  strength?: string;
  categoryId: string;
  baseUnitId: string;
  classification: Classification;
  classificationSource?: string;
  classificationDate?: string;
  reorderLevel: number;
  lowStockMonitored: boolean;
  expiryAlertDays: number;
  currentPrice?: number;
}

export const medicinesApi = {
  list: (params: { search?: string; categoryId?: string; includeInactive?: boolean }) =>
    apiClient.get<Medicine[]>('/medicines', { params }).then((r) => r.data),

  referenceData: () =>
    apiClient
      .get<{ categories: Reference[]; units: Reference[] }>('/medicines/reference-data')
      .then((r) => r.data),

  create: (input: MedicineInput) =>
    apiClient.post<Medicine>('/medicines', input).then((r) => r.data),

  update: (id: string, input: Partial<MedicineInput>) =>
    apiClient.patch<Medicine>(`/medicines/${id}`, input).then((r) => r.data),

  setActive: (id: string, active: boolean) =>
    apiClient
      .post<Medicine>(`/medicines/${id}/${active ? 'activate' : 'deactivate'}`)
      .then((r) => r.data),
};


/** UC13: where a price stands against the business date. */
export type PriceState = 'scheduled' | 'in_force' | 'past';

export interface PriceHistory {
  medicine: { id: string; code: string; name: string };
  /** The business date from the server, `YYYY-MM-DD`. */
  today: string;
  prices: Array<{
    id: string;
    effectiveFrom: string;
    unitPrice: string;
    state: PriceState;
    setBy: { id: string; fullName: string };
    createdAt: string;
  }>;
}

export const pricesApi = {
  history: (medicineId: string) =>
    apiClient.get<PriceHistory>(`/medicines/${medicineId}/prices`).then((r) => r.data),

  schedule: (medicineId: string, input: { unitPrice: number; effectiveFrom: string }) =>
    apiClient.post<PriceHistory>(`/medicines/${medicineId}/prices`, input).then((r) => r.data),

  cancel: (medicineId: string, priceId: string) =>
    apiClient.delete(`/medicines/${medicineId}/prices/${priceId}`).then(() => undefined),
};
