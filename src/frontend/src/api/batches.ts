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

export type ReleaseBlock = 'controlled' | 'expired' | 'batch_not_active';

export interface QuarantineLine {
  returnLineId: string;
  saleReturn: { id: string; referenceNumber: string; returnedAt: string; reason: string };
  medicine: { id: string; code: string; name: string; classification: string };
  batch: { id: string; batchNumber: string; expiryDate: string; status: BatchStatus };
  quantity: number;
  /** Why *Release* is not possible; the line can still be rejected. */
  releaseBlockedBy: ReleaseBlock | null;
}

export interface AssessInput {
  outcome: 'release' | 'reject';
  packagingIntact: boolean;
  storageCredible: boolean;
  note: string;
}

export type DestructionMethod = 'supplier_return' | 'licensed_contractor' | 'other';

export interface DestructionInput {
  quantity: number;
  destroyedOn: string;
  method: DestructionMethod;
  methodNote?: string;
  witness: string;
  note?: string;
}

export interface DestructionRecord extends DestructionInput {
  id: string;
  recordedBy: { id: string; fullName: string };
  recordedAt: string;
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

  /** FR-46: returned goods waiting for the manager's assessment. */
  quarantine: () => apiClient.get<QuarantineLine[]>('/quarantine').then((r) => r.data),

  assess: (returnLineId: string, input: AssessInput) =>
    apiClient.post(`/quarantine/${returnLineId}/assess`, input).then((r) => r.data),

  /** FR-47: batches holding stock pending destruction, and recording a destruction. */
  pendingDestruction: () =>
    apiClient.get<BatchView[]>('/batches/pending-destruction').then((r) => r.data),

  destructions: (id: string) =>
    apiClient.get<DestructionRecord[]>(`/batches/${id}/destructions`).then((r) => r.data),

  recordDestruction: (id: string, input: DestructionInput) =>
    apiClient.post<DestructionRecord>(`/batches/${id}/destructions`, input).then((r) => r.data),
};
