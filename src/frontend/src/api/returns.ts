import { apiClient } from './client';

/** One sale line and what can still come back (UC08, S01). */
export interface ReturnableLine {
  saleLineId: string;
  medicine: { id: string; code: string; name: string };
  batch: { id: string; batchNumber: string; expiryDate: string };
  quantitySold: number;
  quantityReturned: number;
  /** Sold minus already returned; 0 means nothing left to return on this line. */
  returnable: number;
  /** Price paid on the sale date, decimal string. */
  unitPrice: string;
  /** True when the line came from billing a hand-over (UC07, A7). */
  billed: boolean;
}

/** GET /api/returns/sales/:receiptNumber: the sale and its returnable lines. */
export interface ReturnableSale {
  id: string;
  receiptNumber: string;
  /** Sale time, ISO string. */
  soldAt: string;
  customer: { id: string; code: string; fullName: string } | null;
  lines: ReturnableLine[];
}

/** One line sent to POST /api/returns. */
export interface ReturnLineInput {
  saleLineId: string;
  quantity: number;
}

/** POST /api/returns body (UC08). */
export interface ReturnInput {
  /** `crypto.randomUUID()`, once per return; resending it returns the first result (FR-23). */
  requestId: string;
  saleId: string;
  reason: string;
  lines: ReturnLineInput[];
}

/** One stored return line: refund is at the price paid, goods wait in quarantine. */
export interface ReturnLine {
  saleLineId: string;
  medicine: { id: string; code: string; name: string };
  batch: { id: string; batchNumber: string; expiryDate: string };
  quantity: number;
  unitPrice: string;
  refund: string;
  /** PENDING_ASSESSMENT until a manager assesses the goods (UC11, DEC-04). */
  assessmentStatus: string;
}

/** The stored return, as its slip shows it. */
export interface SaleReturn {
  id: string;
  referenceNumber: string;
  /** Return time, ISO string. */
  returnedAt: string;
  sale: { id: string; receiptNumber: string };
  reason: string;
  lines: ReturnLine[];
  refundAmount: string;
}

export const returnsApi = {
  /**
   * 404 when no sale has that number (A8). The number is a path segment, so it
   * is URL-encoded before it goes out.
   */
  findSale: (receiptNumber: string) =>
    apiClient
      .get<ReturnableSale>(`/returns/sales/${encodeURIComponent(receiptNumber)}`)
      .then((r) => r.data),

  /**
   * 422 RETURN_EXCEEDS_SOLD on `lines.N.quantity` (A1);
   * a reused request ID with other content → 409 (A5).
   */
  create: (input: ReturnInput) =>
    apiClient.post<SaleReturn>('/returns', input).then((r) => r.data),

  /** The return again, e.g. to show or print (GET /api/returns/:id). */
  get: (id: string) => apiClient.get<SaleReturn>(`/returns/${id}`).then((r) => r.data),
};
