import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Actor } from '../src/auth/actor.js';
import { PriceBook } from '../src/catalogue/price-book.js';
import {
  Batch,
  type Medicine,
  MedicineClassification,
  Prescriber,
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

type User = 'manager' | 'pharmacist' | 'cashier';
const SOURCE: Record<string, string> = {
  receipt: 'goods_receipt',
  dispense: 'dispense_line',
  sale: 'sale_line',
  return: 'return_line',
  release: 'return_line',
  reject: 'return_line',
  write_off: 'batch',
  destroy: 'batch',
  adjustment: 'stock_take_line',
};

/**
 * UC12 Produce a stock movement report (FR-37, DEC-06). One test per row of
 * the scenario table in the UC12 specification.
 *
 * `occurredAt` is stamped by the database clock, so the dated history of
 * UC12-01…10 is written with explicit times by `move()`, which inserts the
 * movement and updates the batch's cached quantities the way the ledger
 * does; `findLedgerMismatches` confirms the history balances.
 */
describe('UC12 stock movement report (e2e)', () => {
  const clock = new FixedClock(new Date('2026-10-31T03:00:00Z'));
  let t: TestApp;
  let manager: Actor;
  let para: Medicine;
  let vitc: Medicine;
  let b1: string;
  let b2: string;
  let v1: string;

  beforeAll(async () => {
    t = await createTestApp({ clock });
  });

  afterAll(async () => {
    await t.app.close();
  });

  const batch = async (medicine: Medicine, batchNumber: string, unitCost: string) =>
    (
      await t.dataSource.getRepository(Batch).save({
        medicine,
        batchNumber,
        expiryDate: '2027-12-31',
        unitCost,
        receivedAt: new Date('2026-08-01T03:00:00Z'),
      })
    ).id;

  /** One movement at a given instant (UTC), and the batch's cached quantities. */
  const move = async (
    batchId: string,
    type: string,
    at: string,
    ds = 0,
    dq = 0,
    dp = 0,
    reverses: string | null = null,
  ): Promise<string> => {
    const [row] = await t.dataSource.query<Array<{ id: string }>>(
      `INSERT INTO stock_movements (type, "deltaSellable", "deltaQuarantine", "deltaPendingDestruction",
         "sourceDocumentType", "sourceDocumentId", batch_id, performed_by_id, "occurredAt", reverses_movement_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [type, ds, dq, dp, SOURCE[type], randomUUID(), batchId, manager.id, at, reverses],
    );
    await t.dataSource.query(
      `UPDATE batches SET "qtySellable" = "qtySellable" + $2, "qtyQuarantine" = "qtyQuarantine" + $3,
         "qtyPendingDestruction" = "qtyPendingDestruction" + $4 WHERE id = $1`,
      [batchId, ds, dq, dp],
    );
    return row.id;
  };

  const report = (query: string, user: User = 'manager') =>
    t.http().get(`/api/reports/stock-movement?${query}`).set(as(user));
  type Row = Record<string, unknown> & { medicine: { code: string } };
  const rowOf = (body: { rows: Row[] }, code: string) =>
    body.rows.find((r) => r.medicine.code === code);

  beforeEach(async () => {
    clock.set(new Date('2026-10-31T03:00:00Z'));
    await resetDatabase(t.dataSource);
    manager = await actorFor(t.dataSource, 'manager');
    para = await createMedicine(t.dataSource, { code: 'PARA500', name: 'Paracetamol 500 mg' });
    vitc = await createMedicine(t.dataSource, { code: 'VITC', name: 'Vitamin C 500 mg' });
    b1 = await batch(para, 'P1', '800.00');
    b2 = await batch(para, 'P2', '1000.00');
    v1 = await batch(vitc, 'V1', '5000.00');

    // September (times in UTC; Asia/Ho_Chi_Minh is UTC+7).
    await move(b1, 'receipt', '2026-09-02T03:00:00Z', 100);
    await move(b2, 'receipt', '2026-09-05T03:00:00Z', 50);
    await move(v1, 'receipt', '2026-09-03T03:00:00Z', 40);
    await move(b1, 'dispense', '2026-09-10T03:00:00Z', -20);
    await move(b1, 'sale', '2026-09-15T03:00:00Z', -10);
    await move(b1, 'return', '2026-09-20T03:00:00Z', 0, 4);
    await move(b1, 'release', '2026-09-25T03:00:00Z', 2, -2);
    await move(b1, 'reject', '2026-09-26T03:00:00Z', 0, -2, 2);
    await move(b2, 'adjustment', '2026-09-28T03:00:00Z', -3);
    await move(b2, 'sale', '2026-09-30T16:30:00Z', -5); // 23:30 on 30/09 local
    // October.
    await move(b2, 'sale', '2026-09-30T17:30:00Z', -7); // 00:30 on 01/10 local
    await move(b1, 'write_off', '2026-10-05T03:00:00Z', -10, 0, 10);
    await move(b1, 'destroy', '2026-10-06T03:00:00Z', 0, 0, -12);
    const dispensed = await move(b2, 'dispense', '2026-10-10T03:00:00Z', -8);
    await move(b2, 'dispense', '2026-10-11T03:00:00Z', 8, 0, 0, dispensed); // reversal
    await move(b1, 'sale', '2026-10-12T03:00:00Z', -6);
    await move(v1, 'sale', '2026-10-20T03:00:00Z', -30);
  });

  it('UC12-01 TC-23: September and October match the hand calculation', async () => {
    const sep = await report('from=2026-09-01&to=2026-09-30');
    expect(sep.status).toBe(200);
    expect(rowOf(sep.body, 'PARA500')).toMatchObject({
      opening: 0,
      received: 150,
      dispensed: 20,
      sold: 15,
      returned: 4,
      released: 2,
      rejected: 2,
      writtenOff: 0,
      destroyed: 0,
      adjusted: -3,
      closing: { total: 116, sellable: 114, quarantine: 0, pendingDestruction: 2 },
      netIssued: 33,
      costNetIssued: '27400.00', // 20×800 + 10×800 + 5×1000 − 2×800
      checkOk: true,
    });

    const oct = await report('from=2026-10-01&to=2026-10-31');
    expect(rowOf(oct.body, 'PARA500')).toMatchObject({
      opening: 116, // September's closing
      received: 0,
      dispensed: 0, // 8 dispensed and reversed
      sold: 13,
      writtenOff: 10,
      destroyed: 12,
      adjusted: 0,
      closing: { total: 91, sellable: 91, quarantine: 0, pendingDestruction: 0 },
      netIssued: 13,
      costNetIssued: '11800.00', // 7×1000 + 6×800
      checkOk: true,
    });
    expect(await findLedgerMismatches(t.dataSource)).toEqual([]);
  });

  it('UC12-02 every row passes the check, and the totals add the rows', async () => {
    const res = await report('from=2026-09-01&to=2026-10-31');
    expect(res.body.rows.every((r: { checkOk: boolean }) => r.checkOk)).toBe(true);
    const totals = res.body.totals;
    expect(totals.closing.total).toBe(91 + 10);
    expect(totals.sold).toBe(15 + 13 + 30);
    expect(totals.costNetIssued).toBe('189200.00'); // 27400 + 11800 + 30×5000
  });

  it('UC12-03 a movement at 23:30 belongs to that day, one at 00:30 to the next', async () => {
    const lastDay = await report('from=2026-09-30&to=2026-09-30');
    expect(rowOf(lastDay.body, 'PARA500')?.sold).toBe(5);
    const firstDay = await report('from=2026-10-01&to=2026-10-01');
    expect(rowOf(firstDay.body, 'PARA500')?.sold).toBe(7);
  });

  it('UC12-04 a reversed dispensing nets out in the dispensed column', async () => {
    const tenth = await report('from=2026-10-10&to=2026-10-10');
    expect(rowOf(tenth.body, 'PARA500')).toMatchObject({ dispensed: 8, netIssued: 8, costNetIssued: '8000.00' });
    const both = await report('from=2026-10-10&to=2026-10-11');
    expect(rowOf(both.body, 'PARA500')).toMatchObject({ dispensed: 0, netIssued: 0, costNetIssued: '0.00' });
  });

  it('UC12-06 the cost uses each batch’s own unit cost', async () => {
    const res = await report('from=2026-10-01&to=2026-10-01');
    expect(rowOf(res.body, 'PARA500')?.costNetIssued).toBe('7000.00'); // 7 × 1000 from P2
  });

  it('UC12-07 sorted by cost of net issued; the category filter keeps only that category', async () => {
    const res = await report('from=2026-10-01&to=2026-10-31');
    expect(res.body.rows.map((r: { medicine: { code: string } }) => r.medicine.code)).toEqual([
      'VITC', // 150000.00
      'PARA500', // 11800.00
    ]);
    const only = await report(`from=2026-10-01&to=2026-10-31&categoryId=${para.category.id}`);
    expect(only.body.rows.map((r: { medicine: { code: string } }) => r.medicine.code)).toEqual(['PARA500']);
  });

  it('UC12-08 a missing date, from after to, to in the future, more than 366 days: 400 on the field', async () => {
    const field = async (query: string) => {
      const res = await report(query);
      expect(res.status).toBe(400);
      return [...new Set(res.body.errors.map((e: { field: string }) => e.field))];
    };
    expect(await field('to=2026-10-31')).toEqual(['from']);
    expect(await field('from=2026-10-10&to=2026-10-01')).toEqual(['to']);
    expect(await field('from=2026-10-01&to=2026-11-01')).toEqual(['to']);
    expect(await field('from=2025-10-01&to=2026-10-31')).toEqual(['to']);
    expect(await field('from=2026-10-01&to=2026-10-31&categoryId=x')).toEqual(['categoryId']);
  });

  it('UC12-09 a period with no stock and no movement has no rows', async () => {
    const res = await report('from=2026-08-01&to=2026-08-31');
    expect(res.status).toBe(200);
    expect(res.body.rows).toEqual([]);
    expect(res.body.totals.costNetIssued).toBe('0.00');
  });

  it('UC12-10 the movements behind a row, in time order, with the reversal marked', async () => {
    const res = await t
      .http()
      .get(`/api/reports/stock-movement/medicines/${para.id}?from=2026-10-01&to=2026-10-31`)
      .set(as('manager'));
    expect(res.status).toBe(200);
    expect(res.body.movements.map((m: { type: string; batchNumber: string }) => `${m.type} ${m.batchNumber}`)).toEqual([
      'sale P2',
      'write_off P1',
      'destroy P1',
      'dispense P2',
      'dispense P2',
      'sale P1',
    ]);
    expect(res.body.movements.map((m: { isReversal: boolean }) => m.isReversal)).toEqual([
      false, false, false, false, true, false,
    ]);
    expect(res.body.movements[0]).toMatchObject({ deltaSellable: -7, performedBy: manager.fullName });
    const unknown = await t
      .http()
      .get(`/api/reports/stock-movement/medicines/${randomUUID()}?from=2026-10-01&to=2026-10-31`)
      .set(as('manager'));
    expect(unknown.status).toBe(404);
  });

  it('UC12-11 every kind through GET /reports/:kind with the same envelope; an unknown kind is 400', async () => {
    await t.dataSource.query(`UPDATE medicines SET "reorderLevel" = 100 WHERE id = $1`, [para.id]);
    for (const kind of ['stock-movement?from=2026-10-01&to=2026-10-31', 'low-stock']) {
      const res = await t.http().get(`/api/reports/${kind}`).set(as('manager'));
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        kind: kind.split('?')[0],
        producedAt: clock.now().toISOString(),
        producedBy: { fullName: manager.fullName },
      });
      expect(Array.isArray(res.body.rows)).toBe(true);
    }
    const low = await t.http().get('/api/reports/low-stock').set(as('manager'));
    expect(low.body.rows).toEqual([
      expect.objectContaining({
        medicine: expect.objectContaining({ code: 'PARA500' }),
        sellable: 91,
        reorderLevel: 100,
        state: 'low_stock',
      }),
    ]);
    const bad = await t.http().get('/api/reports/turnover').set(as('manager'));
    expect(bad.status).toBe(400);
    expect(bad.body.errors[0].field).toBe('kind');
  });

  it('UC12-12 TC-28: a pharmacist or a cashier cannot see the report', async () => {
    for (const user of ['pharmacist', 'cashier'] as const) {
      expect((await report('from=2026-10-01&to=2026-10-31', user)).status).toBe(403);
      expect((await t.http().get('/api/reports/low-stock').set(as(user))).status).toBe(403);
    }
  });
});

/**
 * UC12-05 through the real API: billing a handed-over prescription (UC07)
 * writes no movement, so the medicine is counted once, as dispensed (DEC-05).
 * The period is the database's own business day, because the ledger stamps
 * movements with the database clock.
 */
describe('UC12 billing counted once (e2e)', () => {
  const clock = new FixedClock(new Date());
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ clock });
  });

  afterAll(async () => {
    await t.app.close();
  });

  it('UC12-05 TC-52: a billed dispensing is dispensed once and never sold', async () => {
    await resetDatabase(t.dataSource);
    const [{ today }] = await t.dataSource.query<Array<{ today: string }>>(
      `SELECT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::text AS today`,
    );
    clock.set(new Date(`${today}T05:00:00Z`));
    const medicine = await createMedicine(t.dataSource, {
      code: 'AMOX500',
      name: 'Amoxicillin 500 mg',
      classification: MedicineClassification.PRESCRIPTION,
    });
    const actor = await actorFor(t.dataSource, 'manager');
    await t.app.get(PriceBook).setPrice(t.dataSource.manager, actor, medicine.id, 2000, '2026-01-01');
    const supplier = (
      await t.http().post('/api/suppliers').set(as('manager')).send({ name: 'Phano', phone: '028 3855 1234' })
    ).body.id;
    const receipt = await t.http().post('/api/goods-receipts').set(as('manager')).send({
      supplierId: supplier,
      documentNumber: 'HD-1',
      receiptDate: today,
      lines: [{ medicineId: medicine.id, batchNumber: 'A1', expiryDate: '2028-01-31', quantity: 10, unitCost: 800 }],
    });
    expect(receipt.status).toBe(201);
    const customer = (
      await t.http().post('/api/customers').set(as('pharmacist')).send({
        fullName: 'Test Patient', phone: '0909 123 456', dateOfBirth: '1990-01-01', address: '1 Test Street',
      })
    ).body.id;
    const prescriber = await t.dataSource.getRepository(Prescriber).save({
      licenceNumber: 'CCHN-1', fullName: 'Dr. Test', isActive: true,
    });
    const rx = await t.http().post('/api/prescriptions').set(as('pharmacist')).send({
      referenceNumber: 'RX-1',
      issuedDate: today,
      customerId: customer,
      prescriberId: prescriber.id,
      items: [{ medicineId: medicine.id, strength: '500 mg', quantityPrescribed: 3, dose: '1 x 3', route: 'oral', daysOfUse: 1 }],
    });
    expect(rx.status).toBe(201);
    await t.http().post(`/api/prescriptions/${rx.body.id}/verify`).set(as('pharmacist')).send({});
    const handOver = await t.http().post('/api/dispensings').set(as('pharmacist')).send({
      requestId: randomUUID(),
      prescriptionId: rx.body.id,
      items: [{ prescriptionItemId: rx.body.items[0].id, quantity: 3 }],
    });
    expect(handOver.status).toBe(201);
    const bill = await t.http().post('/api/sales').set(as('cashier')).send({
      requestId: randomUUID(),
      prescriptionId: rx.body.id,
    });
    expect(bill.status).toBe(201);

    const res = await t.http().get(`/api/reports/stock-movement?from=${today}&to=${today}`).set(as('manager'));
    expect(res.status).toBe(200);
    expect(res.body.rows).toEqual([
      expect.objectContaining({ received: 10, dispensed: 3, sold: 0, netIssued: 3, costNetIssued: '2400.00', checkOk: true }),
    ]);
  });
});
