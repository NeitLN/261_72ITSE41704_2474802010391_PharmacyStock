import { apiClient } from './client';

export interface GoodsReceiptSummary {
  id: string;
  documentNumber: string;
  receiptDate: string;
  totalCost: string;
  supplier: { id: string; name: string };
  lineCount: number;
  createdAt: string;
  /** True once the whole receipt was undone by opposite movements. */
  reversed: boolean;
}

export interface GoodsReceipt {
  id: string;
  documentNumber: string;
  receiptDate: string;
  note: string | null;
  totalCost: string;
  supplier: { id: string; name: string };
  receivedBy: { id: string; fullName: string };
  createdAt: string;
  lines: Array<{
    lineNumber: number;
    medicine: { id: string; code: string; name: string };
    batch: { id: string; batchNumber: string; expiryDate: string; qtySellable: number };
    quantity: number;
    unitCost: string;
  }>;
  reversed: { at: string; by: string; reason: string } | null;
}

export interface GoodsReceiptLineInput {
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unitCost: number;
}

export interface GoodsReceiptInput {
  supplierId: string;
  documentNumber: string;
  receiptDate: string;
  note?: string;
  lines: GoodsReceiptLineInput[];
}

export const goodsReceiptsApi = {
  list: () => apiClient.get<GoodsReceiptSummary[]>('/goods-receipts').then((r) => r.data),

  get: (id: string) =>
    apiClient.get<GoodsReceipt>(`/goods-receipts/${id}`).then((r) => r.data),

  create: (input: GoodsReceiptInput) =>
    apiClient.post<GoodsReceipt>('/goods-receipts', input).then((r) => r.data),

  /** Undoes the whole receipt with opposite movements; refused once any of its stock has left. */
  reverse: (id: string, reason: string) =>
    apiClient.post<GoodsReceipt>(`/goods-receipts/${id}/reverse`, { reason }).then((r) => r.data),
};
