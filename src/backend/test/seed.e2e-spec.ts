import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  Batch,
  BatchStatus,
  GoodsReceipt,
  Medicine,
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
    expect(await repo(StockMovement).count()).toBe(120);
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
