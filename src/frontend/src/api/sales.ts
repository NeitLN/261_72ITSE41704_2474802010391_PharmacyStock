import { apiClient } from './client';
import type { ExpiryWarning } from './dispensing';

/** One over-the-counter line of a cart, sent to POST /api/sales. */
export interface OtcLineInput {
  medicineId: string;
  quantity: number;
}

/** POST /api/sales body (UC07); at least one of prescriptionId and otcLines. */
export interface SaleInput {
  /** `crypto.randomUUID()`, once per cart; resending it returns the first receipt (FR-23). */
  requestId: string;
  /** Set when the sale bills a UC06 hand-over. */
  prescriptionId?: string;
  otcLines?: OtcLineInput[];
  customerId?: string;
}

/** One receipt line; an OTC line that FEFO split over two batches appears twice. */
export interface SaleLine {
  medicine: { id: string; code: string; name: string };
  batch: { id: string; batchNumber: string; expiryDate: string };
  quantity: number;
  /** Price in force on the sale date, decimal string (decision 12, BR09). */
  unitPrice: string;
  lineTotal: string;
  /** True when the line bills a UC06 hand-over and moves no stock (DEC-05, FR-26). */
  billed: boolean;
  /** BR02, FR-16: the batch sold expires within the alert window; null for a billed line. */
  warning: ExpiryWarning | null;
}

/** One dispense line of a UC06 hand-over that no sale has billed yet. */
export interface BillableLine {
  dispenseLineId: string;
  medicine: { id: string; code: string; name: string };
  batch: { id: string; batchNumber: string; expiryDate: string };
  quantity: number;
  /** When this line was handed over, ISO string. */
  dispensedAt: string;
}

/** A prescription whose hand-over is still waiting for payment (UC07). */
export interface BillablePrescription {
  id: string;
  referenceNumber: string;
  customer: { id: string; code: string; fullName: string };
  /** The most recent hand-over of this prescription, ISO string. */
  lastDispensedAt: string;
  /** Every unbilled dispense line; billing pays them all in one sale. */
  lines: BillableLine[];
}

/** The stored sale, as the receipt shows it. */
export interface Sale {
  id: string;
  receiptNumber: string;
  /** Payment time, ISO string. */
  soldAt: string;
  customer: { id: string; code: string; fullName: string } | null;
  lines: SaleLine[];
  totalAmount: string;
}

export const salesApi = {
  /**
   * Hand-overs waiting for payment: dispense lines of one prescription with
   * no sale yet. Billing records money only — no stock movement (DEC-05).
   */
  billable: () =>
    apiClient
      .get<BillablePrescription[]>('/sales/billable')
      .then((r) => r.data),

  /**
   * Shortage → 422 BR03 INSUFFICIENT_STOCK with `otcLines.N.quantity`;
   * prescription-only or controlled medicine → 422 BR04 (DEC-09);
   * deactivated or no price in force → 422 on that line (A4);
   * a reused request ID with other content → 409.
   */
  create: (input: SaleInput) =>
    apiClient.post<Sale>('/sales', input).then((r) => r.data),

  /** The receipt again, e.g. to show or print (GET /api/sales/:id). */
  get: (id: string) => apiClient.get<Sale>(`/sales/${id}`).then((r) => r.data),
};

/**
 * Money helpers for the cart estimate (TC-52): the estimate is computed in
 * whole xu as bigint, never with binary floats. "1750.50" -> 175050 xu.
 */
export function vndToXu(amount: string): bigint {
  const [whole, fraction = ''] = amount.split('.');
  const digits = `${whole}${fraction.slice(0, 2).padEnd(2, '0')}`;
  if (!/^\d+$/.test(digits)) {
    throw new Error(`Not a money amount: ${amount}`);
  }
  return BigInt(digits);
}

/** Back from xu: 175050 xu -> "1750.50", ready for formatVnd. */
export function xuToVndString(xu: bigint): string {
  const digits = xu.toString().padStart(3, '0');
  return `${digits.slice(0, -2)}.${digits.slice(-2)}`;
}

/** unitPrice × quantity in xu; quantity is a whole unit count. */
export function lineEstimateXu(unitPrice: string, quantity: number): bigint {
  return vndToXu(unitPrice) * BigInt(quantity);
}
