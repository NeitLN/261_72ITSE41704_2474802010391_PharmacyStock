import { apiClient } from './client';
import type { Reference } from './medicines';

export type StockState = 'all' | 'in_stock' | 'out_of_stock' | 'has_expired';
export type BatchState = 'active' | 'expired' | 'on_hold' | 'recalled' | 'rejected';
export type MovementType =
  | 'receipt'
  | 'dispense'
  | 'sale'
  | 'return'
  | 'release'
  | 'reject'
  | 'write_off'
  | 'destroy'
  | 'adjustment';

/** Quantities by what can be done with them (UC04 decisions). */
export interface StockTotals {
  sellable: number;
  expired: number;
  held: number;
  quarantine: number;
  pendingDestruction: number;
}

export interface StockMedicine {
  id: string;
  code: string;
  name: string;
  strength: string | null;
  isActive: boolean;
  category: Reference;
  baseUnit: Reference;
}

export interface StockRow extends StockTotals {
  medicine: StockMedicine;
  nextExpiry: string | null;
}

export interface StockPage {
  items: StockRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StockBatch {
  id: string;
  batchNumber: string;
  expiryDate: string;
  receivedAt: string;
  status: string;
  state: BatchState;
  daysLeft: number;
  qtySellable: number;
  qtyQuarantine: number;
  qtyPendingDestruction: number;
}

export interface MedicineStock {
  medicine: StockMedicine;
  totals: StockTotals;
  batches: StockBatch[];
}

export interface Movement {
  id: string;
  occurredAt: string;
  type: MovementType;
  deltaSellable: number;
  deltaQuarantine: number;
  deltaPendingDestruction: number;
  balanceSellable: number;
  balanceQuarantine: number;
  balancePendingDestruction: number;
  reason: string | null;
  performedBy: { id: string; fullName: string };
  source: { type: string; id: string; reference: string | null };
  reverses: { id: string; type: MovementType; occurredAt: string } | null;
  reversedBy: { id: string; occurredAt: string } | null;
}

export interface BatchHistory {
  batch: {
    id: string;
    batchNumber: string;
    expiryDate: string;
    status: string;
    medicine: { id: string; code: string; name: string };
  };
  movements: Movement[];
}

export const stockApi = {
  list: (params: {
    search?: string;
    categoryId?: string;
    state?: StockState;
    includeInactive?: boolean;
    page?: number;
    pageSize?: number;
  }) => apiClient.get<StockPage>('/stock', { params }).then((r) => r.data),

  medicine: (id: string) =>
    apiClient.get<MedicineStock>(`/stock/medicines/${id}`).then((r) => r.data),

  history: (batchId: string) =>
    apiClient.get<BatchHistory>(`/stock/batches/${batchId}/movements`).then((r) => r.data),
};
