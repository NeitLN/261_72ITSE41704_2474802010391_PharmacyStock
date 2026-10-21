import { randomUUID } from 'node:crypto';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import {
  AlertStatus,
  AlertType,
  Batch,
  BatchStatus,
  MovementType,
  SourceDocumentType,
  StockAlert,
} from '../src/entities/index.js';
import { FixedClock } from '../src/stock/clock.js';
import { StockLedger } from '../src/stock/stock-ledger.js';
import { actorFor } from './e2e/fixtures.js';
import {
  as,
  createTestApp,
  resetDatabase,
  type TestApp,
} from './e2e/helpers.js';

type User = 'manager' | 'pharmacist' | 'cashier';
const TODAY = new Date('2026-10-12T03:00:00Z');

/**
 * UC10 Review low-stock alerts (FR-33, FR-34, DEC-08, decision 16). One test
 * per row of the scenario table in the UC10 specification.
 */
describe('UC10 low-stock alerts (e2e)', () => {
  const clock = new FixedClock(TODAY);
  let t: TestApp;
  let categoryId: string;
  let baseUnitId: string;
  let supplierId: string;
  let receiptNo = 0;

  beforeAll(async () => {
    t = await createTestApp({ clock });
  });

  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    clock.set(TODAY);
    await resetDatabase(t.dataSource);
    const ref = await t
      .http()
      .get('/api/medicines/reference-data')
      .set(as('manager'));
    categoryId = ref.body.categories[0].id;
    baseUnitId = ref.body.units[0].id;
    supplierId = (
      await t
        .http()
        .post('/api/suppliers')
        .set(as('manager'))
        .send({ name: 'Phano Pharma', phone: '028 3855 1234' })
    ).body.id;
  });

  afterEach(() => clock.set(TODAY));

  /** An OTC medicine watched at `reorderLevel`. */
  const medicine = async (
    code: string,
    reorderLevel = 10,
    lowStockMonitored = true,
  ): Promise<string> => {
    const res = await t
      .http()
      .post('/api/medicines')
      .set(as('manager'))
      .send({
        code,
        name: `Medicine ${code}`,
        categoryId,
        baseUnitId,
        currentPrice: 1000,
        classification: 'otc',
        classificationSource: 'Label: OTC',
        classificationDate: '2026-10-01',
        reorderLevel,
        lowStockMonitored,
      });
    expect(res.status).toBe(201);
    return res.body.id as string;
  };

  const receive = async (
    medicineId: string,
    quantity: number,
    expiryDate = '2027-06-30',
  ): Promise<string> => {
    receiptNo += 1;
    const res = await t
      .http()
      .post('/api/goods-receipts')
      .set(as('manager'))
      .send({
        supplierId,
        documentNumber: `HD-${receiptNo}`,
        receiptDate: '2026-10-12',
        lines: [
          {
            medicineId,
            batchNumber: `B${receiptNo}`,
            expiryDate,
            quantity,
            unitCost: 800,
          },
        ],
      });
    expect(res.status).toBe(201);
    return res.body.lines[0].batch.id as string;
  };

  const sell = (medicineId: string, quantity: number) =>
    t
      .http()
      .post('/api/sales')
      .set(as('cashier'))
      .send({ requestId: randomUUID(), otcLines: [{ medicineId, quantity }] });

  const list = (query = '', user: User = 'manager') =>
    t.http().get(`/api/alerts${query}`).set(as(user));

  const acknowledge = (id: string, user: User = 'manager') =>
    t.http().post(`/api/alerts/${id}/acknowledge`).set(as(user));

  const patch = (id: string, body: object) =>
    t.http().patch(`/api/medicines/${id}`).set(as('manager')).send(body);

  const alertsOf = (medicineId: string) =>
    t.dataSource.getRepository(StockAlert).find({
      where: { medicine: { id: medicineId } },
      order: { raisedAt: 'ASC' },
    });

  const unresolved = async (medicineId: string) =>
    (await alertsOf(medicineId)).filter(
      (a) => a.status !== AlertStatus.RESOLVED,
    );

  it('UC10-01..04 TC-21: reorder level 10 — sellable 11 none, 10 LOW, 9 the same LOW, 0 OUT_OF_STOCK', async () => {
    const id = await medicine('TC21');
    await receive(id, 11);
    expect(await unresolved(id)).toEqual([]);

    expect((await sell(id, 1)).status).toBe(201);
    const [low] = await unresolved(id);
    expect(low).toMatchObject({ type: AlertType.LOW_STOCK, status: AlertStatus.OPEN });
    expect(low.message).toContain('10 sellable, reorder level 10');

    await sell(id, 1);
    expect((await unresolved(id)).map((a) => a.id)).toEqual([low.id]);

    await sell(id, 9);
    const all = await alertsOf(id);
    expect(all.map((a) => [a.type, a.status])).toEqual([
      [AlertType.LOW_STOCK, AlertStatus.RESOLVED],
      [AlertType.OUT_OF_STOCK, AlertStatus.OPEN],
    ]);
    expect(all[0].resolvedAt).toBeTruthy();

    const res = await list();
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        type: 'out_of_stock',
        sellable: 0,
        medicine: expect.objectContaining({ code: 'TC21', reorderLevel: 10 }),
      }),
    ]);
  });

  it('UC10-05 a receipt above the level resolves the alert with the time', async () => {
    const id = await medicine('REC');
    await receive(id, 3);
    expect((await unresolved(id))[0].type).toBe(AlertType.LOW_STOCK);
    await receive(id, 12);
    expect(await unresolved(id)).toEqual([]);
    const [resolved] = await alertsOf(id);
    expect(resolved.status).toBe(AlertStatus.RESOLVED);
    expect(resolved.resolvedAt).toBeTruthy();
  });

  it('UC10-06 TC-63: no alert while monitoring is off; switching it off resolves an open one', async () => {
    const off = await medicine('OFF', 10, false);
    await receive(off, 5);
    await sell(off, 5);
    expect(await alertsOf(off)).toEqual([]);

    const on = await medicine('ON');
    await receive(on, 2);
    expect(await unresolved(on)).toHaveLength(1);
    expect((await patch(on, { lowStockMonitored: false })).status).toBe(200);
    expect(await unresolved(on)).toEqual([]);
    expect((await patch(on, { lowStockMonitored: true })).status).toBe(200);
    expect((await unresolved(on))[0].type).toBe(AlertType.LOW_STOCK);
  });

  it('UC10-07 TC-63: expired, quarantined and on-hold units do not count as sellable', async () => {
    const id = await medicine('MIX');
    await receive(id, 12);
    const expired = await receive(id, 5);
    const held = await receive(id, 5);
    const quarantined = await receive(id, 1);
    const batches = t.dataSource.getRepository(Batch);
    await batches.update({ id: expired }, { expiryDate: '2026-10-01' });
    await batches.update({ id: held }, { status: BatchStatus.ON_HOLD });
    const actor = await actorFor(t.dataSource, 'manager');
    await t.app.get(StockLedger).run(async (tx) => {
      await tx.lockMedicines([id]);
      await tx.lockBatches([quarantined]);
      await tx.post(actor, {
        batchId: quarantined,
        type: MovementType.RETURN,
        deltaQuarantine: 5,
        sourceDocumentType: SourceDocumentType.RETURN_LINE,
        sourceDocumentId: randomUUID(),
      });
    });
    // 12 + 1 sellable, the rest is expired, held or quarantined: above 10.
    expect(await unresolved(id)).toEqual([]);

    await sell(id, 3); // 10 left that can really be sold
    expect((await unresolved(id))[0].type).toBe(AlertType.LOW_STOCK);
  });

  it('UC10-08 the business date passing an expiry raises the alert on the next request, without a movement', async () => {
    const id = await medicine('EXP');
    await receive(id, 15, '2026-10-20');
    expect((await list()).body).toEqual([]);

    clock.set(new Date('2026-10-20T03:00:00Z')); // expiry day: not sellable (DEC-01)
    const res = await list();
    expect(res.body).toEqual([
      expect.objectContaining({ type: 'out_of_stock', sellable: 0 }),
    ]);
  });

  it('UC10-09 the manager acknowledges; the alert stays listed with who and when', async () => {
    const id = await medicine('ACK');
    await receive(id, 8);
    const [alert] = (await list()).body;

    const res = await acknowledge(alert.id);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: 'acknowledged',
      acknowledgedBy: expect.objectContaining({ fullName: expect.any(String) }),
    });
    expect(res.body.acknowledgedAt).toBeTruthy();

    await sell(id, 2); // still low: the same alert, still acknowledged
    const [again] = (await list()).body;
    expect(again).toMatchObject({ id: alert.id, status: 'acknowledged', sellable: 6 });
    expect((await acknowledge(alert.id)).status).toBe(201);
  });

  it('UC10-10 acknowledging a resolved alert is 409; an unknown one 404', async () => {
    const id = await medicine('RES');
    await receive(id, 2);
    const [alert] = await unresolved(id);
    await receive(id, 20);

    const res = await acknowledge(alert.id);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ALERT_RESOLVED');
    expect((await acknowledge(randomUUID())).status).toBe(404);
  });

  it('UC10-11 two sales taking the last units at once raise exactly one alert', async () => {
    const id = await medicine('RACE');
    await receive(id, 2);
    await t.dataSource.getRepository(StockAlert).clear();

    const results = await Promise.all([sell(id, 1), sell(id, 1)]);
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    const open = await unresolved(id);
    expect(open).toHaveLength(1);
    expect(open[0].type).toBe(AlertType.OUT_OF_STOCK);
  });

  it('UC10-12 TC-28: a pharmacist or a cashier can neither list nor acknowledge', async () => {
    const id = await medicine('PERM');
    await receive(id, 2);
    const [alert] = await unresolved(id);
    for (const user of ['pharmacist', 'cashier'] as const) {
      expect((await list('', user)).status).toBe(403);
      expect((await acknowledge(alert.id, user)).status).toBe(403);
    }
  });

  it('UC10-13 out of stock first, then the lowest stock; filters by type and status', async () => {
    const low5 = await medicine('LOW5');
    const out = await medicine('OUT');
    const low2 = await medicine('LOW2');
    await receive(low5, 5);
    await receive(low2, 2);
    await receive(out, 1);
    await sell(out, 1);

    const res = await list();
    expect(res.body.map((a: { medicine: { code: string } }) => a.medicine.code)).toEqual([
      'OUT',
      'LOW2',
      'LOW5',
    ]);
    const lowOnly = await list('?type=low_stock');
    expect(lowOnly.body).toHaveLength(2);
    const resolved = await list('?status=resolved');
    expect(resolved.body.map((a: { type: string }) => a.type)).toEqual(['low_stock']);
    expect((await list('?status=open')).status).toBe(400);
    expect((await list('?type=expired')).status).toBe(400);
  });

  it('UC10-14 raising the reorder level above the stock raises LOW_STOCK in the same save', async () => {
    const id = await medicine('LVL');
    await receive(id, 15);
    expect(await unresolved(id)).toEqual([]);
    expect((await patch(id, { reorderLevel: 20 })).status).toBe(200);
    const [alert] = await unresolved(id);
    expect(alert.type).toBe(AlertType.LOW_STOCK);
    expect(alert.message).toContain('reorder level 20');
  });

  it('UC10-15 a stock-take approval that drops stock to the level raises LOW_STOCK', async () => {
    const id = await medicine('ST');
    const batch = await receive(id, 14);
    const take = (
      await t.http().post('/api/stock-takes').set(as('manager')).send({ medicineIds: [id] })
    ).body;
    const lineId = take.lines.find((l: { batch: { id: string } }) => l.batch.id === batch).id;
    await t
      .http()
      .put(`/api/stock-takes/${take.id}/lines/${lineId}`)
      .set(as('pharmacist'))
      .send({ countedQuantity: 10, reason: 'Four boxes missing' });
    await t.http().post(`/api/stock-takes/${take.id}/submit`).set(as('pharmacist'));
    expect(await unresolved(id)).toEqual([]);

    const approved = await t.http().post(`/api/stock-takes/${take.id}/approve`).set(as('manager'));
    expect(approved.status).toBe(201);
    expect((await unresolved(id))[0].type).toBe(AlertType.LOW_STOCK);
  });

  it('deactivating a monitored medicine resolves its alert', async () => {
    const id = await medicine('DEACT');
    await receive(id, 2);
    expect(await unresolved(id)).toHaveLength(1);
    expect((await t.http().post(`/api/medicines/${id}/deactivate`).set(as('manager'))).status).toBe(200);
    expect(await unresolved(id)).toEqual([]);
  });
});
