import { apiClient } from './client';

export interface GoodsReceiptSummary {
  id: string;
  documentNumber: string;
  receiptDate: string;
  totalCost: string;
  supplier: { id: string; name: string };
  lineCount: number;
  createdAt: string;
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
};
