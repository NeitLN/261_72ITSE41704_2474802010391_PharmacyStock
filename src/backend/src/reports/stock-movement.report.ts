import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import { type Actor, assertPermission } from '../auth/actor.js';
import { Permission } from '../auth/permissions.js';
import { type FieldError, NotFound, ValidationFailed } from '../common/errors.js';
import { Medicine, type MovementType } from '../entities/index.js';
import { addDays, Clock } from '../stock/clock.js';
import { StockMovementQuery } from './dto/report-query.dto.js';
import { addMoney, ReportGenerator, toCents } from './report-generator.js';

const MAX_DAYS = 366;

/** The columns of one medicine's row (UC12 definition, DEC-06). */
export interface MovementFigures {
  opening: number;
  received: number;
  dispensed: number;
  sold: number;
  returned: number;
  released: number;
  rejected: number;
  writtenOff: number;
  destroyed: number;
  adjusted: number;
  closing: {
    total: number;
    sellable: number;
    quarantine: number;
    pendingDestruction: number;
  };
  /** Dispensed + sold − released. */
  netIssued: number;
  /** At each batch's unit cost; a cost, not revenue. */
  costNetIssued: string;
}

export interface StockMovementRow extends MovementFigures {
  medicine: { id: string; code: string; name: string };
  /** Closing = opening + received − dispensed − sold + returned − destroyed + adjusted. */
  checkOk: boolean;
}

export interface MovementLine {
  id: string;
  occurredAt: Date;
  type: MovementType;
  batchNumber: string;
  deltaSellable: number;
  deltaQuarantine: number;
  deltaPendingDestruction: number;
  reason: string | null;
  performedBy: string;
  source: { type: string; id: string; reference: string | null };
  isReversal: boolean;
}

/** A movement's business day: its time in Asia/Ho_Chi_Minh (decision 10). */
const DAY = `(sm."occurredAt" AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`;

/**
 * UC12 Produce a stock movement report (FR-37, DEC-06). Read only.
 *
 * Every figure is a sum of movement deltas, grouped by type: a reversal keeps
 * the type of what it reverses with the deltas negated, so it nets out in
 * the right column without a special case (BR05). Opening and closing are
 * the total of the three stock states, so release, reject and write-off,
 * which only move stock between states, leave the row check intact.
 */
@Injectable()
export class StockMovementReport extends ReportGenerator<
  StockMovementQuery,
  StockMovementRow,
  MovementFigures
> {
  readonly kind = 'stock-movement';
  protected readonly permission = Permission.REPORT_VIEW;
  protected readonly queryType = StockMovementQuery;
  private readonly logger = new Logger(StockMovementReport.name);

  constructor(@InjectDataSource() dataSource: DataSource, clock: Clock) {
    super(dataSource, clock);
  }

  /** A1: from ≤ to, to not after today, at most 366 days. */
  protected check(query: StockMovementQuery): void {
    const errors: FieldError[] = [];
    if (query.from > query.to) {
      errors.push({ field: 'to', message: 'The end date must be on or after the start date.' });
    } else if (addDays(query.from, MAX_DAYS - 1) < query.to) {
      errors.push({ field: 'to', message: `A period can be at most ${MAX_DAYS} days.` });
    }
    if (query.to > this.clock.today()) {
      errors.push({ field: 'to', message: 'The end date cannot be after today.' });
    }
    if (errors.length > 0) throw new ValidationFailed(errors);
  }

  protected async rows(
    manager: EntityManager,
    query: StockMovementQuery,
  ): Promise<StockMovementRow[]> {
    const raw = await manager.query<Array<Record<string, string>>>(
      `WITH mv AS (
         SELECT b.medicine_id AS mid, sm.type::text AS type,
           sm."deltaSellable" AS ds, sm."deltaQuarantine" AS dq,
           sm."deltaPendingDestruction" AS dp, ${DAY} AS day, b."unitCost" AS cost
         FROM stock_movements sm
         JOIN batches b ON b.id = sm.batch_id
         WHERE ${DAY} <= $2::date
       ), agg AS (
         SELECT mid,
           COALESCE(SUM(ds + dq + dp) FILTER (WHERE day < $1::date), 0) AS opening,
           COALESCE(SUM(ds) FILTER (WHERE day >= $1::date AND type = 'receipt'), 0) AS received,
           COALESCE(-SUM(ds) FILTER (WHERE day >= $1::date AND type = 'dispense'), 0) AS dispensed,
           COALESCE(-SUM(ds) FILTER (WHERE day >= $1::date AND type = 'sale'), 0) AS sold,
           COALESCE(SUM(dq) FILTER (WHERE day >= $1::date AND type = 'return'), 0) AS returned,
           COALESCE(SUM(ds) FILTER (WHERE day >= $1::date AND type = 'release'), 0) AS released,
           COALESCE(SUM(dp) FILTER (WHERE day >= $1::date AND type = 'reject'), 0) AS rejected,
           COALESCE(SUM(dp) FILTER (WHERE day >= $1::date AND type = 'write_off'), 0) AS "writtenOff",
           COALESCE(-SUM(dp) FILTER (WHERE day >= $1::date AND type = 'destroy'), 0) AS destroyed,
           COALESCE(SUM(ds) FILTER (WHERE day >= $1::date AND type = 'adjustment'), 0) AS adjusted,
           SUM(ds + dq + dp) AS "closingTotal",
           SUM(ds) AS "closingSellable",
           SUM(dq) AS "closingQuarantine",
           SUM(dp) AS "closingPending",
           COALESCE(SUM(-ds * cost) FILTER (
             WHERE day >= $1::date AND type IN ('dispense', 'sale', 'release')), 0
           )::numeric(16, 2)::text AS "costNetIssued",
           COUNT(*) FILTER (WHERE day >= $1::date) AS "inPeriod"
         FROM mv
         GROUP BY mid
       )
       SELECT a.*, m.code, m.name
       FROM agg a
       JOIN medicines m ON m.id = a.mid
       WHERE ($3::uuid IS NULL OR m.category_id = $3::uuid)
         AND (a.opening <> 0 OR a."inPeriod" > 0)`,
      [query.from, query.to, query.categoryId ?? null],
    );

    const rows = raw.map((r): StockMovementRow => {
      const n = (key: string) => Number(r[key]);
      const figures = {
        opening: n('opening'),
        received: n('received'),
        dispensed: n('dispensed'),
        sold: n('sold'),
        returned: n('returned'),
        released: n('released'),
        rejected: n('rejected'),
        writtenOff: n('writtenOff'),
        destroyed: n('destroyed'),
        adjusted: n('adjusted'),
      };
      const closing = {
        total: n('closingTotal'),
        sellable: n('closingSellable'),
        quarantine: n('closingQuarantine'),
        pendingDestruction: n('closingPending'),
      };
      const expected =
        figures.opening + figures.received - figures.dispensed - figures.sold +
        figures.returned - figures.destroyed + figures.adjusted;
      const checkOk = expected === closing.total;
      if (!checkOk) {
        // A3: a difference means a defect, not a business case.
        this.logger.error(
          `Row check failed for ${r.code} ${query.from}..${query.to}: expected ${expected}, closing ${closing.total}`,
        );
      }
      return {
        medicine: { id: r.mid, code: r.code, name: r.name },
        ...figures,
        closing,
        netIssued: figures.dispensed + figures.sold - figures.released,
        costNetIssued: r.costNetIssued,
        checkOk,
      };
    });
    return rows.sort(
      (a, b) =>
        Number(toCents(b.costNetIssued) - toCents(a.costNetIssued)) ||
        a.medicine.name.localeCompare(b.medicine.name),
    );
  }

  protected totals(rows: StockMovementRow[]): MovementFigures {
    const sum = (pick: (r: StockMovementRow) => number) =>
      rows.reduce((total, r) => total + pick(r), 0);
    return {
      opening: sum((r) => r.opening),
      received: sum((r) => r.received),
      dispensed: sum((r) => r.dispensed),
      sold: sum((r) => r.sold),
      returned: sum((r) => r.returned),
      released: sum((r) => r.released),
      rejected: sum((r) => r.rejected),
      writtenOff: sum((r) => r.writtenOff),
      destroyed: sum((r) => r.destroyed),
      adjusted: sum((r) => r.adjusted),
      closing: {
        total: sum((r) => r.closing.total),
        sellable: sum((r) => r.closing.sellable),
        quarantine: sum((r) => r.closing.quarantine),
        pendingDestruction: sum((r) => r.closing.pendingDestruction),
      },
      netIssued: sum((r) => r.netIssued),
      costNetIssued: addMoney(rows.map((r) => r.costNetIssued)),
    };
  }

  /** Steps 7–8: the movements behind one row, in the order they were written. */
  async movements(
    actor: Actor,
    medicineId: string,
    raw: Record<string, unknown>,
  ): Promise<{
    medicine: { id: string; code: string; name: string };
    query: StockMovementQuery;
    movements: MovementLine[];
  }> {
    assertPermission(actor, this.permission);
    const query = await this.parse(raw);
    this.check(query);
    const medicine = await this.dataSource.manager.findOneBy(Medicine, {
      id: medicineId,
    });
    if (!medicine) throw new NotFound('Medicine', medicineId);
    const rows = await this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT sm.id, sm."occurredAt", sm.type, b."batchNumber",
         sm."deltaSellable", sm."deltaQuarantine", sm."deltaPendingDestruction",
         sm.reason, u."fullName", sm."sourceDocumentType", sm."sourceDocumentId",
         sm.reverses_movement_id AS "reversesId",
         COALESCE(gr."documentNumber", p."referenceNumber", s."receiptNumber",
                  sr."referenceNumber", st."referenceNumber") AS reference
       FROM stock_movements sm
       JOIN batches b ON b.id = sm.batch_id
       JOIN users u ON u.id = sm.performed_by_id
       LEFT JOIN goods_receipts gr ON sm."sourceDocumentType" = 'goods_receipt' AND gr.id = sm."sourceDocumentId"
       LEFT JOIN dispense_lines dl ON sm."sourceDocumentType" = 'dispense_line' AND dl.id = sm."sourceDocumentId"
       LEFT JOIN prescriptions p ON p.id = dl.prescription_id
       LEFT JOIN sale_lines sl ON sm."sourceDocumentType" = 'sale_line' AND sl.id = sm."sourceDocumentId"
       LEFT JOIN sales s ON s.id = sl.sale_id
       LEFT JOIN return_lines rl ON sm."sourceDocumentType" = 'return_line' AND rl.id = sm."sourceDocumentId"
       LEFT JOIN sale_returns sr ON sr.id = rl.sale_return_id
       LEFT JOIN stock_take_lines stl ON sm."sourceDocumentType" = 'stock_take_line' AND stl.id = sm."sourceDocumentId"
       LEFT JOIN stock_takes st ON st.id = stl.stock_take_id
       WHERE b.medicine_id = $1 AND ${DAY} BETWEEN $2::date AND $3::date
       ORDER BY sm."occurredAt", sm.id`,
      [medicineId, query.from, query.to],
    );
    return {
      medicine: { id: medicine.id, code: medicine.code, name: medicine.name },
      query,
      movements: rows.map((r) => ({
        id: r.id as string,
        occurredAt: r.occurredAt as Date,
        type: r.type as MovementType,
        batchNumber: r.batchNumber as string,
        deltaSellable: r.deltaSellable as number,
        deltaQuarantine: r.deltaQuarantine as number,
        deltaPendingDestruction: r.deltaPendingDestruction as number,
        reason: r.reason as string | null,
        performedBy: r.fullName as string,
        source: {
          type: r.sourceDocumentType as string,
          id: r.sourceDocumentId as string,
          reference: (r.reference as string | null) ?? null,
        },
        isReversal: r.reversesId !== null,
      })),
    };
  }
}
