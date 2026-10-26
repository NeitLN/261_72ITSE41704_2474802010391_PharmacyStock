import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import { Permission } from '../auth/permissions.js';
import { Clock } from '../stock/clock.js';
import { CategoryQuery } from './dto/report-query.dto.js';
import { ReportGenerator } from './report-generator.js';

export interface LowStockRow {
  medicine: { id: string; code: string; name: string };
  reorderLevel: number;
  sellable: number;
  state: 'out_of_stock' | 'low_stock';
}

/**
 * UC10's rule (DEC-08) as a report: every monitored, active medicine whose
 * sellable quantity is at or below its reorder level, out of stock first.
 * The alerts record who saw what; this report answers "what is short now".
 */
@Injectable()
export class LowStockReport extends ReportGenerator<
  CategoryQuery,
  LowStockRow,
  { lowStock: number; outOfStock: number }
> {
  readonly kind = 'low-stock';
  protected readonly permission = Permission.ALERT_MANAGE;
  protected readonly queryType = CategoryQuery;

  constructor(@InjectDataSource() dataSource: DataSource, clock: Clock) {
    super(dataSource, clock);
  }

  protected async rows(
    manager: EntityManager,
    query: CategoryQuery,
  ): Promise<LowStockRow[]> {
    const rows = await manager.query<
      Array<{ id: string; code: string; name: string; reorderLevel: number; sellable: string }>
    >(
      `SELECT m.id, m.code, m.name, m."reorderLevel",
         COALESCE(SUM(b."qtySellable") FILTER (
           WHERE b.status = 'active' AND b."expiryDate" > $1::date), 0)::bigint AS sellable
       FROM medicines m
       LEFT JOIN batches b ON b.medicine_id = m.id
       WHERE m."lowStockMonitored" AND m."isActive"
         AND ($2::uuid IS NULL OR m.category_id = $2::uuid)
       GROUP BY m.id
       HAVING COALESCE(SUM(b."qtySellable") FILTER (
           WHERE b.status = 'active' AND b."expiryDate" > $1::date), 0) <= m."reorderLevel"
       ORDER BY sellable, m.name`,
      [this.clock.today(), query.categoryId ?? null],
    );
    return rows.map((r) => {
      const sellable = Number(r.sellable);
      return {
        medicine: { id: r.id, code: r.code, name: r.name },
        reorderLevel: r.reorderLevel,
        sellable,
        state: sellable === 0 ? 'out_of_stock' : 'low_stock',
      };
    });
  }

  protected totals(rows: LowStockRow[]) {
    return {
      lowStock: rows.filter((r) => r.state === 'low_stock').length,
      outOfStock: rows.filter((r) => r.state === 'out_of_stock').length,
    };
  }
}
