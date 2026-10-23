import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Actor } from '../src/auth/actor.js';
import { PriceBook } from '../src/catalogue/price-book.js';
import {
  AlertStatus,
  AlertType,
  Batch,
  type Medicine,
  MovementType,
  SourceDocumentType,
  StockAlert,
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

type User = 'manager' | 'pharmacist' | 'cashier';
/** Business date D = 2026-10-20 (10:00 in Asia/Ho_Chi_Minh). */
const D = new Date('2026-10-20T03:00:00Z');

/**
 * UC11 expiry list, write-off, batch status and expiry alerts (FR-35, FR-36,
 * FR-48, decision 16). One test per row of the UC11 scenario table.
 */
describe('UC11 expiry, write-off and batch status (e2e)', () => {
  const clock = new FixedClock(D);
  let t: TestApp;
  let manager: Actor;
  let med: Medicine;

  beforeAll(async () => {
    t = await createTestApp({ clock });
  });

  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    clock.set(D);
    await resetDatabase(t.dataSource);
    manager = await actorFor(t.dataSource, 'manager');
    med = await createMedicine(t.dataSource, {
      code: 'CETI10',
      name: 'Cetirizine 10 mg',
      expiryAlertDays: 30,
    });
  });

  /** A batch received through the ledger, so the alert hook runs as in use. */
  const stock = async (batchNumber: string, expiryDate: string, quantity: number, medicine = med) => {
    const batch = await t.dataSource.getRepository(Batch).save({
      medicine,
      batchNumber,
      expiryDate,
      unitCost: '600.00',
      receivedAt: new Date('2026-09-01T03:00:00Z'),
    });
    if (quantity > 0) {
      await t.app.get(StockLedger).run(async (tx) => {
        await tx.lockMedicines([medicine.id]);
        await tx.lockBatches([batch.id]);
        await tx.post(manager, {
          batchId: batch.id,
          type: MovementType.RECEIPT,
          deltaSellable: quantity,
          sourceDocumentType: SourceDocumentType.GOODS_RECEIPT,
          sourceDocumentId: randomUUID(),
        });
      });
    }
    return batch.id;
  };

  const report = (user: User = 'manager') =>
    t.http().get('/api/reports/expiry').set(as(user));
  const writeOff = (id: string, body: object, user: User = 'manager') =>
    t.http().post(`/api/batches/${id}/write-off`).set(as(user)).send(body);
  const setStatus = (id: string, body: object, user: User = 'manager') =>
    t.http().post(`/api/batches/${id}/status`).set(as(user)).send(body);
  const batchOf = (id: string) =>
    t.dataSource.getRepository(Batch).findOneByOrFail({ id });
  const expiryAlerts = (batchId: string) =>
    t.dataSource.getRepository(StockAlert).find({
      where: { batch: { id: batchId } },
      order: { raisedAt: 'ASC' },
    });

  it('UC11-01 TC-22: window 30 — expiring on D is expired; D+1 and D+30 expiring soon; D+31 not listed', async () => {
    await stock('E0', '2026-10-20', 5);
    await stock('E1', '2026-10-21', 5);
    await stock('E30', '2026-11-19', 5);
    await stock('E31', '2026-11-20', 5);

    const res = await report();
    expect(res.status).toBe(200);
    expect(res.body.kind).toBe('expiry');
    expect(
      res.body.rows.map((r: { batch: { batchNumber: string }; state: string; daysLeft: number }) =>
        `${r.batch.batchNumber} ${r.state} ${r.daysLeft}`),
    ).toEqual(['E0 expired 0', 'E1 expiring_soon 1', 'E30 expiring_soon 30']);
    expect(res.body.rows[0]).toMatchObject({ sellable: 5, value: '3000.00', canWriteOff: true });
    expect(res.body.rows[1].canWriteOff).toBe(false);
    expect(res.body.totals).toEqual({
      businessDate: '2026-10-20',
      expired: { batches: 1, quantity: 5, value: '3000.00' },
      expiringSoon: { batches: 2, quantity: 10, value: '6000.00' },
    });
  });

  it('UC11-02 TC-22: the same batch is expiring soon at 23:30 and expired at 00:30 Asia/Ho_Chi_Minh', async () => {
    await stock('MID', '2026-10-20', 5);
    clock.set(new Date('2026-10-19T16:30:00Z')); // 23:30 on 19/10
    expect((await report()).body.rows[0]).toMatchObject({ state: 'expiring_soon', daysLeft: 1 });
    clock.set(new Date('2026-10-19T17:30:00Z')); // 00:30 on 20/10
    expect((await report()).body.rows[0]).toMatchObject({ state: 'expired', daysLeft: 0 });
  });

  it('UC11-03 a batch with no sellable stock is not listed and raises no alert', async () => {
    const empty = await stock('EMPTY', '2026-10-01', 0);
    await stock('OTHER', '2027-06-30', 5); // runs the alert hook for the medicine
    expect((await report()).body.rows).toEqual([]);
    expect(await expiryAlerts(empty)).toEqual([]);
  });

  it('UC11-04 TC-56: an expired batch of 5 is written off to pending destruction; its alert is resolved', async () => {
    const id = await stock('X1', '2026-10-01', 5);
    const [raised] = await expiryAlerts(id);
    expect(raised).toMatchObject({ type: AlertType.EXPIRED, status: AlertStatus.OPEN });

    const res = await writeOff(id, { reason: 'Expired on 01/10; boxed for the supplier' });
    expect(res.status).toBe(200);
    expect(res.body.batch).toMatchObject({ qtySellable: 0, qtyPendingDestruction: 5 });
    expect(res.body.movement).toMatchObject({ deltaSellable: -5, deltaPendingDestruction: 5 });
    const movement = await t.dataSource.getRepository(StockMovement).findOneByOrFail({ id: res.body.movement.id });
    expect(movement).toMatchObject({ type: MovementType.WRITE_OFF, reason: 'Expired on 01/10; boxed for the supplier' });
    const [after] = await expiryAlerts(id);
    expect(after.status).toBe(AlertStatus.RESOLVED);
    expect((await report()).body.rows).toEqual([]);
  });

  it('UC11-05 an active batch that has not expired cannot be written off', async () => {
    const id = await stock('A1', '2026-11-01', 5);
    const res = await writeOff(id, { reason: 'Damaged' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('BATCH_STILL_SELLABLE');
    expect((await batchOf(id)).qtySellable).toBe(5);
  });

  it('UC11-06 a recalled batch that has not expired can be written off', async () => {
    const id = await stock('R1', '2027-06-30', 7);
    expect((await setStatus(id, { status: 'recalled', reason: 'Manufacturer recall notice 12/10' })).status).toBe(200);
    const res = await writeOff(id, { reason: 'Recalled; to be returned to the supplier' });
    expect(res.status).toBe(200);
    expect(res.body.batch).toMatchObject({ qtySellable: 0, qtyPendingDestruction: 7, status: 'recalled' });
  });

  it('UC11-07 nothing left to write off is 422; an empty or missing reason is 400 on reason', async () => {
    const id = await stock('X2', '2026-10-01', 5);
    for (const body of [{ reason: '   ' }, {}]) {
      const res = await writeOff(id, body);
      expect(res.status).toBe(400);
      expect(res.body.errors.map((e: { field: string }) => e.field)).toContain('reason');
    }
    expect((await writeOff(id, { reason: 'Expired' })).status).toBe(200);
    const again = await writeOff(id, { reason: 'Expired' });
    expect(again.status).toBe(422);
    expect(again.body.code).toBe('NOTHING_TO_WRITE_OFF');
  });

  it('UC11-08 TC-60: the first FEFO batch on hold is skipped, and the low-stock alert follows', async () => {
    await t.dataSource.query(`UPDATE medicines SET "reorderLevel" = 5 WHERE id = $1`, [med.id]);
    const first = await stock('F1', '2026-12-31', 4);
    const second = await stock('F2', '2027-06-30', 6);
    const res = await setStatus(first, { status: 'on_hold', reason: 'Supplier quality notice 18/10' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'on_hold',
      statusReason: 'Supplier quality notice 18/10',
      statusChangedBy: { fullName: manager.fullName },
    });
    expect(res.body.statusChangedAt).toBeTruthy();
    // 10 sellable before, 6 after the hold: still above 5, so no alert yet.
    const openLow = async () =>
      (await t.dataSource.getRepository(StockAlert).find({
        where: { medicine: { id: med.id }, type: AlertType.LOW_STOCK },
      })).filter((a) => a.status !== AlertStatus.RESOLVED);
    expect(await openLow()).toEqual([]);

    await t.app.get(PriceBook).setPrice(t.dataSource.manager, manager, med.id, 1000, '2026-10-01');
    const sale = await t.http().post('/api/sales').set(as('cashier')).send({
      requestId: randomUUID(),
      otcLines: [{ medicineId: med.id, quantity: 2 }],
    });
    expect(sale.status).toBe(201);
    expect(sale.body.lines.map((l: { batch: { batchNumber: string } }) => l.batch.batchNumber)).toEqual(['F2']);
    expect((await batchOf(first)).qtySellable).toBe(4);
    expect((await batchOf(second)).qtySellable).toBe(4);
    // 4 sellable ≤ 5: raised in the sale's transaction; the held 4 do not count.
    expect(await openLow()).toEqual([expect.objectContaining({ status: AlertStatus.OPEN })]);
  });

  it('UC11-09 the same status again, anything from REJECTED, no reason, an unknown batch', async () => {
    const id = await stock('S1', '2027-06-30', 3);
    const same = await setStatus(id, { status: 'active', reason: 'Checked' });
    expect(same.status).toBe(422);
    expect(same.body.code).toBe('BATCH_STATUS_UNCHANGED');
    expect((await setStatus(id, { status: 'on_hold', reason: '' })).status).toBe(400);
    expect((await setStatus(id, { status: 'gone', reason: 'x' })).status).toBe(400);
    expect((await setStatus(id, { status: 'rejected', reason: 'Failed inspection' })).status).toBe(200);
    const back = await setStatus(id, { status: 'active', reason: 'Mistake' });
    expect(back.status).toBe(422);
    expect(back.body.code).toBe('BATCH_REJECTED_FINAL');
    expect((await setStatus(randomUUID(), { status: 'on_hold', reason: 'x' })).status).toBe(404);
    expect((await writeOff(randomUUID(), { reason: 'x' })).status).toBe(404);
  });

  it('UC11-10 EXPIRING_SOON becomes EXPIRED on the expiry day, never two unresolved for one batch', async () => {
    const id = await stock('W1', '2026-10-30', 5);
    expect((await expiryAlerts(id)).map((a) => [a.type, a.status])).toEqual([
      [AlertType.EXPIRING_SOON, AlertStatus.OPEN],
    ]);
    clock.set(new Date('2026-10-30T03:00:00Z'));
    const list = await t.http().get('/api/alerts?type=expired').set(as('manager'));
    expect(list.status).toBe(200);
    expect(list.body).toEqual([
      expect.objectContaining({ type: 'expired', batch: expect.objectContaining({ batchNumber: 'W1' }), sellable: 5 }),
    ]);
    expect((await expiryAlerts(id)).map((a) => [a.type, a.status])).toEqual([
      [AlertType.EXPIRING_SOON, AlertStatus.RESOLVED],
      [AlertType.EXPIRED, AlertStatus.OPEN],
    ]);
  });

  it('UC11-11 the manager acknowledges an expiry alert', async () => {
    const id = await stock('K1', '2026-10-25', 5);
    const [alert] = await expiryAlerts(id);
    const res = await t.http().post(`/api/alerts/${alert.id}/acknowledge`).set(as('manager'));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      type: 'expiring_soon',
      status: 'acknowledged',
      batch: { batchNumber: 'K1', expiryDate: '2026-10-25' },
      acknowledgedAt: D.toISOString(),
    });
  });

  it('UC11-12 TC-28: a pharmacist or a cashier can neither read the list nor change a batch', async () => {
    const id = await stock('P1', '2026-10-01', 5);
    for (const user of ['pharmacist', 'cashier'] as const) {
      expect((await report(user)).status).toBe(403);
      expect((await writeOff(id, { reason: 'x' }, user)).status).toBe(403);
      expect((await setStatus(id, { status: 'on_hold', reason: 'x' }, user)).status).toBe(403);
    }
  });

  it('UC11-13 BR05: after write-offs and status changes the ledger balances', async () => {
    const a = await stock('I1', '2026-10-01', 5);
    const b = await stock('I2', '2027-06-30', 8);
    await writeOff(a, { reason: 'Expired' });
    await setStatus(b, { status: 'recalled', reason: 'Recall' });
    await writeOff(b, { reason: 'Recalled' });
    expect(await findLedgerMismatches(t.dataSource)).toEqual([]);
  });
});
