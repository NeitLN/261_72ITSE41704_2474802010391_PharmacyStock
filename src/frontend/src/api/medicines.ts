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

// VND has no minor unit in daily use, but unit costs may carry cents: show
// them only when present, so 1750.5 is not rounded to 1.751 ₫.
const vnd = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Formats a numeric string from the API as VND without using floats for storage. */
export function formatVnd(amount: string | null): string {
  return amount === null ? '—' : vnd.format(Number(amount));
}
