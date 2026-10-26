import { apiClient } from './client';

interface Envelope<Q, R, T> {
  kind: string;
  query: Q;
  producedAt: string;
  producedBy: { id: string; fullName: string };
  rows: R[];
  totals: T;
}

export interface MovementFigures {
  opening: number;
  received: number;
  dispensed: number;
  sold: number;
  returned: number;
  released: number;
  rejected: number;
  writtenOff: number;
  destroyed: number;
  adjusted: number;
  closing: { total: number; sellable: number; quarantine: number; pendingDestruction: number };
  netIssued: number;
  costNetIssued: string;
}

export interface StockMovementRow extends MovementFigures {
  medicine: { id: string; code: string; name: string };
  checkOk: boolean;
}

export interface StockMovementQuery {
  from: string;
  to: string;
  categoryId?: string;
}

export type StockMovementReport = Envelope<StockMovementQuery, StockMovementRow, MovementFigures>;

export interface MovementLine {
  id: string;
  occurredAt: string;
  type: string;
  batchNumber: string;
  deltaSellable: number;
  deltaQuarantine: number;
  deltaPendingDestruction: number;
  reason: string | null;
  performedBy: string;
  source: { type: string; id: string; reference: string | null };
  isReversal: boolean;
}

export const reportsApi = {
  stockMovement: (query: StockMovementQuery) =>
    apiClient
      .get<StockMovementReport>('/reports/stock-movement', { params: query })
      .then((r) => r.data),

  movements: (medicineId: string, query: StockMovementQuery) =>
    apiClient
      .get<{ medicine: { id: string; code: string; name: string }; movements: MovementLine[] }>(
        `/reports/stock-movement/medicines/${medicineId}`,
        { params: { from: query.from, to: query.to } },
      )
      .then((r) => r.data),
};
