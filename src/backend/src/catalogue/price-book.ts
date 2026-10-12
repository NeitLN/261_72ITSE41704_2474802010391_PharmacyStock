import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { Actor } from '../auth/actor.js';
import { MedicinePrice } from '../entities/index.js';

/**
 * Selling prices as a dated history (FR-03 now, FR-04/BR09 in UC13).
 *
 * The price in force on a date is the row with the latest `effectiveFrom` on
 * or before that date. Sales copy the price onto their lines, so changing a
 * price never alters a past sale.
 */
@Injectable()
export class PriceBook {
  /** Prices in force on `date` for the given medicines, as numeric strings. */
  async pricesOn(
    manager: EntityManager,
    medicineIds: string[],
    date: string,
  ): Promise<Map<string, string>> {
    if (medicineIds.length === 0) return new Map();
    const rows: { medicine_id: string; unitPrice: string }[] =
      await manager.query(
        `SELECT DISTINCT ON (medicine_id) medicine_id, "unitPrice"
           FROM medicine_prices
          WHERE medicine_id = ANY($1) AND "effectiveFrom" <= $2
          ORDER BY medicine_id, "effectiveFrom" DESC`,
        [medicineIds, date],
      );
    return new Map(rows.map((r) => [r.medicine_id, r.unitPrice]));
  }

  /**
   * Sets the price in force from `date` (FR-03). A second change on the same
   * day replaces that day's price; earlier days keep theirs.
   */
  async setPrice(
    manager: EntityManager,
    actor: Actor,
    medicineId: string,
    unitPrice: number,
    date: string,
  ): Promise<void> {
    const table = manager.getRepository(MedicinePrice).metadata.tableName;
    await manager.query(
      `INSERT INTO "${table}" (medicine_id, "effectiveFrom", "unitPrice", set_by_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ON CONSTRAINT uq_medicine_price_effective_from
       DO UPDATE SET "unitPrice" = EXCLUDED."unitPrice", set_by_id = EXCLUDED.set_by_id`,
      [medicineId, date, unitPrice, actor.id],
    );
  }
}
