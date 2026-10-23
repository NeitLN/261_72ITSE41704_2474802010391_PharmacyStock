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
  SaleReturn,
  SaleStatus,
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
    const record = await t
      .http()
      .post('/api/returns')
      .set(as('pharmacist'))
      .send({
        requestId: randomUUID(),
        saleId: denied.body.id ?? randomUUID(),
        reason: 'Damaged box',
        lines: [{ saleLineId: randomUUID(), quantity: 1 }],
      });
    expect(record.status).toBe(403);

    // A manager holds every permission, `return.create` included.
    const allowed = await find('RC-20261013-0001', 'manager');
    expect(allowed.status).toBe(200);
  });
});

/**
 * UC08 part 2 over the HTTP API: rows S01–S10, S13 and S14 of the scenario
 * table. Every return posts RETURN movements into quarantine through the
 * ledger; after each test that moves stock the cached quantities still equal
 * the movements (BR05).
 */
describe('UC08 returns: record the return (e2e)', () => {
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
    otc = await priced(createMedicine(t.dataSource, { expiryAlertDays: 90 }));
  });

  async function priced(made: Promise<Medicine>): Promise<Medicine> {
    const medicine = await made;
    await prices.setPrice(
      t.dataSource.manager,
      manager,
      medicine.id,
      2200,
      '2026-10-01',
    );
    return medicine;
  }

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
        sourceDocumentId: RECEIPT,
      });
      return batch.id;
    });
  }

  /** Finds a sale for a return, as the cashier's first step does. */
  async function found(receiptNumber: string) {
    const res = await t
      .http()
      .get(`/api/returns/sales/${receiptNumber}`)
      .set(as('cashier'));
    expect(res.status).toBe(200);
    return res.body as {
      id: string;
      receiptNumber: string;
      lines: ReturnableLineView[];
    };
  }

  /** Sells `quantity` over the counter and returns the sale as found for a return. */
  async function soldSale(quantity: number) {
    const sale = await t
      .http()
      .post('/api/sales')
      .set(as('cashier'))
      .send({
        requestId: randomUUID(),
        otcLines: [{ medicineId: otc.id, quantity }],
      });
    expect(sale.status).toBe(201);
    return found(sale.body.receiptNumber as string);
  }

  function giveBack(
    saleId: string,
    lines: Array<{ saleLineId: string; quantity: number }>,
    { requestId = randomUUID(), reason = 'Box damaged in transport' } = {},
  ) {
    return t
      .http()
      .post('/api/returns')
      .set(as('cashier'))
      .send({ requestId, saleId, reason, lines });
  }

  const batchOf = (id: string) =>
    t.dataSource.getRepository(Batch).findOneByOrFail({ id });
  const returnMovements = () =>
    t.dataSource
      .getRepository(StockMovement)
      .findBy({ type: MovementType.RETURN });
  const statusOf = async (saleId: string) =>
    (await t.dataSource.getRepository(Sale).findOneByOrFail({ id: saleId }))
      .status;
  const noMismatch = async () =>
    expect(await findLedgerMismatches(t.dataSource)).toEqual([]);

  it('UC08-01 TC-16: returning 2 of 5 puts them in quarantine of the sold batch and refunds the price paid', async () => {
    const a = await receive('A', 10);
    const sale = await soldSale(5);

    const res = await giveBack(sale.id, [
      { saleLineId: sale.lines[0].saleLineId, quantity: 2 },
    ]);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      referenceNumber: 'RT-20261013-0001',
      sale: { id: sale.id, receiptNumber: sale.receiptNumber },
      reason: 'Box damaged in transport',
      refundAmount: '4400.00',
      lines: [
        {
          saleLineId: sale.lines[0].saleLineId,
          quantity: 2,
          unitPrice: '2200.00',
          refund: '4400.00',
          assessmentStatus: 'pending_assessment',
        },
      ],
    });
    expect(await batchOf(a)).toMatchObject({
      qtySellable: 5,
      qtyQuarantine: 2,
    });
    const movements = await returnMovements();
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      deltaSellable: 0,
      deltaQuarantine: 2,
      sourceDocumentType: SourceDocumentType.RETURN_LINE,
    });
    expect(await statusOf(sale.id)).toBe(SaleStatus.PARTIALLY_RETURNED);
    await noMismatch();
  });

  it('UC08-02 the rest of a line can be returned later; then nothing is returnable and the sale is returned', async () => {
    const a = await receive('A', 10);
    const sale = await soldSale(5);
    const line = sale.lines[0].saleLineId;
    const first = await giveBack(sale.id, [{ saleLineId: line, quantity: 2 }]);

    const second = await giveBack(sale.id, [{ saleLineId: line, quantity: 3 }]);

    expect(second.status).toBe(201);
    expect(second.body.referenceNumber).toBe('RT-20261013-0002');
    expect(await statusOf(sale.id)).toBe(SaleStatus.RETURNED);
    const firstAgain = await t
      .http()
      .get(`/api/returns/${first.body.id}`)
      .set(as('cashier'));
    expect(firstAgain.body).toEqual(first.body);
    expect((await found(sale.receiptNumber)).lines[0]).toMatchObject({
      quantityReturned: 5,
      returnable: 0,
    });
    expect(await batchOf(a)).toMatchObject({
      qtySellable: 5,
      qtyQuarantine: 5,
    });
    await noMismatch();
  });

  it('UC08-03 TC-17: returning more than sold minus returned is refused on the line and saves nothing', async () => {
    const a = await receive('A', 10);
    const sale = await soldSale(5);
    const line = sale.lines[0].saleLineId;
    await giveBack(sale.id, [{ saleLineId: line, quantity: 2 }]);

    const res = await giveBack(sale.id, [{ saleLineId: line, quantity: 4 }]);

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('RETURN_EXCEEDS_SOLD');
    expect(res.body.errors).toEqual([
      { field: 'lines.0.quantity', message: 'Only 3 can be returned.' },
    ]);
    expect(await t.dataSource.getRepository(SaleReturn).count()).toBe(1);
    expect(await returnMovements()).toHaveLength(1);
    expect(await batchOf(a)).toMatchObject({ qtyQuarantine: 2 });
    await noMismatch();
  });

  it('UC08-04 a sale split over two batches returns each line into its own batch', async () => {
    const early = await receive('E', 2, '2027-01-31');
    const late = await receive('L', 10, '2027-03-31');
    const sale = await soldSale(5);

    const res = await giveBack(
      sale.id,
      sale.lines.map((l) => ({ saleLineId: l.saleLineId, quantity: 1 })),
    );

    expect(res.status).toBe(201);
    expect(res.body.refundAmount).toBe('4400.00');
    expect(await batchOf(early)).toMatchObject({
      qtySellable: 0,
      qtyQuarantine: 1,
    });
    expect(await batchOf(late)).toMatchObject({
      qtySellable: 7,
      qtyQuarantine: 1,
    });
    expect(await returnMovements()).toHaveLength(2);
    await noMismatch();
  });

  it('UC08-05 TC-50: a batch that has expired and been recalled since the sale still takes the return into quarantine', async () => {
    const a = await receive('A', 10, '2026-10-20');
    const sale = await soldSale(5);
    await ledger.run((tx) =>
      tx.setBatchStatus(manager, a, BatchStatus.RECALLED, 'Recall notice'),
    );
    clock.set(new Date('2026-10-25T03:00:00Z'));

    const res = await giveBack(sale.id, [
      { saleLineId: sale.lines[0].saleLineId, quantity: 2 },
    ]);

    expect(res.status).toBe(201);
    expect(await batchOf(a)).toMatchObject({
      status: BatchStatus.RECALLED,
      qtySellable: 5,
      qtyQuarantine: 2,
    });
    await noMismatch();
  });

  it('UC08-06 a billed hand-over of a controlled medicine is returned into its batch; the prescription is not restored', async () => {
    const controlled = await priced(
      createMedicine(t.dataSource, {
        expiryAlertDays: 90,
        classification: MedicineClassification.CONTROLLED,
      }),
    );
    const c = await receive('C', 10, '2027-06-30', controlled);
    const customer = await t.dataSource.getRepository(Customer).save({
      code: 'KH0001',
      fullName: 'Nguyen Van An',
      dateOfBirth: '1980-05-01',
      address: '10 Tran Hung Dao, District 5',
    });
    const prescriber = await t.dataSource.getRepository(Prescriber).save({
      licenceNumber: 'CCHN-000101-HCM',
      fullName: 'Dr. Tran Van Quang',
      isActive: true,
    });
    const rx = await t
      .http()
      .post('/api/prescriptions')
      .set(as('pharmacist'))
      .send({
        referenceNumber: 'RX-UC08-06',
        issuedDate: '2026-10-13',
        customerId: customer.id,
        prescriberId: prescriber.id,
        items: [
          {
            medicineId: controlled.id,
            strength: '5 mg',
            quantityPrescribed: 4,
            dose: '1 tablet at night',
            route: 'oral',
            daysOfUse: 4,
          },
        ],
      });
    expect(rx.status).toBe(201);
    await t
      .http()
      .post(`/api/prescriptions/${rx.body.id}/verify`)
      .set(as('pharmacist'))
      .send({})
      .expect(200);
    const [item] = await t.dataSource
      .getRepository(PrescriptionItem)
      .findBy({ prescription: { id: rx.body.id } });
    await t
      .http()
      .post('/api/dispensings')
      .set(as('pharmacist'))
      .send({
        requestId: randomUUID(),
        prescriptionId: rx.body.id,
        items: [{ prescriptionItemId: item.id, quantity: 4 }],
      })
      .expect(201);
    const bill = await t
      .http()
      .post('/api/sales')
      .set(as('cashier'))
      .send({ requestId: randomUUID(), prescriptionId: rx.body.id });
    expect(bill.status).toBe(201);
    const sale = await found(bill.body.receiptNumber as string);
    expect(sale.lines[0]).toMatchObject({ billed: true, returnable: 4 });

    const res = await giveBack(sale.id, [
      { saleLineId: sale.lines[0].saleLineId, quantity: 1 },
    ]);

    expect(res.status).toBe(201);
    expect(await batchOf(c)).toMatchObject({
      qtySellable: 6,
      qtyQuarantine: 1,
    });
    const after = await t.dataSource
      .getRepository(PrescriptionItem)
      .findOneByOrFail({ id: item.id });
    expect(after.quantityDispensed).toBe(4);
    await noMismatch();
  });

  it('UC08-07 TC-18 FR-23: the same request ID returns the same return once; other content is 409', async () => {
    const a = await receive('A', 10);
    const sale = await soldSale(5);
    const line = sale.lines[0].saleLineId;
    const requestId = randomUUID();

    const first = await giveBack(sale.id, [{ saleLineId: line, quantity: 2 }], {
      requestId,
    });
    const repeat = await giveBack(
      sale.id,
      [{ saleLineId: line, quantity: 2 }],
      { requestId },
    );
    const other = await giveBack(sale.id, [{ saleLineId: line, quantity: 1 }], {
      requestId,
    });

    expect(first.status).toBe(201);
    expect(repeat.status).toBe(201);
    expect(repeat.body).toEqual(first.body);
    expect(other.status).toBe(409);
    expect(other.body.code).toBe('REQUEST_ID_REUSED');
    expect(await returnMovements()).toHaveLength(1);
    expect(await batchOf(a)).toMatchObject({ qtyQuarantine: 2 });
    await noMismatch();
  });

  it('UC08-08 NFR-04: a missing reason, a bad quantity, no line or the same line twice is a field error and saves nothing', async () => {
    await receive('A', 10);
    const sale = await soldSale(5);
    const line = sale.lines[0].saleLineId;

    const noReason = await giveBack(
      sale.id,
      [{ saleLineId: line, quantity: 1 }],
      { reason: '  ' },
    );
    const zero = await giveBack(sale.id, [{ saleLineId: line, quantity: 0 }]);
    const none = await giveBack(sale.id, []);
    const twice = await giveBack(sale.id, [
      { saleLineId: line, quantity: 1 },
      { saleLineId: line, quantity: 1 },
    ]);

    expect(noReason.status).toBe(400);
    expect(noReason.body.errors).toEqual([
      { field: 'reason', message: 'Say why the goods are returned.' },
    ]);
    expect(zero.status).toBe(400);
    expect(zero.body.errors).toEqual([
      { field: 'lines.0.quantity', message: 'Quantity must be at least 1.' },
    ]);
    expect(none.status).toBe(400);
    expect(none.body.errors).toEqual([
      { field: 'lines', message: 'Add at least one line to return.' },
    ]);
    expect(twice.status).toBe(400);
    expect(twice.body.errors).toEqual([
      {
        field: 'lines.1.saleLineId',
        message:
          'This line is already in the return; change its quantity instead.',
      },
    ]);
    expect(await t.dataSource.getRepository(SaleReturn).count()).toBe(0);
    expect(await returnMovements()).toHaveLength(0);
  });

  it('UC08-09 #47: a line of another sale or an unknown sale is an error on its field', async () => {
    await receive('A', 10);
    const first = await soldSale(2);
    const second = await soldSale(2);

    const foreign = await giveBack(first.id, [
      { saleLineId: second.lines[0].saleLineId, quantity: 1 },
    ]);
    const unknown = await giveBack(randomUUID(), [
      { saleLineId: first.lines[0].saleLineId, quantity: 1 },
    ]);

    expect(foreign.status).toBe(400);
    expect(foreign.body.errors).toEqual([
      {
        field: 'lines.0.saleLineId',
        message: `This line is not on sale ${first.receiptNumber}.`,
      },
    ]);
    expect(unknown.status).toBe(400);
    expect(unknown.body.errors).toEqual([
      { field: 'saleId', message: 'This sale does not exist.' },
    ]);
    expect(await returnMovements()).toHaveLength(0);
  });

  it('UC08-12 NFR-08: two cashiers returning the last units of a line at once, one is accepted and one refused', async () => {
    const a = await receive('A', 10);
    const sale = await soldSale(3);
    const line = sale.lines[0].saleLineId;
    await giveBack(sale.id, [{ saleLineId: line, quantity: 1 }]);

    const results = await Promise.all([
      giveBack(sale.id, [{ saleLineId: line, quantity: 2 }]),
      giveBack(sale.id, [{ saleLineId: line, quantity: 2 }]),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 422]);
    expect(results.find((r) => r.status === 422)?.body.code).toBe(
      'RETURN_EXCEEDS_SOLD',
    );
    expect(await batchOf(a)).toMatchObject({ qtyQuarantine: 3 });
    const saleLine = await t.dataSource
      .getRepository(SaleLine)
      .findOneByOrFail({ id: line });
    expect(saleLine.quantityReturned).toBe(3);
    await noMismatch();
  });

  it('UC08-13 the return reads back the same, the sale shows it, and an unknown return is 404', async () => {
    await receive('A', 10);
    const sale = await soldSale(5);
    const created = await giveBack(sale.id, [
      { saleLineId: sale.lines[0].saleLineId, quantity: 2 },
    ]);

    const again = await t
      .http()
      .get(`/api/returns/${created.body.id}`)
      .set(as('cashier'));
    const missing = await t
      .http()
      .get(`/api/returns/${randomUUID()}`)
      .set(as('cashier'));

    expect(again.status).toBe(200);
    expect(again.body).toEqual(created.body);
    expect((await found(sale.receiptNumber)).lines[0]).toMatchObject({
      quantityReturned: 2,
      returnable: 3,
    });
    expect(missing.status).toBe(404);
  });
});
