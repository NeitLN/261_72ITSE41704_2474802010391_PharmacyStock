import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Batch, GoodsReceipt, StockMovement } from '../src/entities/index.js';
import { FixedClock } from '../src/stock/clock.js';
import { findLedgerMismatches } from '../src/stock/ledger-invariant.js';
import {
  as,
  createTestApp,
  resetDatabase,
  type TestApp,
} from './e2e/helpers.js';

/** UC03 Record a goods receipt (FR-06 to FR-09). */
describe('UC03 goods receipts (e2e)', () => {
  const clock = new FixedClock(new Date('2026-10-12T03:00:00Z'));
  let t: TestApp;
  let supplierId: string;
  let paraId: string;
  let vitcId: string;

  beforeAll(async () => {
    t = await createTestApp({ clock });
  });

  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(t.dataSource);
    const ref = await t
      .http()
      .get('/api/medicines/reference-data')
      .set(as('manager'));
    const categoryId = ref.body.categories[0].id;
    const baseUnitId = ref.body.units[0].id;
    const medicine = async (code: string, name: string) =>
      (
        await t
          .http()
          .post('/api/medicines')
          .set(as('manager'))
          .send({ code, name, categoryId, baseUnitId, currentPrice: 1000 })
      ).body.id as string;
    paraId = await medicine('PARA500', 'Paracetamol 500 mg');
    vitcId = await medicine('VITC', 'Vitamin C 500 mg');
    supplierId = (
      await t
        .http()
        .post('/api/suppliers')
        .set(as('manager'))
        .send({ name: 'Phano Pharma', phone: '028 3855 1234' })
    ).body.id;
  });

  const receipt = (overrides: object = {}) => ({
    supplierId,
    documentNumber: 'HD-0001',
    receiptDate: '2026-10-12',
    lines: [
      {
        medicineId: paraId,
        batchNumber: 'P2601',
        expiryDate: '2027-06-30',
        quantity: 10,
        unitCost: 800,
      },
    ],
    ...overrides,
  });

  const post = (
    body: object,
    user: 'manager' | 'pharmacist' | 'cashier' = 'manager',
  ) => t.http().post('/api/goods-receipts').set(as(user)).send(body);

  const fieldsOf = (body: { errors: { field: string }[] }) =>
    body.errors.map((e) => e.field).sort();

  const counts = async () => ({
    receipts: await t.dataSource.getRepository(GoodsReceipt).count(),
    batches: await t.dataSource.getRepository(Batch).count(),
    movements: await t.dataSource.getRepository(StockMovement).count(),
  });

  it('UC03-01 a valid receipt creates the batch, +10 stock and one linked movement (TC-01)', async () => {
    const res = await post(receipt());

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      documentNumber: 'HD-0001',
      totalCost: '8000.00',
      supplier: { name: 'Phano Pharma' },
      receivedBy: { fullName: 'Sample Manager' },
      lines: [
        {
          lineNumber: 1,
          medicine: { code: 'PARA500' },
          batch: {
            batchNumber: 'P2601',
            expiryDate: '2027-06-30',
            qtySellable: 10,
          },
          quantity: 10,
          unitCost: '800.00',
        },
      ],
    });
    const movement = await t.dataSource
      .getRepository(StockMovement)
      .findOneOrFail({ where: {}, relations: { batch: true } });
    expect(movement).toMatchObject({
      type: 'receipt',
      deltaSellable: 10,
      sourceDocumentType: 'goods_receipt',
      sourceDocumentId: res.body.id,
    });
    expect(await findLedgerMismatches(t.dataSource)).toEqual([]);
  });

  it('UC03-02 several lines in one receipt; totals avoid floating point', async () => {
    const res = await post(
      receipt({
        lines: [
          {
            medicineId: paraId,
            batchNumber: 'P1',
            expiryDate: '2027-01-31',
            quantity: 3,
            unitCost: 0.1,
          },
          {
            medicineId: vitcId,
            batchNumber: 'V1',
            expiryDate: '2027-02-28',
            quantity: 3,
            unitCost: 0.2,
          },
        ],
      }),
    );
    expect(res.status).toBe(201);
    // 3 × 0.1 + 3 × 0.2 = 0.90 exactly, not 0.9000000000000001
    expect(res.body.totalCost).toBe('0.90');
    expect(await counts()).toEqual({ receipts: 1, batches: 2, movements: 2 });
  });

  it('UC03-03 invalid quantities and costs are field errors; nothing saved (4b, TC-02)', async () => {
    const res = await post(
      receipt({
        lines: [
          {
            medicineId: paraId,
            batchNumber: 'P1',
            expiryDate: '2027-01-31',
            quantity: 0,
            unitCost: -1,
          },
          {
            medicineId: paraId,
            batchNumber: 'P2',
            expiryDate: '2027-01-31',
            quantity: 'ten',
            unitCost: 1.234,
          },
          {
            medicineId: paraId,
            batchNumber: ' ',
            expiryDate: '2027-01-31',
            quantity: 2.5,
            unitCost: 5,
          },
        ],
      }),
    );

    expect(res.status).toBe(400);
    expect(fieldsOf(res.body)).toEqual(
      expect.arrayContaining([
        'lines.0.quantity',
        'lines.0.unitCost',
        'lines.1.quantity',
        'lines.1.unitCost',
        'lines.2.batchNumber',
        'lines.2.quantity',
      ]),
    );
    expect(await counts()).toEqual({ receipts: 0, batches: 0, movements: 0 });
  });

  it('UC03-04 expiry on or before the receipt date is refused on its line (TC-49)', async () => {
    const res = await post(
      receipt({
        lines: [
          {
            medicineId: paraId,
            batchNumber: 'P1',
            expiryDate: '2026-10-12',
            quantity: 1,
            unitCost: 1,
          },
          {
            medicineId: paraId,
            batchNumber: 'P2',
            expiryDate: '2026-10-13',
            quantity: 1,
            unitCost: 1,
          },
        ],
      }),
    );
    expect(res.status).toBe(400);
    expect(fieldsOf(res.body)).toEqual(['lines.0.expiryDate']);
  });

  it('UC03-14 dates must be full calendar dates', async () => {
    const res = await post(
      receipt({
        receiptDate: '2026-10',
        lines: [{ ...receipt().lines[0], expiryDate: '2027-02-30' }],
      }),
    );
    expect(res.status).toBe(400);
    expect(fieldsOf(res.body)).toEqual(['lines.0.expiryDate', 'receiptDate']);
  });

  it('UC03-15 a total above the column limit is a field error, not a 500', async () => {
    const big = {
      ...receipt().lines[0],
      quantity: 1_000_000,
      unitCost: 1_000_000,
    };
    const res = await post(receipt({ lines: [big] }));
    expect(res.status).toBe(400);
    expect(fieldsOf(res.body)).toEqual(['lines']);
    expect(await counts()).toEqual({ receipts: 0, batches: 0, movements: 0 });
  });

  it('UC03-16 a new batch counts as received on the receipt date for FEFO (DEC-07)', async () => {
    clock.set(new Date('2026-10-12T15:00:00Z')); // 22:00 in Vietnam
    await post(receipt({ receiptDate: '2026-10-10' })).expect(201);
    const batch = await t.dataSource.getRepository(Batch).findOneByOrFail({});
    expect(batch.receivedAt.toISOString()).toBe('2026-10-09T17:00:00.000Z');
    clock.set(new Date('2026-10-12T03:00:00Z'));
  });

  it('UC03-05 a receipt date in the future is refused', async () => {
    const res = await post(receipt({ receiptDate: '2026-10-13' }));
    expect(fieldsOf(res.body)).toEqual(['receiptDate']);
  });

  it('UC03-06 the same document number for the same supplier is refused; stock not added twice (4a, TC-03)', async () => {
    await post(receipt()).expect(201);
    const again = await post(receipt());

    expect(again.status).toBe(409);
    expect(again.body.code).toBe('DUPLICATE_DOCUMENT');
    expect(fieldsOf(again.body)).toEqual(['documentNumber']);
    expect(await counts()).toEqual({ receipts: 1, batches: 1, movements: 1 });

    const other = (
      await t
        .http()
        .post('/api/suppliers')
        .set(as('manager'))
        .send({ name: 'Zuellig', phone: '028 1111 2222' })
    ).body.id;
    await post(receipt({ supplierId: other })).expect(201);
  });

  it('UC03-07 the same batch number with the same expiry tops up the batch (decision 17)', async () => {
    await post(receipt()).expect(201);
    const res = await post(receipt({ documentNumber: 'HD-0002' }));

    expect(res.status).toBe(201);
    expect(res.body.lines[0].batch.qtySellable).toBe(20);
    expect(await counts()).toEqual({ receipts: 2, batches: 1, movements: 2 });
    expect(await findLedgerMismatches(t.dataSource)).toEqual([]);
  });

  it('UC03-08 a mid-receipt failure rolls back every line (4c, FR-09, TC-25)', async () => {
    await post(receipt()).expect(201);

    // Line 1 is valid and is written first; line 2 clashes with the batch
    // above (same number, other expiry) and fails inside the transaction.
    const res = await post(
      receipt({
        documentNumber: 'HD-0002',
        lines: [
          {
            medicineId: vitcId,
            batchNumber: 'V9',
            expiryDate: '2027-03-31',
            quantity: 5,
            unitCost: 100,
          },
          {
            medicineId: paraId,
            batchNumber: 'P2601',
            expiryDate: '2027-07-31',
            quantity: 5,
            unitCost: 100,
          },
        ],
      }),
    );

    expect(res.status).toBe(400);
    expect(fieldsOf(res.body)).toEqual(['lines.1.expiryDate']);
    expect(await counts()).toEqual({ receipts: 1, batches: 1, movements: 1 });
    expect(await findLedgerMismatches(t.dataSource)).toEqual([]);
  });

  it('UC03-09 a deactivated medicine or supplier cannot be received (TC-46)', async () => {
    await t
      .http()
      .post(`/api/medicines/${paraId}/deactivate`)
      .set(as('manager'));
    const medicine = await post(receipt());
    expect(medicine.status).toBe(400);
    expect(fieldsOf(medicine.body)).toEqual(['lines.0.medicineId']);

    await t.http().post(`/api/medicines/${paraId}/activate`).set(as('manager'));
    await t
      .http()
      .post(`/api/suppliers/${supplierId}/deactivate`)
      .set(as('manager'));
    const supplier = await post(receipt());
    expect(fieldsOf(supplier.body)).toEqual(['supplierId']);
    expect(await counts()).toEqual({ receipts: 0, batches: 0, movements: 0 });
  });

  it('UC03-10 the same batch twice on one receipt is refused', async () => {
    const line = receipt().lines[0];
    const res = await post(receipt({ lines: [line, line] }));
    expect(fieldsOf(res.body)).toEqual(['lines.1.batchNumber']);
  });

  it('UC03-11 an empty receipt is refused', async () => {
    const res = await post(receipt({ lines: [] }));
    expect(fieldsOf(res.body)).toEqual(['lines']);
  });

  it('UC03-12 only the manager records or reads receipts (Table 2.4, TC-28)', async () => {
    for (const user of ['pharmacist', 'cashier'] as const) {
      expect((await post(receipt(), user)).status).toBe(403);
      expect(
        (await t.http().get('/api/goods-receipts').set(as(user))).status,
      ).toBe(403);
    }
    expect(await counts()).toEqual({ receipts: 0, batches: 0, movements: 0 });
  });

  it('UC03-13 the list shows totals and line counts, newest first; details by id', async () => {
    const first = await post(receipt());
    await post(
      receipt({
        documentNumber: 'HD-0002',
        lines: [
          {
            medicineId: paraId,
            batchNumber: 'P3',
            expiryDate: '2027-01-31',
            quantity: 1,
            unitCost: 1,
          },
          {
            medicineId: vitcId,
            batchNumber: 'V3',
            expiryDate: '2027-01-31',
            quantity: 1,
            unitCost: 1,
          },
        ],
      }),
    );

    const list = await t.http().get('/api/goods-receipts').set(as('manager'));
    expect(
      list.body.map((r: { documentNumber: string; lineCount: number }) => [
        r.documentNumber,
        r.lineCount,
      ]),
    ).toEqual([
      ['HD-0002', 2],
      ['HD-0001', 1],
    ]);
    const one = await t
      .http()
      .get(`/api/goods-receipts/${first.body.id}`)
      .set(as('manager'));
    expect(one.body.lines).toHaveLength(1);
  });
});
