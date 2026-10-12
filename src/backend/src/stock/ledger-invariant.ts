import type { DataSource, EntityManager } from 'typeorm';

export interface LedgerMismatch {
  batchId: string;
  batchNumber: string;
  cached: [number, number, number];
  fromMovements: [number, number, number];
}

/**
 * Invariant 1 of the design (Proposal §3.1): for every batch and stock state,
 * the cached quantity equals the sum of its movement deltas. Returns the
 * batches where it does not hold; an empty list means the ledger balances.
 * Tests call it after every scenario that changes stock.
 */
export async function findLedgerMismatches(
  db: DataSource | EntityManager,
): Promise<LedgerMismatch[]> {
  const rows: Array<{
    id: string;
    batchNumber: string;
    qs: number;
    qq: number;
    qp: number;
    ms: string;
    mq: string;
    mp: string;
  }> = await db.query(`
    SELECT b.id, b."batchNumber",
           b."qtySellable" AS qs, b."qtyQuarantine" AS qq, b."qtyPendingDestruction" AS qp,
           COALESCE(SUM(m."deltaSellable"), 0) AS ms,
           COALESCE(SUM(m."deltaQuarantine"), 0) AS mq,
           COALESCE(SUM(m."deltaPendingDestruction"), 0) AS mp
    FROM batches b
    LEFT JOIN stock_movements m ON m.batch_id = b.id
    GROUP BY b.id
    HAVING b."qtySellable" <> COALESCE(SUM(m."deltaSellable"), 0)
        OR b."qtyQuarantine" <> COALESCE(SUM(m."deltaQuarantine"), 0)
        OR b."qtyPendingDestruction" <> COALESCE(SUM(m."deltaPendingDestruction"), 0)
  `);
  return rows.map((r) => ({
    batchId: r.id,
    batchNumber: r.batchNumber,
    cached: [r.qs, r.qq, r.qp],
    fromMovements: [Number(r.ms), Number(r.mq), Number(r.mp)],
  }));
}
