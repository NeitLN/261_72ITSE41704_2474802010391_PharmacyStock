import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  Batch,
  BatchStatus,
  GoodsReceipt,
  Medicine,
  MovementType,
  StockMovement,
  Supplier,
} from '../src/entities/index.js';
import { seed } from '../src/seed/seed.js';
import { addDays, FixedClock } from '../src/stock/clock.js';
import { findLedgerMismatches } from '../src/stock/ledger-invariant.js';
import { createTestApp, resetDatabase, type TestApp } from './e2e/helpers.js';

/** W05-A3: the demo data set, written through UC03 and the stock ledger. */
describe('Demo seed (e2e)', () => {
  const clock = new FixedClock(new Date('2026-10-14T03:00:00Z'));
  const today = clock.today();
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
    await resetDatabase(t.dataSource);
  });

  afterAll(async () => {
    await resetDatabase(t.dataSource);
    await t.app.close();
  });

  it('SEED-01 writes the planned volumes, all backed by stock movements', async () => {
    const { demoWritten } = await seed(t.dataSource, { demo: true, clock });
    expect(demoWritten).toBe(true);

    const repo = <T extends object>(e: new () => T) =>
      t.dataSource.getRepository(e);
    expect(await repo(Medicine).count()).toBe(60);
    expect(await repo(Supplier).count()).toBe(10);
    expect(await repo(Batch).count()).toBe(120);
    expect(
      await repo(StockMovement).countBy({ type: MovementType.RECEIPT }),
    ).toBe(120);
    expect(await repo(GoodsReceipt).count()).toBe(24);
    expect(await findLedgerMismatches(t.dataSource)).toEqual([]);
  });

  it('SEED-02 dates are relative to the seed day: expired, near expiry and long-dated', async () => {
    const batches = await t.dataSource.getRepository(Batch).find();
    const expired = batches.filter((b) => b.expiryDate <= today);
    const near = batches.filter(
      (b) => b.expiryDate > today && b.expiryDate <= addDays(today, 90),
    );
    expect(expired.length).toBeGreaterThanOrEqual(10);
    expect(near.length).toBeGreaterThanOrEqual(10);
    expect(
      batches.length - expired.length - near.length,
    ).toBeGreaterThanOrEqual(60);
    expect(
      batches.filter((b) => b.status === BatchStatus.ON_HOLD),
    ).toHaveLength(1);
  });

  it('SEED-05 sales and returns over the previous month and this month, dated when they happened (#57, TC-23)', async () => {
    // Movements per type and period, by the business day in Vietnam.
    const rows: { type: string; period: string; n: string }[] =
      await t.dataSource.query(
        `SELECT type,
                CASE WHEN ("occurredAt" AT TIME ZONE 'Asia/Ho_Chi_Minh')::date < $1::date
                     THEN 'before'
                     WHEN ("occurredAt" AT TIME ZONE 'Asia/Ho_Chi_Minh')::date < $2::date
                     THEN 'p1' ELSE 'p2' END AS period,
                count(*) AS n
           FROM stock_movements
          WHERE type <> 'receipt'
          GROUP BY 1, 2`,
        ['2026-09-01', '2026-10-01'],
      );
    const count = (type: string, period: string) =>
      Number(rows.find((r) => r.type === type && r.period === period)?.n ?? 0);
    expect(count('sale', 'p1')).toBeGreaterThanOrEqual(6);
    expect(count('sale', 'p2')).toBeGreaterThanOrEqual(4);
    expect(rows.some((r) => r.period === 'before')).toBe(false);
    expect(count('return', 'p1') + count('return', 'p2')).toBe(3);
    expect(count('return', 'p1')).toBeGreaterThanOrEqual(1);
    expect(count('return', 'p2')).toBeGreaterThanOrEqual(1);
    expect(count('release', 'p1') + count('release', 'p2')).toBe(1);
    expect(count('reject', 'p1') + count('reject', 'p2')).toBe(1);

    // A receipt's movements fall on its receipt date; nothing is in the future.
    const misdated: unknown[] = await t.dataSource.query(
      `SELECT m.id
         FROM stock_movements m
         JOIN goods_receipts r ON r.id = m."sourceDocumentId"
        WHERE m.type = 'receipt'
          AND (m."occurredAt" AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <> r."receiptDate"`,
    );
    expect(misdated).toEqual([]);
    const [{ latest }]: { latest: Date }[] = await t.dataSource.query(
      `SELECT max("occurredAt") AS latest FROM stock_movements`,
    );
    expect(new Date(latest).getTime()).toBeLessThanOrEqual(
      clock.now().getTime(),
    );

    // Replayed in time order, no batch ever holds less than nothing.
    const negative: unknown[] = await t.dataSource.query(
      `SELECT batch_id FROM (
         SELECT batch_id,
                sum("deltaSellable") OVER w AS sellable,
                sum("deltaQuarantine") OVER w AS quarantine,
                sum("deltaPendingDestruction") OVER w AS pending
           FROM stock_movements
         WINDOW w AS (PARTITION BY batch_id ORDER BY "occurredAt", id)
       ) running
       WHERE sellable < 0 OR quarantine < 0 OR pending < 0`,
    );
    expect(negative).toEqual([]);
    expect(await findLedgerMismatches(t.dataSource)).toEqual([]);
  });

  it('SEED-03 running it again changes nothing', async () => {
    const before = await t.dataSource.getRepository(StockMovement).count();
    const { demoWritten } = await seed(t.dataSource, { demo: true, clock });

    expect(demoWritten).toBe(false);
    expect(await t.dataSource.getRepository(StockMovement).count()).toBe(
      before,
    );
  });

  it('SEED-04 medicines without a completed demo seed are reported, not mixed with demo data', async () => {
    await t.dataSource.query(
      `DELETE FROM audit_logs WHERE action = 'seed.demo.completed'`,
    );
    const { demo } = await seed(t.dataSource, { demo: true, clock });
    expect(demo).toBe('existing-data');
  });
});
