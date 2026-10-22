import { Injectable } from '@nestjs/common';
import { type EntityManager, In, Not } from 'typeorm';
import { AlertStatus, AlertType, StockAlert } from '../entities/index.js';
import { Clock } from './clock.js';

const LEVEL_TYPES = [AlertType.LOW_STOCK, AlertType.OUT_OF_STOCK];

/** What a medicine's stock says about alerts right now. */
export interface StockLevel {
  medicineId: string;
  name: string;
  reorderLevel: number;
  monitored: boolean;
  sellable: number;
}

/**
 * The DEC-08 rule: OUT_OF_STOCK at 0, LOW_STOCK above 0 and at or below the
 * reorder level, nothing otherwise or when the medicine is not monitored.
 */
export function wantedAlert(level: StockLevel): AlertType | null {
  if (!level.monitored) return null;
  if (level.sellable === 0) return AlertType.OUT_OF_STOCK;
  if (level.sellable <= level.reorderLevel) return AlertType.LOW_STOCK;
  return null;
}

export function alertMessage(type: AlertType, level: StockLevel): string {
  return type === AlertType.OUT_OF_STOCK
    ? `${level.name}: no sellable stock left (reorder level ${level.reorderLevel}).`
    : `${level.name}: ${level.sellable} sellable, reorder level ${level.reorderLevel}.`;
}

/**
 * UC10 — raises and resolves LOW_STOCK and OUT_OF_STOCK alerts (FR-33,
 * DEC-08, decision 16).
 *
 * Callers pass medicines whose rows they hold locked, so two transactions
 * cannot evaluate the same medicine at once: at most one unresolved
 * stock-level alert exists per medicine, and the partial unique index
 * `uq_stock_alerts_open_level` is only the safety net. `StockLedger.run`
 * calls it for every medicine a stock command locked, and the catalogue
 * calls it when a reorder level or a monitoring switch changes.
 */
@Injectable()
export class AlertEvaluator {
  constructor(private readonly clock: Clock) {}

  /** Sellable quantity per medicine: the same rule as `lockEligibleBatches`. */
  async levels(
    manager: EntityManager,
    medicineIds: string[],
  ): Promise<StockLevel[]> {
    if (medicineIds.length === 0) return [];
    const rows = await manager.query<
      Array<{
        id: string;
        name: string;
        reorderLevel: number;
        monitored: boolean;
        sellable: string;
      }>
    >(
      `SELECT m.id, m.name, m."reorderLevel",
         (m."lowStockMonitored" AND m."isActive") AS monitored,
         COALESCE(SUM(b."qtySellable") FILTER (
           WHERE b.status = 'active' AND b."expiryDate" > $2::date), 0)::bigint AS sellable
       FROM medicines m
       LEFT JOIN batches b ON b.medicine_id = m.id
       WHERE m.id = ANY($1::uuid[])
       GROUP BY m.id`,
      [medicineIds, this.clock.today()],
    );
    return rows.map((r) => ({
      medicineId: r.id,
      name: r.name,
      reorderLevel: r.reorderLevel,
      monitored: r.monitored,
      sellable: Number(r.sellable),
    }));
  }

  async evaluate(manager: EntityManager, medicineIds: string[]): Promise<void> {
    const ids = [...new Set(medicineIds.map((id) => id.toLowerCase()))];
    if (ids.length === 0) return;
    const levels = await this.levels(manager, ids);
    const open = await manager.find(StockAlert, {
      where: {
        medicine: { id: In(ids) },
        type: In(LEVEL_TYPES),
        status: Not(AlertStatus.RESOLVED),
      },
      relations: { medicine: true },
    });
    const openByMedicine = new Map(open.map((a) => [a.medicine.id, a]));
    const now = this.clock.now();

    for (const level of levels) {
      const wanted = wantedAlert(level);
      const current = openByMedicine.get(level.medicineId);
      // Same condition still holds: keep the alert and its acknowledgement.
      if (current && current.type === wanted) continue;
      if (current) {
        await manager.update(
          StockAlert,
          { id: current.id },
          { status: AlertStatus.RESOLVED, resolvedAt: now },
        );
      }
      if (wanted) {
        await manager.insert(StockAlert, {
          type: wanted,
          status: AlertStatus.OPEN,
          message: alertMessage(wanted, level),
          medicine: { id: level.medicineId },
          batch: null,
        });
      }
    }
  }
}
