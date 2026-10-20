import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Actor } from '../src/auth/actor.js';
import { PriceBook } from '../src/catalogue/price-book.js';
import {
  Batch,
  BatchStatus,
  Customer,
  type Medicine,
  MedicineClassification,
  MovementType,
  Prescriber,
  PrescriptionItem,
  Sale,
  SaleLine,
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
 * UC07 over-the-counter sale through the HTTP API: the rows S01–S16 of the
 * scenario table in UC07-record-sale.md, except billing a dispensing.
 */
describe('UC07 over-the-counter sale (e2e)', () => {
  // 10:00 on 13/10/2026 in Vietnam.
  const clock = new FixedClock(ON_13_OCT);
  let t: TestApp;
  let ledger: StockLedger;
  let prices: PriceBook;
  let manager: Actor;
  let otc: Medicine;
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
    otc = await medicineAt(2200);
  });

  /** A medicine with a price in force since 01/10/2026. */
  async function medicineAt(
    price: number | null,
    overrides: Partial<Medicine> = {},
  ): Promise<Medicine> {
    const medicine = await createMedicine(t.dataSource, {
      expiryAlertDays: 90,
      ...overrides,
    });
    if (price !== null) {
      await prices.setPrice(
        t.dataSource.manager,
        manager,
        medicine.id,
        price,
        '2026-10-01',
      );
    }
    return medicine;
  }

  /** Receives `quantity` into a new batch and returns its id. */
  function receive(
    batchNumber: string,
    quantity: number,
    expiryDate = '2027-06-30',
    of: Medicine = otc,
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

  function sell(
    otcLines: Array<{ medicineId: string; quantity: number }>,
    requestId = randomUUID(),
    user: 'cashier' | 'pharmacist' | 'manager' = 'cashier',
    extra: Record<string, unknown> = {},
  ) {
    return t
      .http()
      .post('/api/sales')
      .set(as(user))
      .send({ requestId, otcLines, ...extra });
  }

  const qty = async (batchId: string) =>
    (await t.dataSource.getRepository(Batch).findOneByOrFail({ id: batchId }))
      .qtySellable;

  const count = {
    sales: () => t.dataSource.getRepository(Sale).count(),
    saleMovements: () =>
      t.dataSource
        .getRepository(StockMovement)
        .countBy({ type: MovementType.SALE }),
  };

  async function expectBalanced() {
    expect(await findLedgerMismatches(t.dataSource)).toEqual([]);
  }

  it('UC07-01 TC-35 FR-24: a sale takes from the batch, posts one SALE movement and issues a receipt', async () => {
    const a = await receive('A', 10);

    const res = await sell([{ medicineId: otc.id, quantity: 3 }]);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      receiptNumber: 'RC-20261013-0001',
      soldAt: ON_13_OCT.toISOString(),
      customer: null,
      totalAmount: '6600.00',
      lines: [
        {
          medicine: { id: otc.id },
          batch: { id: a, batchNumber: 'A', expiryDate: '2027-06-30' },
          quantity: 3,
          unitPrice: '2200.00',
          lineTotal: '6600.00',
          billed: false,
        },
      ],
    });
    expect(await qty(a)).toBe(7);
    const [line] = await t.dataSource.getRepository(SaleLine).find();
    const movements = await t.dataSource
      .getRepository(StockMovement)
      .findBy({ type: MovementType.SALE });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      deltaSellable: -3,
      sourceDocumentType: SourceDocumentType.SALE_LINE,
      sourceDocumentId: line.id,
    });
    await expectBalanced();
  });

  it('UC07-02 BR01: more than the first batch continues into the next, same price, one line per batch', async () => {
    const a = await receive('A', 3, '2027-01-31');
    const b = await receive('B', 8, '2027-03-31');

    const res = await sell([{ medicineId: otc.id, quantity: 7 }]);

    expect(res.status).toBe(201);
    expect(
      res.body.lines.map((l: { batch: { batchNumber: string }; quantity: number; unitPrice: string }) => [
        l.batch.batchNumber,
        l.quantity,
        l.unitPrice,
      ]),
    ).toEqual([
      ['A', 3, '2200.00'],
      ['B', 4, '2200.00'],
    ]);
    expect(res.body.totalAmount).toBe('15400.00');
    expect([await qty(a), await qty(b)]).toEqual([0, 4]);

    const second = await sell([{ medicineId: otc.id, quantity: 1 }]);
    expect(second.body.receiptNumber).toBe('RC-20261013-0002');
    await expectBalanced();
  });

  it('UC07-03 decision 12, BR09: a line keeps the price in force on its sale date', async () => {
    await receive('A', 10);
    await prices.setPrice(t.dataSource.manager, manager, otc.id, 2500, '2026-10-14');

    const before = await sell([{ medicineId: otc.id, quantity: 1 }]);
    clock.set(new Date('2026-10-14T03:00:00Z'));
    const after = await sell([{ medicineId: otc.id, quantity: 1 }]);

    expect(before.body.lines[0].unitPrice).toBe('2200.00');
    expect(after.body.lines[0].unitPrice).toBe('2500.00');
    expect(after.body.receiptNumber).toBe('RC-20261014-0001');
    const again = await t
      .http()
      .get(`/api/sales/${before.body.id}`)
      .set(as('cashier'));
    expect(again.body.totalAmount).toBe('2200.00');
  });

  it('UC07-04 BR02: a batch expiring today is never sold; exactly what is left empties the batch', async () => {
    const today = await receive('TODAY', 5, '2026-10-13');
    const b = await receive('B', 2, '2027-06-30');

    const exact = await sell([{ medicineId: otc.id, quantity: 2 }]);
    expect(exact.status).toBe(201);
    expect(exact.body.lines.map((l: { batch: { id: string } }) => l.batch.id)).toEqual([b]);
    expect(await qty(b)).toBe(0);

    const more = await sell([{ medicineId: otc.id, quantity: 1 }]);
    expect(more.status).toBe(422);
    expect(more.body.errors).toEqual([
      { field: 'otcLines.0.quantity', message: 'Only 0 can be sold now.' },
    ]);
    expect(await qty(today)).toBe(5);
    await expectBalanced();
  });

  it('UC07-05 TC-36 BR04 DEC-09: prescription-only and controlled medicines are refused on their lines; nothing is saved', async () => {
    await receive('A', 10);
    const rx = await medicineAt(1800, {
      classification: MedicineClassification.PRESCRIPTION,
      name: 'Amoxicillin 500 mg',
    });
    const controlled = await medicineAt(5000, {
      classification: MedicineClassification.CONTROLLED,
      name: 'Diazepam 5 mg',
    });
    await receive('RX', 10, '2027-06-30', rx);
    await receive('CT', 10, '2027-06-30', controlled);

    const res = await sell([
      { medicineId: otc.id, quantity: 1 },
      { medicineId: rx.id, quantity: 1 },
      { medicineId: controlled.id, quantity: 1 },
    ]);

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('NOT_OVER_THE_COUNTER');
    expect(res.body.errors.map((e: { field: string }) => e.field)).toEqual([
      'otcLines.1.medicineId',
      'otcLines.2.medicineId',
    ]);
    expect(res.body.errors[0].message).toContain('Amoxicillin 500 mg');
    expect(await count.sales()).toBe(0);
    expect(await count.saleMovements()).toBe(0);
  });

  it('UC07-06 TC-55 BR03: more than sellable is refused with the quantity available; nothing changes', async () => {
    const a = await receive('A', 10);

    const res = await sell([{ medicineId: otc.id, quantity: 11 }]);

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      code: 'INSUFFICIENT_STOCK',
      errors: [
        { field: 'otcLines.0.quantity', message: 'Only 10 can be sold now.' },
      ],
    });
    expect(await qty(a)).toBe(10);
    expect(await count.sales()).toBe(0);
    await expectBalanced();
  });

  it('UC07-07 DEC-07: a batch on hold, recalled or rejected is never sold, even if in date', async () => {
    const held = await receive('HOLD', 10);
    await t.dataSource
      .getRepository(Batch)
      .update({ id: held }, { status: BatchStatus.ON_HOLD });

    const res = await sell([{ medicineId: otc.id, quantity: 1 }]);

    expect(res.status).toBe(422);
    expect(res.body.errors[0].message).toBe('Only 0 can be sold now.');
    expect(await qty(held)).toBe(10);
  });

  it('UC07-08 FR-02 FR-24: a deactivated medicine, or one with no price in force, is refused on its line', async () => {
    await receive('A', 10);
    const inactive = await medicineAt(900, { isActive: false });
    const unpriced = await medicineAt(null);
    await receive('I', 5, '2027-06-30', inactive);
    await receive('U', 5, '2027-06-30', unpriced);

    const off = await sell([{ medicineId: inactive.id, quantity: 1 }]);
    expect(off.status).toBe(422);
    expect(off.body).toMatchObject({
      code: 'MEDICINE_INACTIVE',
      errors: [{ field: 'otcLines.0.medicineId' }],
    });

    const noPrice = await sell([
      { medicineId: otc.id, quantity: 1 },
      { medicineId: unpriced.id, quantity: 1 },
    ]);
    expect(noPrice.status).toBe(422);
    expect(noPrice.body).toMatchObject({
      code: 'NO_PRICE_IN_FORCE',
      errors: [{ field: 'otcLines.1.medicineId' }],
    });
    expect(await count.sales()).toBe(0);
  });

  it('UC07-09 TC-27 FR-23: the same request ID returns the first receipt; with other content it is refused', async () => {
    const a = await receive('A', 10);
    const requestId = randomUUID();

    const first = await sell([{ medicineId: otc.id, quantity: 2 }], requestId);
    const repeat = await sell([{ medicineId: otc.id, quantity: 2 }], requestId);
    const other = await sell([{ medicineId: otc.id, quantity: 3 }], requestId);

    expect(first.status).toBe(201);
    expect(repeat.status).toBe(201);
    expect(repeat.body).toEqual(first.body);
    expect(other.status).toBe(409);
    expect(other.body.code).toBe('REQUEST_ID_REUSED');
    expect(await qty(a)).toBe(8);
    expect(await count.sales()).toBe(1);
    expect(await count.saleMovements()).toBe(1);
  });

  it('UC07-10 FR-39: a pharmacist cannot record a sale; a manager can', async () => {
    await receive('A', 10);

    const pharmacist = await sell(
      [{ medicineId: otc.id, quantity: 1 }],
      randomUUID(),
      'pharmacist',
    );
    expect(pharmacist.status).toBe(403);
    expect(pharmacist.body.code).toBe('PERMISSION_DENIED');

    const managerSale = await sell(
      [{ medicineId: otc.id, quantity: 1 }],
      randomUUID(),
      'manager',
    );
    expect(managerSale.status).toBe(201);
  });

  it('UC07-11 NFR-04: invalid input is reported on its field; an unknown medicine is 404', async () => {
    const empty = await sell([]);
    expect(empty.status).toBe(400);
    expect(empty.body.errors[0].field).toBe('otcLines');

    for (const quantity of [0, -1, 2.5]) {
      const res = await sell([{ medicineId: otc.id, quantity }]);
      expect(res.status).toBe(400);
      expect(res.body.errors[0].field).toBe('otcLines.0.quantity');
    }

    const twice = await sell([
      { medicineId: otc.id, quantity: 1 },
      { medicineId: otc.id, quantity: 2 },
    ]);
    expect(twice.status).toBe(400);
    expect(twice.body.errors[0].field).toBe('otcLines.1.medicineId');

    const unknown = await sell([
      { medicineId: '00000000-0000-4000-8000-000000000000', quantity: 1 },
    ]);
    expect(unknown.status).toBe(404);
    expect(await count.sales()).toBe(0);
  });

  it('UC07-12: a named customer is printed on the receipt; GET returns the same receipt', async () => {
    await receive('A', 10);
    const customer = await t.dataSource.getRepository(Customer).save({
      code: 'KH0001',
      fullName: 'Nguyen Van An',
    });

    const res = await sell(
      [{ medicineId: otc.id, quantity: 1 }],
      randomUUID(),
      'cashier',
      { customerId: customer.id },
    );
    expect(res.status).toBe(201);
    expect(res.body.customer).toEqual({
      id: customer.id,
      code: 'KH0001',
      fullName: 'Nguyen Van An',
    });

    const again = await t
      .http()
      .get(`/api/sales/${res.body.id}`)
      .set(as('cashier'));
    expect(again.status).toBe(200);
    expect(again.body).toEqual(res.body);

    const missing = await t
      .http()
      .get('/api/sales/00000000-0000-4000-8000-000000000000')
      .set(as('cashier'));
    expect(missing.status).toBe(404);
    const malformed = await t.http().get('/api/sales/123').set(as('cashier'));
    expect(malformed.status).toBe(400);
  });

  it('UC07-13 TC-62 BR03: a sale and a hand-over racing for the last units — exactly one wins, never negative', async () => {
    const a = await receive('A', 3);
    const customerId = (
      await t.dataSource.getRepository(Customer).save({
        code: 'KH0001',
        fullName: 'Nguyen Van An',
        dateOfBirth: '1980-05-01',
        address: '10 Tran Hung Dao, District 5',
      })
    ).id;
    const prescriberId = (
      await t.dataSource.getRepository(Prescriber).save({
        licenceNumber: 'CCHN-000101-HCM',
        fullName: 'Dr. Tran Van Quang',
        isActive: true,
      })
    ).id;
    seq += 1;
    const created = await t
      .http()
      .post('/api/prescriptions')
      .set(as('pharmacist'))
      .send({
        referenceNumber: `RX-${seq}`,
        issuedDate: '2026-10-13',
        customerId,
        prescriberId,
        items: [
          {
            medicineId: otc.id,
            strength: '200 mg',
            quantityPrescribed: 3,
            dose: '1 sachet three times a day',
            route: 'oral',
            daysOfUse: 1,
          },
        ],
      });
    expect(created.status).toBe(201);
    await t
      .http()
      .post(`/api/prescriptions/${created.body.id}/verify`)
      .set(as('pharmacist'))
      .send({})
      .expect(200);
    const [item] = await t.dataSource
      .getRepository(PrescriptionItem)
      .findBy({ prescription: { id: created.body.id } });

    const [sale, handOver] = await Promise.all([
      sell([{ medicineId: otc.id, quantity: 3 }]),
      t
        .http()
        .post('/api/dispensings')
        .set(as('pharmacist'))
        .send({
          requestId: randomUUID(),
          prescriptionId: created.body.id,
          items: [{ prescriptionItemId: item.id, quantity: 3 }],
        }),
    ]);

    expect([sale.status, handOver.status].sort()).toEqual([201, 422]);
    const loser = sale.status === 422 ? sale : handOver;
    expect(loser.body.code).toBe('INSUFFICIENT_STOCK');
    expect(await qty(a)).toBe(0);
    await expectBalanced();
  });

  it('UC07-14 NFR-08: two cashiers selling at once get distinct receipt numbers and never oversell', async () => {
    const a = await receive('A', 5);
    const other = await medicineAt(400);
    await receive('O', 5, '2027-06-30', other);

    const results = await Promise.all([
      sell([{ medicineId: otc.id, quantity: 3 }]),
      sell([{ medicineId: otc.id, quantity: 3 }]),
      sell([{ medicineId: other.id, quantity: 1 }]),
    ]);

    const ok = results.filter((r) => r.status === 201);
    expect(ok).toHaveLength(2);
    expect(results.filter((r) => r.status === 422)).toHaveLength(1);
    const numbers = ok.map((r) => r.body.receiptNumber as string).sort();
    expect(numbers).toEqual(['RC-20261013-0001', 'RC-20261013-0002']);
    expect(await qty(a)).toBe(2);
    await expectBalanced();
  });
});
