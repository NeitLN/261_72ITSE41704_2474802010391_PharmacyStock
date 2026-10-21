import { apiClient } from './client';

export type StockTakeStatus = 'counting' | 'pending_approval' | 'approved' | 'cancelled';

type UserRef = { id: string; fullName: string };

export interface StockTakeSummary {
  id: string;
  referenceNumber: string;
  status: StockTakeStatus;
  openedBy: UserRef;
  countedBy: UserRef | null;
  approvedBy: UserRef | null;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  lineCount: number;
  countedCount: number;
}

export interface StockTakeLine {
  id: string;
  batch: {
    id: string;
    batchNumber: string;
    expiryDate: string;
    status: string;
    medicine: { id: string; code: string; name: string };
  };
  countedQuantity: number | null;
  reason: string | null;
  /** Null while counting: the book is hidden so it does not steer the count. */
  systemQuantity: number | null;
  difference: number | null;
  differenceValue: string | null;
}

export interface StockTake {
  id: string;
  referenceNumber: string;
  status: StockTakeStatus;
  note: string | null;
  openedBy: UserRef;
  countedBy: UserRef | null;
  submittedAt: string | null;
  approvedBy: UserRef | null;
  approvedAt: string | null;
  createdAt: string;
  lines: StockTakeLine[];
  adjustments: Array<{
    id: string;
    lineId: string;
    batchNumber: string;
    deltaSellable: number;
    occurredAt: string;
  }>;
}

export const STOCK_TAKE_STATUS_LABELS: Record<StockTakeStatus, string> = {
  counting: 'Counting',
  pending_approval: 'Waiting for approval',
  approved: 'Approved',
  cancelled: 'Cancelled',
};

export const stockTakesApi = {
  list: (status?: StockTakeStatus) =>
    apiClient
      .get<StockTakeSummary[]>('/stock-takes', { params: status ? { status } : {} })
      .then((r) => r.data),

  get: (id: string) => apiClient.get<StockTake>(`/stock-takes/${id}`).then((r) => r.data),

  open: (input: { medicineIds: string[]; note?: string }) =>
    apiClient.post<StockTake>('/stock-takes', input).then((r) => r.data),

  count: (id: string, lineId: string, input: { countedQuantity: number; reason?: string }) =>
    apiClient
      .put<StockTake>(`/stock-takes/${id}/lines/${lineId}`, input)
      .then((r) => r.data),

  submit: (id: string) =>
    apiClient.post<StockTake>(`/stock-takes/${id}/submit`).then((r) => r.data),

  approve: (id: string) =>
    apiClient.post<StockTake>(`/stock-takes/${id}/approve`).then((r) => r.data),

  returnToCounting: (id: string, comment: string) =>
    apiClient.post<StockTake>(`/stock-takes/${id}/return`, { comment }).then((r) => r.data),

  cancel: (id: string) =>
    apiClient.post<StockTake>(`/stock-takes/${id}/cancel`).then((r) => r.data),
};
