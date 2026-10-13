import { BatchStatus } from '../entities/index.js';
import { type ExpiryWarning, ExpiryPolicy } from './expiry-policy.js';

/** What the allocator needs to know about a batch. `Batch` satisfies it. */
export interface BatchCandidate {
  id: string;
  batchNumber: string;
  expiryDate: string;
  receivedAt: Date;
  qtySellable: number;
  status: BatchStatus;
}

export interface AllocatedLine<B extends BatchCandidate> {
  batch: B;
  quantity: number;
  warning: ExpiryWarning | null;
}

export type Allocation<B extends BatchCandidate> =
  | { ok: true; lines: AllocatedLine<B>[]; available: number }
  /** Not enough eligible stock: nothing is allocated (FR-18, DEC-02). */
  | { ok: false; lines: []; available: number };

export interface AllocationRequest<B extends BatchCandidate> {
  batches: B[];
  quantity: number;
  businessDate: string;
  /** The medicine's expiry-alert window in days (FR-16). */
  alertDays: number;
  /** Days of use of the prescription item; none for an over-the-counter sale. */
  daysOfUse?: number | null;
}

/** DEC-07: earliest expiry, then received first, then batch number, then id. */
export function compareFefo(a: BatchCandidate, b: BatchCandidate): number {
  return (
    a.expiryDate.localeCompare(b.expiryDate) ||
    a.receivedAt.getTime() - b.receivedAt.getTime() ||
    a.batchNumber.localeCompare(b.batchNumber) ||
    a.id.localeCompare(b.id)
  );
}

/**
 * BR01 FEFO with BR02. Takes the requested quantity from the eligible batch
 * that expires first and continues into the next, one line per batch.
 * Eligible: ACTIVE, sellable quantity above zero, expiry after the business
 * date (DEC-01, DEC-07).
 *
 * `StockLedger.lockEligibleBatches` already returns only eligible batches in
 * this order; the allocator applies the rule again so that it holds on its
 * own and can be tested without a database. It changes nothing: the caller
 * posts the movements.
 */
export class FefoAllocator {
  static isEligible(batch: BatchCandidate, businessDate: string): boolean {
    return (
      batch.status === BatchStatus.ACTIVE &&
      batch.qtySellable > 0 &&
      ExpiryPolicy.isIssuable(batch.expiryDate, businessDate)
    );
  }

  static allocate<B extends BatchCandidate>(
    request: AllocationRequest<B>,
  ): Allocation<B> {
    if (!Number.isInteger(request.quantity) || request.quantity < 1) {
      throw new RangeError('Quantity to allocate must be a positive integer.');
    }
    const eligible = request.batches
      .filter((b) => FefoAllocator.isEligible(b, request.businessDate))
      .sort(compareFefo);
    const available = eligible.reduce((sum, b) => sum + b.qtySellable, 0);
    if (available < request.quantity) {
      return { ok: false, lines: [], available };
    }

    const lines: AllocatedLine<B>[] = [];
    let remaining = request.quantity;
    for (const batch of eligible) {
      if (remaining === 0) break;
      const quantity = Math.min(remaining, batch.qtySellable);
      lines.push({
        batch,
        quantity,
        warning: ExpiryPolicy.warningFor(
          batch.expiryDate,
          request.businessDate,
          {
            alertDays: request.alertDays,
            daysOfUse: request.daysOfUse,
          },
        ),
      });
      remaining -= quantity;
    }
    return { ok: true, lines, available };
  }
}
