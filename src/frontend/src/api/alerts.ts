import { apiClient } from './client';

export type AlertType = 'low_stock' | 'out_of_stock';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';
export type AlertListStatus = 'unresolved' | 'resolved' | 'all';

export interface StockAlert {
  id: string;
  type: AlertType;
  status: AlertStatus;
  message: string;
  medicine: { id: string; code: string; name: string; reorderLevel: number };
  /** Sellable now: active batches that have not expired (DEC-08). */
  sellable: number;
  raisedAt: string;
  acknowledgedBy: { id: string; fullName: string } | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

export const alertsApi = {
  list: (query: { status?: AlertListStatus; type?: AlertType }) =>
    apiClient.get<StockAlert[]>('/alerts', { params: query }).then((r) => r.data),

  acknowledge: (id: string) =>
    apiClient.post<StockAlert>(`/alerts/${id}/acknowledge`).then((r) => r.data),
};
