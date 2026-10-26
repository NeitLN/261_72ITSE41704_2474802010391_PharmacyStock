import { apiClient } from './client';

export type BatchStatus = 'active' | 'on_hold' | 'recalled' | 'rejected';

export interface BatchView {
  id: string;
  batchNumber: string;
  expiryDate: string;
  status: BatchStatus;
  statusReason: string | null;
  statusChangedBy: { id: string; fullName: string } | null;
  statusChangedAt: string | null;
  qtySellable: number;
  qtyQuarantine: number;
  qtyPendingDestruction: number;
  medicine: { id: string; code: string; name: string };
}

export interface ExpiryRow {
  batch: { id: string; batchNumber: string; expiryDate: string; status: BatchStatus };
  medicine: { id: string; code: string; name: string; expiryAlertDays: number };
  state: 'expired' | 'expiring_soon';
  daysLeft: number;
  sellable: number;
  value: string;
  canWriteOff: boolean;
}

export interface ExpiryReport {
  kind: 'expiry';
  producedAt: string;
  rows: ExpiryRow[];
  totals: {
    businessDate: string;
    expired: { batches: number; quantity: number; value: string };
    expiringSoon: { batches: number; quantity: number; value: string };
  };
}

/** UC11: the expiry list, write-off (FR-36) and batch status (FR-48). */
export const batchesApi = {
  expiry: (categoryId?: string) =>
    apiClient
      .get<ExpiryReport>('/reports/expiry', { params: categoryId ? { categoryId } : {} })
      .then((r) => r.data),

  writeOff: (id: string, reason: string) =>
    apiClient
      .post<{ batch: BatchView }>(`/batches/${id}/write-off`, { reason })
      .then((r) => r.data),

  setStatus: (id: string, status: BatchStatus, reason: string) =>
    apiClient.post<BatchView>(`/batches/${id}/status`, { status, reason }).then((r) => r.data),
};
