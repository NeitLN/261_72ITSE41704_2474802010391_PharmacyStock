import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import { Permission } from '../auth/permissions.js';
import type { BatchStatus } from '../entities/index.js';
import { Clock } from '../stock/clock.js';
import { CategoryQuery } from './dto/report-query.dto.js';
import { addMoney, ReportGenerator } from './report-generator.js';

export interface ExpiryRow {
  batch: { id: string; batchNumber: string; expiryDate: string; status: BatchStatus };
  medicine: { id: string; code: string; name: string; expiryAlertDays: number };
  state: 'expired' | 'expiring_soon';
  /** Days from the business date to the expiry date; 0 or less is expired. */
  daysLeft: number;
  sellable: number;
  /** Sellable × the batch's unit cost, e.g. "3600.00". */
  value: string;
  /** Expired or not ACTIVE: what `writeOff` accepts (#55). */
  canWriteOff: boolean;
}

export interface ExpiryTotals {
  businessDate: string;
  expired: { batches: number; quantity: number; value: string };
  expiringSoon: { batches: number; quantity: number; value: string };
}

/**
 * UC11 the expiry list (FR-35): batches with sellable stock that have
 * expired or expire within their medicine's alert window, expired first,
 * then by expiry date. Expiry is computed against the business date and is
 * never a stored status (DEC-01), so the same batch moves from one group to
 * the other at midnight in Asia/Ho_Chi_Minh.
 */
@Injectable()
export class ExpiryReport extends ReportGenerator<CategoryQuery, ExpiryRow, ExpiryTotals> {
  readonly kind = 'expiry';
  protected readonly permission = Permission.ALERT_MANAGE;
  protected readonly queryType = CategoryQuery;

  constructor(@InjectDataSource() dataSource: DataSource, clock: Clock) {
    super(dataSource, clock);
  }

  protected async rows(manager: EntityManager, query: CategoryQuery): Promise<ExpiryRow[]> {
    const rows = await manager.query<Array<Record<string, unknown>>>(
      `SELECT b.id, b."batchNumber", b."expiryDate"::text AS "expiryDate", b.status::text AS status,
         b."qtySellable", (b."qtySellable" * b."unitCost")::numeric(16, 2)::text AS value,
         (b."expiryDate" - $1::date) AS "daysLeft",
         m.id AS "medicineId", m.code, m.name, m."expiryAlertDays"
       FROM batches b
       JOIN medicines m ON m.id = b.medicine_id
       WHERE b."qtySellable" > 0
         AND b."expiryDate" <= $1::date + m."expiryAlertDays"
         AND ($2::uuid IS NULL OR m.category_id = $2::uuid)
       ORDER BY (b."expiryDate" <= $1::date) DESC, b."expiryDate", m.name, b."batchNumber"`,
      [this.clock.today(), query.categoryId ?? null],
    );
    return rows.map((r) => {
      const daysLeft = Number(r.daysLeft);
      const status = r.status as BatchStatus;
      return {
        batch: {
          id: r.id as string,
          batchNumber: r.batchNumber as string,
          expiryDate: r.expiryDate as string,
          status,
        },
        medicine: {
          id: r.medicineId as string,
          code: r.code as string,
          name: r.name as string,
          expiryAlertDays: Number(r.expiryAlertDays),
        },
        state: daysLeft <= 0 ? 'expired' : 'expiring_soon',
        daysLeft,
        sellable: Number(r.qtySellable),
        value: r.value as string,
        canWriteOff: daysLeft <= 0 || status !== 'active',
      };
    });
  }

  protected totals(rows: ExpiryRow[]): ExpiryTotals {
    const group = (state: ExpiryRow['state']) => {
      const of = rows.filter((r) => r.state === state);
      return {
        batches: of.length,
        quantity: of.reduce((sum, r) => sum + r.sellable, 0),
        value: addMoney(of.map((r) => r.value)),
      };
    };
    return {
      businessDate: this.clock.today(),
      expired: group('expired'),
      expiringSoon: group('expiring_soon'),
    };
  }
}
