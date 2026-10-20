import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Actor } from '../src/auth/actor.js';
import {
  Batch,
  BatchStatus,
  Customer,
  MovementType,
  Prescriber,
  SourceDocumentType,
} from '../src/entities/index.js';
import { FixedClock } from '../src/stock/clock.js';
import { findLedgerMismatches } from '../src/stock/ledger-invariant.js';
import { StockLedger } from '../src/stock/stock-ledger.js';
import { actorFor } from './e2e/fixtures.js';
import {
  as,
  createTestApp,
  resetDatabase,
  type TestApp,
} from './e2e/helpers.js';

const DOC = '00000000-0000-4000-8000-0000000000d4';
const ON_20_OCT = new Date('2026-10-20T03:00:00Z');

/**
 * UC04 look up stock and batch history through the HTTP API: the rows
 * S01–S13 of the scenario table in UC04-look-up-stock.md.
 */
describe('UC04 stock lookup (e2e)', () => {
  // 10:00 on 20/10/2026 in Vietnam.
  const clock = new FixedClock(ON_20_OCT);
  let t: TestApp;
  let ledger: StockLedger;
  let manager: Actor;
  let categories: Array<{ id: string; code: string }>;
  let unitId: string;
  let supplierId: string;

  beforeAll(async () => {
    t = await createTestApp({ clock });
    ledger = t.app.get(StockLedger);
  });

  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    clock.set(ON_20_OCT);
    await resetDatabase(t.dataSource);
    manager = await actorFor(t.dataSource, 'manager');
    const ref = await t
      .http()
      .get('/api/medicines/reference-data')
      .set(as('manager'));
    categories = ref.body.categories;
    unitId = ref.body.units[0].id;
    supplierId = (
      await t
        .http()
        .post('/api/suppliers')
        .set(as('manager'))
        .send({ name: 'Phano Pharma', phone: '028 3855 1234' })
    ).body.id;
  });

  /** An OTC medicine with a price in force today, created through the API. */
  async function medicine(
    code: string,
    name: string,
    options: { ingredient?: string; category?: number } = {},
  ): Promise<string> {
    const res = await t
      .http()
      .post('/api/medicines')
      .set(as('manager'))
      .send({
        code,
        name,
        activeIngredient: options.ingredient ?? null,
        categoryId: categories[options.category ?? 0].id,
        baseUnitId: unitId,
        classification: 'otc',
        classificationSource: 'Package label',
        classificationDate: '2026-10-01',
        currentPrice: 1500,
      });
    expect(res.status).toBe(201);
    return res.body.id;
  }

  /** A batch straight through the ledger, for states the API cannot reach yet. */
  function batch(
    medicineId: string,
    batchNumber: string,
    quantity: number,
    expiryDate: string,
  ): Promise<string> {
    return ledger.run(async (tx) => {
      await tx.lockMedicines([medicineId]);
      const b = await tx.createBatch({
        medicineId,
        batchNumber,
        expiryDate,
        unitCost: '1000',
        receivedAt: new Date('2026-09-01T03:00:00Z'),
      });
      await tx.post(manager, {
        batchId: b.id,
        type: MovementType.RECEIPT,
        deltaSellable: quantity,
        sourceDocumentType: SourceDocumentType.GOODS_RECEIPT,
        sourceDocumentId: DOC,
      });
      return b.id;
    });
  }

  /** A returned item waiting for assessment (UC08 is not built yet). */
  function quarantine(medicineId: string, batchId: string, quantity: number) {
    return ledger.run(async (tx) => {
      await tx.lockMedicines([medicineId]);
      await tx.lockBatches([batchId]);
      await tx.post(manager, {
        batchId,
        type: MovementType.RETURN,
        deltaQuarantine: quantity,
        sourceDocumentType: SourceDocumentType.RETURN_LINE,
        sourceDocumentId: DOC,
      });
    });
  }

  const list = (query: Record<string, string | number | boolean> = {}) =>
    t.http().get('/api/stock').query(query).set(as('pharmacist'));
  const detail = (id: string) =>
    t.http().get(`/api/stock/medicines/${id}`).set(as('pharmacist'));
  const history = (id: string) =>
    t.http().get(`/api/stock/batches/${id}/movements`).set(as('pharmacist'));
  const codes = (body: { items: Array<{ medicine: { code: string } }> }) =>
    body.items.map((i) => i.medicine.code);

  it('UC04-01 searches code, name and active ingredient in any case (TC-48)', async () => {
    const para = await medicine('PARA500', 'Panadol 500 mg', {
      ingredient: 'Paracetamol',
    });
    await medicine('VITC', 'Vitamin C 500 mg');
    await batch(para, 'P1', 7, '2027-06-30');

    for (const search of ['para', 'PANADOL', 'paracetamol']) {
      const res = await list({ search });
      expect(res.status).toBe(200);
      expect(codes(res.body)).toEqual(['PARA500']);
      expect(res.body.items[0]).toMatchObject({ sellable: 7 });
    }
    expect(codes((await list({ search: 'vitc' })).body)).toEqual(['VITC']);
  });

  it('UC04-02 filters by category and by stock state', async () => {
    const inStock = await medicine('INSTK', 'Filter in stock');
    await medicine('NOSTK', 'Filter out of stock');
    const old = await medicine('OLDSTK', 'Filter expired', { category: 1 });
    await batch(inStock, 'A', 5, '2027-06-30');
    await batch(old, 'B', 3, '2026-10-01');

    const search = 'Filter';
    expect(
      codes((await list({ search, categoryId: categories[1].id })).body),
    ).toEqual(['OLDSTK']);
    expect(codes((await list({ search, state: 'in_stock' })).body)).toEqual([
      'INSTK',
    ]);
    expect(codes((await list({ search, state: 'out_of_stock' })).body)).toEqual(
      ['OLDSTK', 'NOSTK'],
    );
    expect(codes((await list({ search, state: 'has_expired' })).body)).toEqual([
      'OLDSTK',
    ]);
  });

  it('UC04-03 counts only active, unexpired batches as sellable and shows the rest apart (TC-48)', async () => {
    const id = await medicine('MIX', 'Mixed stock');
    const a = await batch(id, 'A', 10, '2027-01-31');
    await batch(id, 'B', 5, '2027-06-30');
    await batch(id, 'C', 4, '2026-10-01');
    const d = await batch(id, 'D', 6, '2027-03-31');
    await t.dataSource
      .getRepository(Batch)
      .update({ id: d }, { status: BatchStatus.ON_HOLD });
    await quarantine(id, a, 2);

    const expected = {
      sellable: 15,
      expired: 4,
      held: 6,
      quarantine: 2,
      pendingDestruction: 0,
    };
    const row = (await list({ search: 'MIX' })).body.items[0];
    expect(row).toMatchObject({ ...expected, nextExpiry: '2027-01-31' });

    const res = await detail(id);
    expect(res.status).toBe(200);
    expect(res.body.totals).toEqual(expected);
    expect(
      res.body.batches.map((b: { batchNumber: string; state: string }) => [
        b.batchNumber,
        b.state,
      ]),
    ).toEqual([
      ['C', 'expired'],
      ['A', 'active'],
      ['D', 'on_hold'],
      ['B', 'active'],
    ]);
    expect(res.body.batches[1]).toMatchObject({
      qtySellable: 10,
      qtyQuarantine: 2,
      daysLeft: 103,
    });
  });

  it('UC04-04 a batch expiring on the business date is expired, not sellable (BR02, DEC-01)', async () => {
    const id = await medicine('EDGE', 'Expires today');
    await batch(id, 'T', 9, '2026-10-20');

    expect((await list({ search: 'EDGE' })).body.items[0]).toMatchObject({
      sellable: 0,
      expired: 9,
    });
    expect((await detail(id)).body.batches[0]).toMatchObject({
      state: 'expired',
      daysLeft: 0,
    });
  });

  it('UC04-05 moving the business date past the expiry moves the stock to expired without a movement', async () => {
    const id = await medicine('LATER', 'Expires on the 25th');
    const b = await batch(id, 'L', 8, '2026-10-25');
    expect((await list({ search: 'LATER' })).body.items[0].sellable).toBe(8);

    clock.set(new Date('2026-10-25T03:00:00Z'));
    expect((await list({ search: 'LATER' })).body.items[0]).toMatchObject({
      sellable: 0,
      expired: 8,
    });
    expect((await history(b)).body.movements).toHaveLength(1);
  });

  it('UC04-06 lists a batch history in time order with running balance, user and source (TC-48, TC-24)', async () => {
    const id = await medicine('HIST', 'History medicine');
    const receipt = await t
      .http()
      .post('/api/goods-receipts')
      .set(as('manager'))
      .send({
        supplierId,
        documentNumber: 'HD-0042',
        receiptDate: '2026-10-20',
        lines: [
          {
            medicineId: id,
            batchNumber: 'H1',
            expiryDate: '2027-06-30',
            quantity: 10,
            unitCost: 800,
          },
        ],
      });
    expect(receipt.status).toBe(201);
    const batchId = receipt.body.lines[0].batch.id;

    await dispense(id, 'RX-0007', 3);
    const sale = await t
      .http()
      .post('/api/sales')
      .set(as('cashier'))
      .send({
        requestId: randomUUID(),
        otcLines: [{ medicineId: id, quantity: 2 }],
      });
    expect(sale.status).toBe(201);

    const res = await history(batchId);
    expect(res.status).toBe(200);
    expect(res.body.batch).toMatchObject({
      batchNumber: 'H1',
      medicine: { code: 'HIST' },
    });
    expect(
      res.body.movements.map(
        (m: {
          type: string;
          deltaSellable: number;
          balanceSellable: number;
          performedBy: { fullName: string };
          source: { reference: string };
        }) => [
          m.type,
          m.deltaSellable,
          m.balanceSellable,
          m.performedBy.fullName,
          m.source.reference,
        ],
      ),
    ).toEqual([
      ['receipt', 10, 10, 'Sample Manager', 'HD-0042'],
      ['dispense', -3, 7, 'Sample Pharmacist', 'RX-0007'],
      ['sale', -2, 5, 'Sample Cashier', sale.body.receiptNumber],
    ]);
    const batchRow = await t.dataSource
      .getRepository(Batch)
      .findOneByOrFail({ id: batchId });
    expect(batchRow.qtySellable).toBe(5);
  });

  it('UC04-07 a reversal names what it reverses and the original stays visible (A3)', async () => {
    const id = await medicine('REV', 'Reversed receipt');
    const b = await batch(id, 'R', 10, '2027-06-30');
    const [original] = (await history(b)).body.movements;
    await ledger.run((tx) =>
      tx.reverse(manager, original.id, 'Wrong quantity'),
    );

    const { movements } = (await history(b)).body;
    expect(movements).toHaveLength(2);
    expect(movements[0]).toMatchObject({
      id: original.id,
      balanceSellable: 10,
      reverses: null,
    });
    expect(movements[0].reversedBy).toMatchObject({ id: movements[1].id });
    expect(movements[1]).toMatchObject({
      deltaSellable: -10,
      balanceSellable: 0,
      reason: 'Wrong quantity',
      reverses: { id: original.id, type: 'receipt' },
      reversedBy: null,
    });
  });

  it('UC04-08 hides a deactivated medicine unless asked, and its stock stays viewable (FR-02)', async () => {
    const id = await medicine('GONE', 'Deactivated medicine');
    const b = await batch(id, 'G', 3, '2027-06-30');
    await t
      .http()
      .post(`/api/medicines/${id}/deactivate`)
      .set(as('manager'))
      .expect(200);

    expect((await list({ search: 'GONE' })).body.items).toEqual([]);
    const shown = await list({ search: 'GONE', includeInactive: true });
    expect(shown.body.items[0]).toMatchObject({
      medicine: { isActive: false },
      sellable: 3,
    });
    expect((await detail(id)).status).toBe(200);
    expect((await history(b)).status).toBe(200);
  });

  it('UC04-09 pages the list and counts every match', async () => {
    for (const letter of ['C', 'A', 'B']) {
      await medicine(`PG${letter}`, `Paging ${letter}`);
    }
    const first = await list({ search: 'Paging', pageSize: 2 });
    expect(first.body).toMatchObject({ total: 3, page: 1, pageSize: 2 });
    expect(codes(first.body)).toEqual(['PGA', 'PGB']);
    const second = await list({ search: 'Paging', pageSize: 2, page: 2 });
    expect(codes(second.body)).toEqual(['PGC']);
  });

  it('UC04-10 no match is an empty page, not an error (A1)', async () => {
    const res = await list({ search: 'no such medicine' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ items: [], total: 0 });
  });

  it('UC04-11 refuses unknown and malformed ids and filters', async () => {
    const unknown = randomUUID();
    expect((await detail(unknown)).status).toBe(404);
    expect((await history(unknown)).status).toBe(404);
    expect((await detail('not-an-id')).status).toBe(400);

    const huge = await list({ page: '1e308' });
    expect(huge.status).toBe(400);
    expect(huge.body.errors[0].field).toBe('page');

    const bad = await list({ state: 'empty', pageSize: 500, page: 0 });
    expect(bad.status).toBe(400);
    expect(
      bad.body.errors.map((e: { field: string }) => e.field).sort(),
    ).toEqual(['page', 'pageSize', 'state']);
  });

  it('UC04-12 needs a session and is open to every role', async () => {
    expect((await t.http().get('/api/stock')).status).toBe(401);
    for (const role of ['manager', 'pharmacist', 'cashier'] as const) {
      expect((await t.http().get('/api/stock').set(as(role))).status).toBe(200);
    }
  });

  it('UC04-13 sellable and the last balance always equal the ledger (BR05)', async () => {
    const id = await medicine('INV', 'Invariant medicine');
    const a = await batch(id, 'IA', 4, '2026-12-31');
    const b = await batch(id, 'IB', 9, '2027-06-30');
    await dispense(id, 'RX-0013', 6);
    await t
      .http()
      .post('/api/sales')
      .set(as('cashier'))
      .send({
        requestId: randomUUID(),
        otcLines: [{ medicineId: id, quantity: 1 }],
      })
      .expect(201);

    expect(await findLedgerMismatches(t.dataSource)).toEqual([]);
    const lastBalance = async (batchId: string) =>
      (await history(batchId)).body.movements.at(-1).balanceSellable as number;
    const total = (await lastBalance(a)) + (await lastBalance(b));
    expect(total).toBe(6);
    expect((await list({ search: 'INV' })).body.items[0].sellable).toBe(total);
  });

  /** Records, verifies and hands over a one-line prescription through the API. */
  async function dispense(
    medicineId: string,
    reference: string,
    quantity: number,
  ) {
    const customerId = (
      await t.dataSource.getRepository(Customer).save({
        code: `KH-${reference}`,
        fullName: 'Nguyen Van An',
        dateOfBirth: '1980-05-01',
        address: '10 Tran Hung Dao, District 5',
      })
    ).id;
    const prescriberId = (
      await t.dataSource.getRepository(Prescriber).save({
        licenceNumber: `CCHN-${reference}`,
        fullName: 'Dr. Tran Van Quang',
        isActive: true,
      })
    ).id;
    const rx = await t
      .http()
      .post('/api/prescriptions')
      .set(as('pharmacist'))
      .send({
        referenceNumber: reference,
        issuedDate: '2026-10-20',
        customerId,
        prescriberId,
        items: [
          {
            medicineId,
            strength: '500 mg',
            quantityPrescribed: quantity,
            dose: '1 tablet twice a day',
            route: 'oral',
            daysOfUse: 5,
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
    const res = await t
      .http()
      .post('/api/dispensings')
      .set(as('pharmacist'))
      .send({
        requestId: randomUUID(),
        prescriptionId: rx.body.id,
        items: [{ prescriptionItemId: rx.body.items[0].id, quantity }],
      });
    expect(res.status).toBe(201);
  }
});
