import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  Batch,
  Customer,
  DispenseLine,
  MovementType,
  Prescriber,
  type Medicine,
  PrescriptionItem,
  StockMovement,
} from '../src/entities/index.js';
import { FixedClock } from '../src/stock/clock.js';
import { findLedgerMismatches } from '../src/stock/ledger-invariant.js';
import { createMedicine } from './e2e/fixtures.js';
import {
  as,
  createTestApp,
  resetDatabase,
  type TestApp,
} from './e2e/helpers.js';

/**
 * BR05 (FR-12): the ledger only grows and every cached batch quantity is the
 * sum of its movement deltas. Proven end to end through the real API: a
 * receipt feeds the stock, a verified prescription is dispensed across two
 * FEFO batches, and nothing but movements may ever change what was posted.
 */
describe('BR05 append-only ledger (e2e)', () => {
  // 10:00 on 13/10/2026 in Vietnam.
  const clock = new FixedClock(new Date('2026-10-13T03:00:00Z'));
  let t: TestApp;
  let medicine: Medicine;
  let supplierId: string;
  let customerId: string;
  let prescriberId: string;
  let seq = 0;

  beforeAll(async () => {
    t = await createTestApp({ clock });
  });

  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    clock.set(new Date('2026-10-13T03:00:00Z'));
    await resetDatabase(t.dataSource);
    medicine = await createMedicine(t.dataSource, { expiryAlertDays: 90 });
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

  it('BR05-01 a receipt then a hand-over over two FEFO batches posts exactly the right movements and keeps the ledger balanced', async () => {
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

  it('BR05-02 posted movements can be neither updated nor deleted; the database refuses both', async () => {
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

  it('BR05-03 a failed hand-over (more than in stock, BR03) leaves no movement, no dispense line and no batch change', async () => {
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

  it('BR05-04 resending the same requestId dispenses once; the second reply does not move the ledger again', async () => {
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
});
