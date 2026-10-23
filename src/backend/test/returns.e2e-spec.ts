import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Actor } from '../src/auth/actor.js';
import { PriceBook } from '../src/catalogue/price-book.js';
import {
  type Medicine,
  MovementType,
  SaleLine,
  SourceDocumentType,
} from '../src/entities/index.js';
import { FixedClock } from '../src/stock/clock.js';
import { StockLedger } from '../src/stock/stock-ledger.js';
import { actorFor, createMedicine } from './e2e/fixtures.js';
import {
  as,
  createTestApp,
  resetDatabase,
  type TestApp,
} from './e2e/helpers.js';

const RECEIPT = '00000000-0000-4000-8000-0000000000e1';
const ON_13_OCT = new Date('2026-10-13T03:00:00Z');

/** The body of `GET /api/returns/sales/:receiptNumber`, as the screen reads it. */
interface ReturnableLineView {
  saleLineId: string;
  batch: { id: string; batchNumber: string; expiryDate: string };
  quantitySold: number;
  quantityReturned: number;
  returnable: number;
  unitPrice: string;
  billed: boolean;
}

/**
 * UC08 part 1 over the HTTP API: scenarios S11, S12 and S15 of the table in
 * UC08-process-return.md. Recording the return is part 2.
 */
describe('UC08 returns: find the sale (e2e)', () => {
  // 10:00 on 13/10/2026 in Vietnam.
  const clock = new FixedClock(ON_13_OCT);
  let t: TestApp;
  let ledger: StockLedger;
  let prices: PriceBook;
  let manager: Actor;
  let otc: Medicine;

  beforeAll(async () => {
    t = await createTestApp({ clock });
    ledger = t.app.get(StockLedger);
    prices = t.app.get(PriceBook);
  });

  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    clock.set(ON_13_OCT);
    await resetDatabase(t.dataSource);
    manager = await actorFor(t.dataSource, 'manager');
    otc = await createMedicine(t.dataSource, { expiryAlertDays: 90 });
    await prices.setPrice(
      t.dataSource.manager,
      manager,
      otc.id,
      2200,
      '2026-10-01',
    );
  });

  /** Receives `quantity` into a new batch and returns its id. */
  function receive(
    batchNumber: string,
    quantity: number,
    expiryDate: string,
  ): Promise<string> {
    return ledger.run(async (tx) => {
      await tx.lockMedicines([otc.id]);
      const batch = await tx.createBatch({
        medicineId: otc.id,
        batchNumber,
        expiryDate,
        unitCost: '1000',
        receivedAt: new Date('2026-10-01T03:00:00Z'),
      });
      await tx.post(manager, {
        batchId: batch.id,
        type: MovementType.RECEIPT,
        deltaSellable: quantity,
        sourceDocumentType: SourceDocumentType.GOODS_RECEIPT,
        sourceDocumentId: RECEIPT,
      });
      return batch.id;
    });
  }

  /** One over-the-counter sale of `quantity` units of the priced medicine. */
  function sell(quantity: number) {
    return t
      .http()
      .post('/api/sales')
      .set(as('cashier'))
      .send({ requestId: randomUUID(), otcLines: [{ medicineId: otc.id, quantity }] });
  }

  function find(
    receiptNumber: string,
    user: 'cashier' | 'pharmacist' | 'manager' = 'cashier',
  ) {
    return t.http().get(`/api/returns/sales/${receiptNumber}`).set(as(user));
  }

  it('UC08-14 a sale found by its receipt number lists each line with what can still be returned', async () => {
    const early = await receive('L1', 2, '2027-01-31');
    const late = await receive('L2', 10, '2027-03-31');
    const sale = await sell(5);
    expect(sale.status).toBe(201);
    expect(sale.body.receiptNumber).toBe('RC-20261013-0001');

    const res = await find('RC-20261013-0001');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: sale.body.id,
      receiptNumber: 'RC-20261013-0001',
      soldAt: ON_13_OCT.toISOString(),
      customer: null,
    });
    const lines = res.body.lines as ReturnableLineView[];
    expect(
      lines.map((line) => ({
        batch: line.batch.batchNumber,
        batchId: line.batch.id,
        quantitySold: line.quantitySold,
        quantityReturned: line.quantityReturned,
        returnable: line.returnable,
        unitPrice: line.unitPrice,
        billed: line.billed,
      })),
    ).toEqual([
      {
        batch: 'L1',
        batchId: early,
        quantitySold: 2,
        quantityReturned: 0,
        returnable: 2,
        unitPrice: '2200.00',
        billed: false,
      },
      {
        batch: 'L2',
        batchId: late,
        quantitySold: 3,
        quantityReturned: 0,
        returnable: 3,
        unitPrice: '2200.00',
        billed: false,
      },
    ]);

    const saleLines = await t.dataSource.getRepository(SaleLine).find({
      where: { sale: { id: sale.body.id } },
      relations: { batch: true },
    });
    const idOf = (batchNumber: string) =>
      saleLines.find((line) => line.batch.batchNumber === batchNumber)!.id;
    expect(lines.map((line) => line.saleLineId)).toEqual([
      idOf('L1'),
      idOf('L2'),
    ]);

    const lowerCase = await find('rc-20261013-0001');
    expect(lowerCase.status).toBe(200);
    expect(lowerCase.body).toEqual(res.body);
  });

  it('UC08-10 an unknown receipt number is 404 Sale not found', async () => {
    await receive('L1', 2, '2027-01-31');
    await sell(1);

    const res = await find('RC-20261013-9999');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
    expect(res.body.message).toBe('Sale RC-20261013-9999 was not found.');
  });

  it('UC08-11 a pharmacist cannot look up a sale to return', async () => {
    await receive('L1', 2, '2027-01-31');
    await sell(1);

    const denied = await find('RC-20261013-0001', 'pharmacist');
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe('PERMISSION_DENIED');

    // A manager holds every permission, `return.create` included.
    const allowed = await find('RC-20261013-0001', 'manager');
    expect(allowed.status).toBe(200);
  });
});
