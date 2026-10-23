import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Actor } from '../src/auth/actor.js';
import { PriceBook } from '../src/catalogue/price-book.js';
import {
  Batch,
  Customer,
  DispenseLine,
  type Medicine,
  MovementType,
  Prescriber,
  PrescriptionItem,
  Sale,
  SourceDocumentType,
  StockMovement,
} from '../src/entities/index.js';
import { FixedClock } from '../src/stock/clock.js';
import { findLedgerMismatches } from '../src/stock/ledger-invariant.js';
import { StockLedger } from '../src/stock/stock-ledger.js';
import { actorFor, createMedicine } from './e2e/fixtures.js';
import {
  as,
  createTestApp,
  resetDatabase,
  type TestApp,
} from './e2e/helpers.js';

const DOC = '00000000-0000-4000-8000-0000000000d0';
const ON_13_OCT = new Date('2026-10-13T03:00:00Z');

/**
 * UC07 billing a dispensing through the HTTP API: rows S03, S04 and S12 of
 * the scenario table in UC07-record-sale.md (TC-15, TC-52). The stock left
 * at the hand-over; billing records the money and moves nothing (DEC-05).
 */
describe('UC07 billing a dispensing (e2e)', () => {
  // 10:00 on 13/10/2026 in Vietnam.
  const clock = new FixedClock(ON_13_OCT);
  let t: TestApp;
  let ledger: StockLedger;
  let prices: PriceBook;
  let manager: Actor;
  let medicine: Medicine;
  let customer: Customer;
  let prescriberId: string;
  let seq = 0;

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
    medicine = await medicineAt(1800);
    customer = await t.dataSource.getRepository(Customer).save({
      code: 'KH0001',
      fullName: 'Nguyen Van An',
      dateOfBirth: '1980-05-01',
      address: '10 Tran Hung Dao, District 5',
    });
    prescriberId = (
      await t.dataSource.getRepository(Prescriber).save({
        licenceNumber: 'CCHN-000101-HCM',
        fullName: 'Dr. Tran Van Quang',
        isActive: true,
      })
    ).id;
  });

  async function medicineAt(price: number | null): Promise<Medicine> {
    const m = await createMedicine(t.dataSource, { expiryAlertDays: 90 });
    if (price !== null) {
      await prices.setPrice(t.dataSource.manager, manager, m.id, price, '2026-10-01');
    }
    return m;
  }

  function receive(
    batchNumber: string,
    quantity: number,
    expiryDate = '2027-06-30',
    of: Medicine = medicine,
  ): Promise<string> {
    return ledger.run(async (tx) => {
      await tx.lockMedicines([of.id]);
      const batch = await tx.createBatch({
        medicineId: of.id,
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
        sourceDocumentId: DOC,
      });
      return batch.id;
    });
  }

  /** A verified prescription of `quantity` units of `of`; returns ids. */
  async function verifiedPrescription(
    quantity: number,
    of: Medicine = medicine,
  ): Promise<{ id: string; itemId: string }> {
    seq += 1;
    const res = await t
      .http()
      .post('/api/prescriptions')
      .set(as('pharmacist'))
      .send({
        referenceNumber: `RX-${seq}`,
        issuedDate: '2026-10-13',
        customerId: customer.id,
        prescriberId,
        items: [
          {
            medicineId: of.id,
            strength: '500 mg',
            quantityPrescribed: quantity,
            dose: '1 capsule three times a day',
            route: 'oral',
            daysOfUse: 5,
          },
        ],
      });
    expect(res.status).toBe(201);
    await t
      .http()
      .post(`/api/prescriptions/${res.body.id}/verify`)
      .set(as('pharmacist'))
      .send({})
      .expect(200);
    const [item] = await t.dataSource
      .getRepository(PrescriptionItem)
      .findBy({ prescription: { id: res.body.id } });
    return { id: res.body.id as string, itemId: item.id };
  }

  async function handOver(
    rx: { id: string; itemId: string },
    quantity: number,
    partialSupplyNote?: string,
  ) {
    const res = await t
      .http()
      .post('/api/dispensings')
      .set(as('pharmacist'))
      .send({
        requestId: randomUUID(),
        prescriptionId: rx.id,
        items: [
          {
            prescriptionItemId: rx.itemId,
            quantity,
            ...(partialSupplyNote ? { partialSupplyNote } : {}),
          },
        ],
      });
    expect(res.status).toBe(201);
  }

  function bill(
    prescriptionId: string,
    extra: Record<string, unknown> = {},
    requestId = randomUUID(),
    user: 'cashier' | 'pharmacist' = 'cashier',
  ) {
    return t
      .http()
      .post('/api/sales')
      .set(as(user))
      .send({ requestId, prescriptionId, ...extra });
  }

  const movementCount = () => t.dataSource.getRepository(StockMovement).count();
  const qty = async (batchId: string) =>
    (await t.dataSource.getRepository(Batch).findOneByOrFail({ id: batchId }))
      .qtySellable;

  it('UC07-15 TC-15 TC-52 FR-26: billing a hand-over makes one sale line per dispense line and moves no stock', async () => {
    const a = await receive('A', 3, '2027-01-31');
    const b = await receive('B', 8, '2027-03-31');
    const rx = await verifiedPrescription(7);
    await handOver(rx, 7);
    const movementsBefore = await movementCount();

    const res = await bill(rx.id);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      receiptNumber: 'RC-20261013-0001',
      customer: { id: customer.id, code: 'KH0001' },
      totalAmount: '12600.00',
    });
    expect(
      res.body.lines.map((l: { batch: { batchNumber: string }; quantity: number; unitPrice: string; billed: boolean }) => [
        l.batch.batchNumber,
        l.quantity,
        l.unitPrice,
        l.billed,
      ]),
    ).toEqual([
      ['A', 3, '1800.00', true],
      ['B', 4, '1800.00', true],
    ]);
    // The near-expiry warning belongs to the hand-over, not the bill.
    expect(res.body.lines.every((l: { warning: unknown }) => l.warning === null)).toBe(true);
    // Stock fell once, at the hand-over: billing posted nothing.
    expect(await movementCount()).toBe(movementsBefore);
    expect([await qty(a), await qty(b)]).toEqual([0, 4]);
    const linked = await t.dataSource
      .getRepository(DispenseLine)
      .find({ relations: { sale: true } });
    expect(linked.map((d) => d.sale?.id)).toEqual([res.body.id, res.body.id]);
    expect(await findLedgerMismatches(t.dataSource)).toEqual([]);

    const again = await t.http().get(`/api/sales/${res.body.id}`).set(as('cashier'));
    expect(again.body).toEqual(res.body);
  });

  it('UC07-16 S04: a billed hand-over and over-the-counter lines on one receipt — only the OTC lines move stock', async () => {
    await receive('A', 10);
    const otc = await medicineAt(2200);
    const shelf = await receive('S', 10, '2027-06-30', otc);
    const rx = await verifiedPrescription(2);
    await handOver(rx, 2);
    const movementsBefore = await movementCount();

    const res = await bill(rx.id, {
      otcLines: [{ medicineId: otc.id, quantity: 3 }],
    });

    expect(res.status).toBe(201);
    expect(res.body.totalAmount).toBe('10200.00');
    expect(
      res.body.lines.map((l: { quantity: number; billed: boolean }) => [l.quantity, l.billed]),
    ).toEqual([
      [2, true],
      [3, false],
    ]);
    expect(await movementCount()).toBe(movementsBefore + 1);
    expect(await qty(shelf)).toBe(7);
    expect(await findLedgerMismatches(t.dataSource)).toEqual([]);
  });

  it('UC07-17 A5 #47: already billed and nothing to bill are refused; an unknown prescription is an error on its field', async () => {
    await receive('A', 10);
    const rx = await verifiedPrescription(2);
    await handOver(rx, 2);
    expect((await bill(rx.id)).status).toBe(201);

    const twice = await bill(rx.id);
    expect(twice.status).toBe(422);
    expect(twice.body.code).toBe('ALREADY_BILLED');
    expect(await t.dataSource.getRepository(Sale).count()).toBe(1);

    const untouched = await verifiedPrescription(2);
    const nothing = await bill(untouched.id);
    expect(nothing.status).toBe(422);
    expect(nothing.body.code).toBe('NOTHING_TO_BILL');

    const unknown = await bill('00000000-0000-4000-8000-000000000000');
    expect(unknown.status).toBe(400);
    expect(unknown.body.errors).toEqual([
      {
        field: 'prescriptionId',
        message: 'This prescription does not exist.',
      },
    ]);
    expect(await t.dataSource.getRepository(Sale).count()).toBe(1);
  });

  it('UC07-18 TC-52 NFR-08: two cashiers billing the same hand-over at once — exactly one sale', async () => {
    await receive('A', 10);
    const rx = await verifiedPrescription(4);
    await handOver(rx, 4);

    const [first, second] = await Promise.all([bill(rx.id), bill(rx.id)]);

    expect([first.status, second.status].sort()).toEqual([201, 422]);
    const loser = first.status === 422 ? first : second;
    expect(loser.body.code).toBe('ALREADY_BILLED');
    expect(await t.dataSource.getRepository(Sale).count()).toBe(1);
  });

  it('UC07-19 DEC-02: a partial supply is billed now; the rest is billed after its own hand-over', async () => {
    await receive('A', 10);
    const rx = await verifiedPrescription(5);
    await handOver(rx, 2, 'Rest on Thursday; agreed with the patient.');

    const firstBill = await bill(rx.id);
    expect(firstBill.status).toBe(201);
    expect(firstBill.body.lines).toHaveLength(1);
    expect(firstBill.body.lines[0].quantity).toBe(2);

    const listed = await t.http().get('/api/sales/billable').set(as('cashier'));
    expect(listed.body).toEqual([]);

    await handOver(rx, 3);
    const waiting = await t.http().get('/api/sales/billable').set(as('cashier'));
    expect(waiting.body).toHaveLength(1);
    expect(waiting.body[0]).toMatchObject({
      id: rx.id,
      referenceNumber: expect.stringMatching(/^RX-/),
      customer: { id: customer.id, code: 'KH0001', fullName: 'Nguyen Van An' },
      lines: [{ quantity: 3, medicine: { id: medicine.id } }],
    });

    const secondBill = await bill(rx.id);
    expect(secondBill.status).toBe(201);
    expect(secondBill.body.receiptNumber).toBe('RC-20261013-0002');
    expect(secondBill.body.lines[0].quantity).toBe(3);
  });

  it('UC07-20 FR-23: the same request ID returns the first receipt for a bill too', async () => {
    await receive('A', 10);
    const rx = await verifiedPrescription(2);
    await handOver(rx, 2);
    const requestId = randomUUID();

    const first = await bill(rx.id, {}, requestId);
    const repeat = await bill(rx.id, {}, requestId);

    expect(first.status).toBe(201);
    expect(repeat.status).toBe(201);
    expect(repeat.body).toEqual(first.body);
    expect(await t.dataSource.getRepository(Sale).count()).toBe(1);
  });

  it('UC07-21 FR-39 NFR-04: the list and the bill need sale.create; a sale needs a cart line or a prescription; another patient is refused', async () => {
    await receive('A', 10);
    const rx = await verifiedPrescription(2);
    await handOver(rx, 2);

    expect(
      (await t.http().get('/api/sales/billable').set(as('pharmacist'))).status,
    ).toBe(403);
    expect((await bill(rx.id, {}, randomUUID(), 'pharmacist')).status).toBe(403);

    const empty = await t
      .http()
      .post('/api/sales')
      .set(as('cashier'))
      .send({ requestId: randomUUID() });
    expect(empty.status).toBe(400);
    expect(empty.body.errors[0].field).toBe('otcLines');

    const someoneElse = await t.dataSource.getRepository(Customer).save({
      code: 'KH0002',
      fullName: 'Tran Thi Binh',
    });
    const wrongPatient = await bill(rx.id, { customerId: someoneElse.id });
    expect(wrongPatient.status).toBe(400);
    expect(wrongPatient.body.errors[0].field).toBe('customerId');
    expect(await t.dataSource.getRepository(Sale).count()).toBe(0);
  });

  it('UC07-22 FR-24: a billed medicine with no price in force is refused, and nothing is billed', async () => {
    const unpriced = await medicineAt(null);
    await receive('U', 10, '2027-06-30', unpriced);
    const rx = await verifiedPrescription(2, unpriced);
    await handOver(rx, 2);

    const res = await bill(rx.id);

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      code: 'NO_PRICE_IN_FORCE',
      errors: [{ field: 'prescriptionId' }],
    });
    const lines = await t.dataSource
      .getRepository(DispenseLine)
      .find({ relations: { sale: true } });
    expect(lines.every((d) => d.sale === null)).toBe(true);
  });
});
