import { BusinessRuleViolation } from '../common/errors.js';

/** A batch's quantity in each stock state (DEC-04). */
export interface StockQuantities {
  qtySellable: number;
  qtyQuarantine: number;
  qtyPendingDestruction: number;
}

/** The signed change a movement makes to each stock state. */
export interface StockDeltas {
  deltaSellable: number;
  deltaQuarantine: number;
  deltaPendingDestruction: number;
}

export const NO_DELTAS: StockDeltas = {
  deltaSellable: 0,
  deltaQuarantine: 0,
  deltaPendingDestruction: 0,
};

/** The deltas that undo `deltas` exactly (a reversal, BR05). */
export function negate(deltas: StockDeltas): StockDeltas {
  return {
    deltaSellable: -deltas.deltaSellable,
    deltaQuarantine: -deltas.deltaQuarantine,
    deltaPendingDestruction: -deltas.deltaPendingDestruction,
  };
}

/**
 * Applies deltas to the quantities of one batch. Refuses, naming BR03, any
 * change that would leave a stock state below zero; the caller has the batch
 * locked, so the quantities it passes are the real ones.
 */
export function applyDeltas(
  current: StockQuantities,
  deltas: StockDeltas,
  batchNumber: string,
): StockQuantities {
  if (
    !Number.isInteger(deltas.deltaSellable) ||
    !Number.isInteger(deltas.deltaQuarantine) ||
    !Number.isInteger(deltas.deltaPendingDestruction)
  ) {
    throw new Error('Stock deltas must be whole numbers of base units.');
  }
  if (
    deltas.deltaSellable === 0 &&
    deltas.deltaQuarantine === 0 &&
    deltas.deltaPendingDestruction === 0
  ) {
    throw new Error('A stock movement must change at least one stock state.');
  }

  const next: StockQuantities = {
    qtySellable: current.qtySellable + deltas.deltaSellable,
    qtyQuarantine: current.qtyQuarantine + deltas.deltaQuarantine,
    qtyPendingDestruction:
      current.qtyPendingDestruction + deltas.deltaPendingDestruction,
  };

  if (next.qtySellable < 0) {
    throw new BusinessRuleViolation(
      'BR03',
      'INSUFFICIENT_STOCK',
      `Batch ${batchNumber} has only ${current.qtySellable} sellable.`,
    );
  }
  if (next.qtyQuarantine < 0 || next.qtyPendingDestruction < 0) {
    throw new BusinessRuleViolation(
      'BR03',
      'INSUFFICIENT_STOCK',
      `Batch ${batchNumber} does not hold that quantity in that stock state.`,
    );
  }
  return next;
}
