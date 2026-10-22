import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Actor } from '../src/auth/actor.js';
import { PriceBook } from '../src/catalogue/price-book.js';
import {
  Batch,
  Customer,
  DispenseLine,
  MovementType,
  Prescriber,
  type Medicine,
  PrescriptionItem,
  SaleLine,
  StockMovement,
} from '../src/entities/index.js';
import { FixedClock } from '../src/stock/clock.js';
import { findLedgerMismatches } from '../src/stock/ledger-invariant.js';
import { actorFor, createMedicine } from './e2e/fixtures.js';
import {
  as,
  createTestApp,
  resetDatabase,
  type TestApp,
} from './e2e/helpers.js';

/**
 * Numbered BR05-11 and up: BR05-01…06 are the ledger-level tests in
 * `stock-ledger.e2e-spec.ts`.
 *
 * BR05 (FR-12): the ledger only grows and every cached batch quantity is the
 * sum of its movement deltas. Proven end to end through the real API: a
 * receipt feeds the stock, a verified prescription is dispensed across two
 * FEFO batches, and nothing but movements may ever change what was posted.
 */
describe('BR05 append-only ledger (e2e)', () => {
  // 10:00 on 13/10/2026 in Vietnam.
  const clock = new FixedClock(new Date('2026-10-13T03:00:00Z'));
  let t: TestApp;
  let prices: PriceBook;
  let manager: Actor;
  let medicine: Medicine;
  let supplierId: string;
  let customerId: string;
  let prescriberId: string;
  let seq = 0;

  beforeAll(async () => {
    t = await createTestApp({ clock });
    prices = t.app.get(PriceBook);
  });

  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    clock.set(new Date('2026-10-13T03:00:00Z'));
    await resetDatabase(t.dataSource);
    medicine = await createMedicine(t.dataSource, { expiryAlertDays: 90 });
    // A medicine without a price in force cannot be sold (UC07).
    manager = await actorFor(t.dataSource, 'manager');
    await prices.setPrice(
      t.dataSource.manager,
      manager,
      medicine.id,
      2000,
      '2026-10-01',
    );
    supplierId = (
      await t
        .http()
        .post('/api/suppliers')
        .set(as('manager'))
        .send({ name: 'Phano Pharma', phone: '028 3855 1234' })
    ).body.id as string;
    customerId = (
      await t.dataSource.getRepository(Customer).save({
        code: 'KH0001',
        fullName: 'Nguyen Van An',
        dateOfBirth: '1980-05-01',
        address: '10 Tran Hung Dao, District 5',
      })
    ).id;
    prescriberId = (
      await t.dataSource.getRepository(Prescriber).save({
        licenceNumber: 'CCHN-000101-HCM',
        fullName: 'Dr. Tran Van Quang',
        isActive: true,
      })
    ).id;
  });

  /** Records a goods receipt; every line goes into its own batch. */
  function receive(
    lines: Array<{ batchNumber: string; expiryDate: string; quantity: number }>,
  ) {
    return t
      .http()
      .post('/api/goods-receipts')
      .set(as('manager'))
      .send({
        supplierId,
        documentNumber: 'HD-0001',
        receiptDate: '2026-10-13',
        lines: lines.map((l) => ({
          medicineId: medicine.id,
          batchNumber: l.batchNumber,
          expiryDate: l.expiryDate,
          quantity: l.quantity,
          unitCost: 1000,
        })),
      });
  }

  /** Records and verifies a prescription; returns its id and item ids. */
  async function verifiedPrescription(
    lines: Array<{ quantity: number }>,
  ): Promise<{ id: string; itemIds: string[] }> {
    seq += 1;
    const res = await t
      .http()
      .post('/api/prescriptions')
      .set(as('pharmacist'))
      .send({
        referenceNumber: `RX-${seq}`,
        issuedDate: '2026-10-13',
        customerId,
        prescriberId,
        items: lines.map((l) => ({
          medicineId: medicine.id,
          strength: '500 mg',
          quantityPrescribed: l.quantity,
          dose: '1 tablet twice a day',
          route: 'oral',
          daysOfUse: 5,
        })),
      });
    expect(res.status).toBe(201);
    const v = await t
      .http()
      .post(`/api/prescriptions/${res.body.id}/verify`)
      .set(as('pharmacist'))
      .send({});
    expect(v.status).toBe(200);
    const items = await t.dataSource
      .getRepository(PrescriptionItem)
      .find({ where: { prescription: { id: res.body.id } } });
    return { id: res.body.id as string, itemIds: items.map((i) => i.id) };
  }

  function dispense(
    prescriptionId: string,
    items: Array<{ prescriptionItemId: string; quantity: number }>,
    requestId = randomUUID(),
  ) {
    return t
      .http()
      .post('/api/dispensings')
      .set(as('pharmacist'))
      .send({ requestId, prescriptionId, items });
  }

  /** An over-the-counter sale at the cashier's counter. */
  function sell(quantity: number, requestId = randomUUID()) {
    return t
      .http()
      .post('/api/sales')
      .set(as('cashier'))
      .send({
        requestId,
        otcLines: [{ medicineId: medicine.id, quantity }],
      });
  }

  const qty = async (batchNumber: string) =>
    (await t.dataSource.getRepository(Batch).findOneByOrFail({ batchNumber }))
      .qtySellable;

  const movements = async (type?: MovementType) =>
    t.dataSource
      .getRepository(StockMovement)
      .count(type ? { where: { type } } : {});

  const expectBalanced = async () => {
    expect(await findLedgerMismatches(t.dataSource)).toEqual([]);
  };

  it('BR05-11 a receipt then a hand-over over two FEFO batches posts exactly the right movements and keeps the ledger balanced', async () => {
    // Step 1: one receipt with two lines -> exactly two receipt movements.
    const receipt = await receive([
      { batchNumber: 'A', expiryDate: '2027-01-31', quantity: 3 },
      { batchNumber: 'B', expiryDate: '2027-03-31', quantity: 8 },
    ]);
    expect(receipt.status).toBe(201);
    expect(await movements(MovementType.RECEIPT)).toBe(2);
    expect(await movements()).toBe(2);
    await expectBalanced();

    // Step 2: create and verify a prescription; the ledger does not move.
    const rx = await verifiedPrescription([{ quantity: 7 }]);
    expect(await movements()).toBe(2);
    await expectBalanced();

    // Step 3: hand-over of 7 spans two batches by FEFO (A expires first).
    const res = await dispense(rx.id, [
      { prescriptionItemId: rx.itemIds[0], quantity: 7 },
    ]);
    expect(res.status).toBe(201);
    expect(
      res.body.items[0].lines.map(
        (l: { batchNumber: string; quantity: number }) => [
          l.batchNumber,
          l.quantity,
        ],
      ),
    ).toEqual([
      ['A', 3],
      ['B', 4],
    ]);
    expect(await qty('A')).toBe(0);
    expect(await qty('B')).toBe(4);
    expect(await movements(MovementType.DISPENSE)).toBe(2);
    expect(await movements()).toBe(4);
    expect(await t.dataSource.getRepository(DispenseLine).count()).toBe(2);
    await expectBalanced();
  });

  it('BR05-12 posted movements can be neither updated nor deleted; the database refuses both', async () => {
    const receipt = await receive([
      { batchNumber: 'A', expiryDate: '2027-06-30', quantity: 5 },
    ]);
    expect(receipt.status).toBe(201);
    expect(await movements()).toBe(1);

    await expect(
      t.dataSource.query(`UPDATE stock_movements SET "deltaSellable" = 50`),
    ).rejects.toThrow('append-only');
    await expect(
      t.dataSource.query(`DELETE FROM stock_movements`),
    ).rejects.toThrow('append-only');

    expect(await movements()).toBe(1);
    await expectBalanced();
  });

  it('BR05-13 a failed hand-over (more than in stock, BR03) leaves no movement, no dispense line and no batch change', async () => {
    const stock = await receive([
      { batchNumber: 'A', expiryDate: '2027-06-30', quantity: 3 },
    ]);
    expect(stock.status).toBe(201);
    const rx = await verifiedPrescription([{ quantity: 5 }]);

    const res = await dispense(rx.id, [
      { prescriptionItemId: rx.itemIds[0], quantity: 5 },
    ]);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('INSUFFICIENT_STOCK');
    expect(res.body.errors).toEqual([
      { field: 'items.0.quantity', message: 'Only 3 can be issued now.' },
    ]);

    expect(await movements()).toBe(1);
    expect(await t.dataSource.getRepository(DispenseLine).count()).toBe(0);
    expect(await qty('A')).toBe(3);
    await expectBalanced();
  });

  it('BR05-14 resending the same requestId dispenses once; the second reply does not move the ledger again', async () => {
    const stock = await receive([
      { batchNumber: 'A', expiryDate: '2027-06-30', quantity: 10 },
    ]);
    expect(stock.status).toBe(201);
    const rx = await verifiedPrescription([{ quantity: 3 }]);
    const requestId = randomUUID();
    const items = [{ prescriptionItemId: rx.itemIds[0], quantity: 3 }];

    const first = await dispense(rx.id, items, requestId);
    const repeat = await dispense(rx.id, items, requestId);
    expect(first.status).toBe(201);
    expect(repeat.status).toBe(201);
    expect(repeat.body).toEqual(first.body);
    expect(await qty('A')).toBe(7);
    expect(await movements(MovementType.DISPENSE)).toBe(1);
    await expectBalanced();
  });

  it('BR05-15 a receipt, a hand-over and an over-the-counter sale post one movement per batch line and keep the ledger balanced', async () => {
    const receipt = await receive([
      { batchNumber: 'A', expiryDate: '2027-01-31', quantity: 3 },
      { batchNumber: 'B', expiryDate: '2027-03-31', quantity: 8 },
    ]);
    expect(receipt.status).toBe(201);
    expect(await movements(MovementType.RECEIPT)).toBe(2);
    expect(await movements()).toBe(2);
    await expectBalanced();

    // The hand-over of 2 comes from A, the batch that expires first.
    const rx = await verifiedPrescription([{ quantity: 2 }]);
    const handOver = await dispense(rx.id, [
      { prescriptionItemId: rx.itemIds[0], quantity: 2 },
    ]);
    expect(handOver.status).toBe(201);
    expect(await qty('A')).toBe(1);
    expect(await qty('B')).toBe(8);
    expect(await movements(MovementType.DISPENSE)).toBe(1);
    expect(await movements()).toBe(3);
    await expectBalanced();

    // A has 1 left, so the sale takes 1 from A and 4 from B by FEFO.
    const sale = await sell(5);
    expect(sale.status).toBe(201);
    expect(
      sale.body.lines.map(
        (l: { batch: { batchNumber: string }; quantity: number }) => [
          l.batch.batchNumber,
          l.quantity,
        ],
      ),
    ).toEqual([
      ['A', 1],
      ['B', 4],
    ]);
    expect(await qty('A')).toBe(0);
    expect(await qty('B')).toBe(4);
    expect(await movements(MovementType.SALE)).toBe(2);
    expect(await movements()).toBe(5);
    await expectBalanced();
  });

  it('BR05-16 a sale larger than the stock is refused and leaves no movement, no sale line and no batch change', async () => {
    const stock = await receive([
      { batchNumber: 'A', expiryDate: '2027-06-30', quantity: 3 },
    ]);
    expect(stock.status).toBe(201);

    const res = await sell(4);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('INSUFFICIENT_STOCK');
    expect(res.body.errors).toEqual([
      { field: 'otcLines.0.quantity', message: 'Only 3 can be sold now.' },
    ]);

    expect(await movements()).toBe(1);
    expect(await movements(MovementType.SALE)).toBe(0);
    expect(await t.dataSource.getRepository(SaleLine).count()).toBe(0);
    expect(await qty('A')).toBe(3);
    await expectBalanced();
  });

  it('BR05-17 resending the same requestId sells once; the second reply does not move the ledger again', async () => {
    const stock = await receive([
      { batchNumber: 'A', expiryDate: '2027-06-30', quantity: 10 },
    ]);
    expect(stock.status).toBe(201);
    const requestId = randomUUID();

    const first = await sell(3, requestId);
    const repeat = await sell(3, requestId);
    expect(first.status).toBe(201);
    expect(repeat.status).toBe(201);
    expect(repeat.body).toEqual(first.body);
    expect(await qty('A')).toBe(7);
    expect(await movements(MovementType.SALE)).toBe(1);
    await expectBalanced();
  });
});
