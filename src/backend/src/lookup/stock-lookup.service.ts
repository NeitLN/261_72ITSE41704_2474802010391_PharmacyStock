import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { type Actor, assertPermission } from '../auth/actor.js';
import { Permission } from '../auth/permissions.js';
import { NotFound } from '../common/errors.js';
import { likePattern } from '../common/transforms.js';
import {
  Batch,
  BatchStatus,
  Medicine,
  MovementType,
  SourceDocumentType,
} from '../entities/index.js';
import { ExpiryPolicy } from '../issuing/expiry-policy.js';
import { Clock } from '../stock/clock.js';
import type { StockQuery } from './dto/stock-query.dto.js';

const DEFAULT_PAGE_SIZE = 50;

/** Quantities of one medicine by what can be done with them (UC04 decisions). */
export interface StockTotals {
  /** ACTIVE batches expiring after the business date: what can be issued. */
  sellable: number;
  /** Sellable quantity in ACTIVE batches that have expired (BR02). */
  expired: number;
  /** Sellable quantity in batches on hold, recalled or rejected (DEC-07). */
  held: number;
  quarantine: number;
  pendingDestruction: number;
}

interface MedicineRef {
  id: string;
  code: string;
  name: string;
  strength: string | null;
  isActive: boolean;
  category: { id: string; code: string; name: string };
  baseUnit: { id: string; code: string; name: string };
}

export interface StockListView {
  items: Array<
    StockTotals & { medicine: MedicineRef; nextExpiry: string | null }
  >;
  total: number;
  page: number;
  pageSize: number;
}

/** How a batch stands today: its status if not ACTIVE, else expired or active. */
export type BatchState =
  'active' | 'expired' | 'on_hold' | 'recalled' | 'rejected';

export interface MedicineStockView {
  medicine: MedicineRef;
  totals: StockTotals;
  batches: Array<{
    id: string;
    batchNumber: string;
    expiryDate: string;
    receivedAt: string;
    status: BatchStatus;
    state: BatchState;
    daysLeft: number;
    qtySellable: number;
    qtyQuarantine: number;
    qtyPendingDestruction: number;
  }>;
}

export interface BatchHistoryView {
  batch: {
    id: string;
    batchNumber: string;
    expiryDate: string;
    status: BatchStatus;
    medicine: { id: string; code: string; name: string };
  };
  movements: Array<{
    id: string;
    occurredAt: string;
    type: MovementType;
    deltaSellable: number;
    deltaQuarantine: number;
    deltaPendingDestruction: number;
    balanceSellable: number;
    balanceQuarantine: number;
    balancePendingDestruction: number;
    reason: string | null;
    performedBy: { id: string; fullName: string };
    source: { type: SourceDocumentType; id: string; reference: string | null };
    reverses: { id: string; type: MovementType; occurredAt: string } | null;
    reversedBy: { id: string; occurredAt: string } | null;
  }>;
}

/**
 * UC04 — look up stock and batch history (FR-10, FR-11). Read only.
 *
 * "Sellable" uses the same rule as `StockLedger.lockEligibleBatches` (ACTIVE,
 * expiry after the business date), so what this shows can always be issued.
 * The running balance is summed from the movements in the query and never
 * stored, so it cannot disagree with the ledger (BR05).
 */
@Injectable()
export class StockLookupService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly clock: Clock,
  ) {}

  async list(actor: Actor, query: StockQuery): Promise<StockListView> {
    assertPermission(actor, Permission.STOCK_VIEW);
    const today = this.clock.today();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const params: unknown[] = [today];
    const where: string[] = [];
    if (!query.includeInactive) where.push('m."isActive" = true');
    if (query.categoryId) {
      params.push(query.categoryId);
      where.push(`m.category_id = $${params.length}`);
    }
    if (query.search) {
      params.push(likePattern(query.search));
      const p = `$${params.length}`;
      where.push(
        `(m.code ILIKE ${p} OR m.name ILIKE ${p} OR m."activeIngredient" ILIKE ${p})`,
      );
    }
    const having = {
      all: null,
      in_stock: 'sellable > 0',
      out_of_stock: 'sellable = 0',
      has_expired: 'expired > 0',
    }[query.state ?? 'all'];

    const totals = `
      WITH totals AS (
        -- bigint: a medicine's total over many batches can pass the int
        -- range even though each batch fits (converted with Number()).
        SELECT m.id,
          COALESCE(SUM(b."qtySellable") FILTER (
            WHERE b.status = 'active' AND b."expiryDate" > $1::date), 0)::bigint AS sellable,
          COALESCE(SUM(b."qtySellable") FILTER (
            WHERE b.status = 'active' AND b."expiryDate" <= $1::date), 0)::bigint AS expired,
          COALESCE(SUM(b."qtySellable") FILTER (
            WHERE b.status <> 'active'), 0)::bigint AS held,
          COALESCE(SUM(b."qtyQuarantine"), 0)::bigint AS quarantine,
          COALESCE(SUM(b."qtyPendingDestruction"), 0)::bigint AS "pendingDestruction",
          MIN(b."expiryDate") FILTER (
            WHERE b.status = 'active' AND b."expiryDate" > $1::date
              AND b."qtySellable" > 0)::text AS "nextExpiry"
        FROM medicines m
        LEFT JOIN batches b ON b.medicine_id = m.id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        GROUP BY m.id
      )`;
    const stateFilter = having ? `WHERE ${having}` : '';

    const [{ count }] = await this.dataSource.query<Array<{ count: number }>>(
      `${totals} SELECT COUNT(*)::int AS count FROM totals ${stateFilter}`,
      params,
    );
    const rows = await this.dataSource.query<Array<Record<string, unknown>>>(
      `${totals}
       SELECT t.*, m.code, m.name, m.strength, m."isActive",
         c.id AS "categoryId", c.code AS "categoryCode", c.name AS "categoryName",
         u.id AS "unitId", u.code AS "unitCode", u.name AS "unitName"
       FROM totals t
       JOIN medicines m ON m.id = t.id
       JOIN medicine_categories c ON c.id = m.category_id
       JOIN units_of_measure u ON u.id = m.base_unit_id
       ${stateFilter}
       ORDER BY m.name, m.code
       LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      params,
    );

    return {
      items: rows.map((r) => ({
        medicine: {
          id: r.id as string,
          code: r.code as string,
          name: r.name as string,
          strength: r.strength as string | null,
          isActive: r.isActive as boolean,
          category: {
            id: r.categoryId as string,
            code: r.categoryCode as string,
            name: r.categoryName as string,
          },
          baseUnit: {
            id: r.unitId as string,
            code: r.unitCode as string,
            name: r.unitName as string,
          },
        },
        sellable: Number(r.sellable),
        expired: Number(r.expired),
        held: Number(r.held),
        quarantine: Number(r.quarantine),
        pendingDestruction: Number(r.pendingDestruction),
        nextExpiry: (r.nextExpiry as string | null) ?? null,
      })),
      total: count,
      page,
      pageSize,
    };
  }

  async medicine(actor: Actor, id: string): Promise<MedicineStockView> {
    assertPermission(actor, Permission.STOCK_VIEW);
    const today = this.clock.today();
    const medicine = await this.dataSource.manager.findOne(Medicine, {
      where: { id },
      relations: { category: true, baseUnit: true },
    });
    if (!medicine) throw new NotFound('Medicine', id);

    const batches = await this.dataSource.manager.find(Batch, {
      where: { medicine: { id } },
      order: {
        expiryDate: 'ASC',
        receivedAt: 'ASC',
        batchNumber: 'ASC',
        id: 'ASC',
      },
    });
    const totals: StockTotals = {
      sellable: 0,
      expired: 0,
      held: 0,
      quarantine: 0,
      pendingDestruction: 0,
    };
    const views = batches.map((b) => {
      const state = batchState(b, today);
      if (state === 'active') totals.sellable += b.qtySellable;
      else if (state === 'expired') totals.expired += b.qtySellable;
      else totals.held += b.qtySellable;
      totals.quarantine += b.qtyQuarantine;
      totals.pendingDestruction += b.qtyPendingDestruction;
      return {
        id: b.id,
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        receivedAt: b.receivedAt.toISOString(),
        status: b.status,
        state,
        daysLeft: ExpiryPolicy.daysLeft(b.expiryDate, today),
        qtySellable: b.qtySellable,
        qtyQuarantine: b.qtyQuarantine,
        qtyPendingDestruction: b.qtyPendingDestruction,
      };
    });
    return { medicine: medicineRef(medicine), totals, batches: views };
  }

  async history(actor: Actor, batchId: string): Promise<BatchHistoryView> {
    assertPermission(actor, Permission.STOCK_VIEW);
    const batch = await this.dataSource.manager.findOne(Batch, {
      where: { id: batchId },
      relations: { medicine: true },
    });
    if (!batch) throw new NotFound('Batch', batchId);

    // Same timestamp inside one transaction: ordered by id, so only the
    // balance after the transaction is meaningful (UC04 decisions).
    const rows = await this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT sm.id, sm."occurredAt", sm.type, sm.reason,
         sm."deltaSellable", sm."deltaQuarantine", sm."deltaPendingDestruction",
         (SUM(sm."deltaSellable") OVER w)::bigint AS "balanceSellable",
         (SUM(sm."deltaQuarantine") OVER w)::bigint AS "balanceQuarantine",
         (SUM(sm."deltaPendingDestruction") OVER w)::bigint AS "balancePendingDestruction",
         sm."sourceDocumentType", sm."sourceDocumentId",
         u.id AS "userId", u."fullName" AS "userName",
         r.id AS "reversesId", r.type AS "reversesType", r."occurredAt" AS "reversesAt",
         rb.id AS "reversedById", rb."occurredAt" AS "reversedByAt"
       FROM stock_movements sm
       JOIN users u ON u.id = sm.performed_by_id
       LEFT JOIN stock_movements r ON r.id = sm.reverses_movement_id
       LEFT JOIN stock_movements rb ON rb.reverses_movement_id = sm.id
       WHERE sm.batch_id = $1
       WINDOW w AS (ORDER BY sm."occurredAt", sm.id ROWS UNBOUNDED PRECEDING)
       ORDER BY sm."occurredAt", sm.id`,
      [batchId],
    );
    const references = await this.references(rows);

    return {
      batch: {
        id: batch.id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        status: batch.status,
        medicine: {
          id: batch.medicine.id,
          code: batch.medicine.code,
          name: batch.medicine.name,
        },
      },
      movements: rows.map((r) => ({
        id: r.id as string,
        occurredAt: (r.occurredAt as Date).toISOString(),
        type: r.type as MovementType,
        deltaSellable: r.deltaSellable as number,
        deltaQuarantine: r.deltaQuarantine as number,
        deltaPendingDestruction: r.deltaPendingDestruction as number,
        balanceSellable: Number(r.balanceSellable),
        balanceQuarantine: Number(r.balanceQuarantine),
        balancePendingDestruction: Number(r.balancePendingDestruction),
        reason: r.reason as string | null,
        performedBy: { id: r.userId as string, fullName: r.userName as string },
        source: {
          type: r.sourceDocumentType as SourceDocumentType,
          id: r.sourceDocumentId as string,
          reference: references.get(r.sourceDocumentId as string) ?? null,
        },
        reverses: r.reversesId
          ? {
              id: r.reversesId as string,
              type: r.reversesType as MovementType,
              occurredAt: (r.reversesAt as Date).toISOString(),
            }
          : null,
        reversedBy: r.reversedById
          ? {
              id: r.reversedById as string,
              occurredAt: (r.reversedByAt as Date).toISOString(),
            }
          : null,
      })),
    };
  }

  /**
   * A readable reference per source document: the supplier document number,
   * the prescription reference or the receipt number. Types not built yet
   * (return, stock take) have none.
   */
  private async references(
    rows: Array<Record<string, unknown>>,
  ): Promise<Map<string, string>> {
    const idsOf = (type: SourceDocumentType) => [
      ...new Set(
        rows
          .filter((r) => r.sourceDocumentType === type)
          .map((r) => r.sourceDocumentId as string),
      ),
    ];
    const lookups: Array<[SourceDocumentType, string]> = [
      [
        SourceDocumentType.GOODS_RECEIPT,
        `SELECT id, "documentNumber" AS reference FROM goods_receipts WHERE id = ANY($1)`,
      ],
      [
        SourceDocumentType.DISPENSE_LINE,
        `SELECT dl.id, p."referenceNumber" AS reference FROM dispense_lines dl
         JOIN prescriptions p ON p.id = dl.prescription_id WHERE dl.id = ANY($1)`,
      ],
      [
        SourceDocumentType.SALE_LINE,
        `SELECT sl.id, s."receiptNumber" AS reference FROM sale_lines sl
         JOIN sales s ON s.id = sl.sale_id WHERE sl.id = ANY($1)`,
      ],
    ];
    const found = new Map<string, string>();
    for (const [type, sql] of lookups) {
      const ids = idsOf(type);
      if (ids.length === 0) continue;
      const result = await this.dataSource.query<
        Array<{ id: string; reference: string }>
      >(sql, [ids]);
      for (const { id, reference } of result) found.set(id, reference);
    }
    return found;
  }
}

function batchState(batch: Batch, today: string): BatchState {
  if (batch.status !== BatchStatus.ACTIVE) return batch.status;
  return ExpiryPolicy.isIssuable(batch.expiryDate, today)
    ? 'active'
    : 'expired';
}

function medicineRef(m: Medicine): MedicineRef {
  return {
    id: m.id,
    code: m.code,
    name: m.name,
    strength: m.strength,
    isActive: m.isActive,
    category: {
      id: m.category.id,
      code: m.category.code,
      name: m.category.name,
    },
    baseUnit: {
      id: m.baseUnit.id,
      code: m.baseUnit.code,
      name: m.baseUnit.name,
    },
  };
}
