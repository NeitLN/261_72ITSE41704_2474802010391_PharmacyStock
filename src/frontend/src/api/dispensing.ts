import { apiClient } from './client';
import type { PrescriptionStatus } from './prescriptions';

export interface DispenseItemInput {
  prescriptionItemId: string;
  quantity: number;
  /** Required when the item stays partly outstanding after this hand-over (DEC-02). */
  partialSupplyNote?: string | null;
}

export interface DispensePreviewInput {
  prescriptionId: string;
  items: DispenseItemInput[];
}

export interface DispenseInput extends DispensePreviewInput {
  /** `crypto.randomUUID()`, once per confirmation; resend the same one on retry (FR-23). */
  requestId: string;
}

/** Why the pharmacist should look twice at a batch (FR-16, BR02). */
export interface ExpiryWarning {
  /** WITHIN_ALERT_WINDOW: expires within the medicine's alert days; BEFORE_END_OF_USE: expires before the days of use run out. */
  kind: 'WITHIN_ALERT_WINDOW' | 'BEFORE_END_OF_USE';
  daysLeft: number;
}

/** One batch FEFO drew from (BR01); several per item when a batch runs out. */
export interface AllocatedBatch {
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  warning: ExpiryWarning | null;
}

export interface DispensePreviewItem {
  prescriptionItemId: string;
  medicine: { id: string; code: string; name: string };
  requested: number;
  /** Sellable quantity of eligible batches now (FR-18). */
  available: number;
  quantityOutstanding: number;
  /** Empty when the request cannot be met. */
  batches: AllocatedBatch[];
  /** True when this hand-over leaves part of the item outstanding, so a note is needed. */
  needsPartialSupplyNote: boolean;
}

/** What FEFO would issue now; nothing is reserved (DEC-05). */
export interface DispensePreview {
  prescriptionId: string;
  items: DispensePreviewItem[];
}

/** The confirmed hand-over. */
export interface DispenseResult {
  requestId: string;
  prescriptionId: string;
  /** New status after this hand-over (FR-22). */
  status: PrescriptionStatus;
  dispensedAt: string;
  items: Array<{
    prescriptionItemId: string;
    medicine: { id: string; code: string; name: string };
    quantityDispensed: number;
    quantityOutstanding: number;
    lines: Array<{
      dispenseLineId: string;
      batchId: string;
      batchNumber: string;
      expiryDate: string;
      quantity: number;
      warning: ExpiryWarning | null;
    }>;
  }>;
}

export const dispensingApi = {
  preview: (input: DispensePreviewInput) =>
    apiClient.post<DispensePreview>('/dispensings/preview', input).then((r) => r.data),

  /**
   * Shortage → 422 BR03 INSUFFICIENT_STOCK with the field `items.N.quantity`;
   * over the prescribed quantity → 422 BR07; prescription past valid-until →
   * 422 BR10; not verified → 422 BR04; missing note → 400 `items.N.partialSupplyNote`.
   */
  dispense: (input: DispenseInput) =>
    apiClient.post<DispenseResult>('/dispensings', input).then((r) => r.data),
};
