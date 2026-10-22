import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  Batch,
  MovementType,
  StockMovement,
  StockTakeStatus,
} from '../src/entities/index.js';
import { FixedClock } from '../src/stock/clock.js';
import { findLedgerMismatches } from '../src/stock/ledger-invariant.js';
import {
  as,
  createTestApp,
  resetDatabase,
  type TestApp,
} from './e2e/helpers.js';

type User = 'manager' | 'pharmacist' | 'cashier';

/**
 * UC09 Conduct a stock take (FR-29 to FR-32, BR08, decision 15). One test
 * per row of the scenario table in the UC09 specification.
 */
describe('UC09 stock takes (e2e)', () => {
  const clock = new FixedClock(new Date('2026-10-12T03:00:00Z'));
  let t: TestApp;
  let supplierId: string;
  let paraId: string;
  let vitcId: string;
  let receiptNo = 0;

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
          .send({
            code,
            name,
            categoryId,
            baseUnitId,
            currentPrice: 1000,
            classification: 'otc',
            classificationSource: 'Label: OTC',
            classificationDate: '2026-10-01',
          })
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

  /** Receives `quantity` of a new batch and returns the batch id. */
  const receive = async (
    medicineId: string,
    batchNumber: string,
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
        lines: [{ medicineId, batchNumber, expiryDate, quantity, unitCost: 800 }],
      });
    expect(res.status).toBe(201);
    return res.body.lines[0].batch.id as string;
  };

  const sell = async (medicineId: string, quantity: number) => {
    const res = await t
      .http()
      .post('/api/sales')
      .set(as('cashier'))
      .send({ requestId: randomUUID(), otcLines: [{ medicineId, quantity }] });
    expect(res.status).toBe(201);
  };

  const api = (user: User) => ({
    open: (body: object) =>
      t.http().post('/api/stock-takes').set(as(user)).send(body),
    get: (id: string) => t.http().get(`/api/stock-takes/${id}`).set(as(user)),
    list: () => t.http().get('/api/stock-takes').set(as(user)),
    count: (id: string, lineId: string, body: object) =>
      t
        .http()
        .put(`/api/stock-takes/${id}/lines/${lineId}`)
        .set(as(user))
        .send(body),
    addLine: (id: string, batchId: string) =>
      t
        .http()
        .post(`/api/stock-takes/${id}/lines`)
        .set(as(user))
        .send({ batchId }),
    submit: (id: string) =>
      t.http().post(`/api/stock-takes/${id}/submit`).set(as(user)),
    approve: (id: string) =>
      t.http().post(`/api/stock-takes/${id}/approve`).set(as(user)),
    return: (id: string, comment: string) =>
      t
        .http()
        .post(`/api/stock-takes/${id}/return`)
        .set(as(user))
        .send({ comment }),
    cancel: (id: string) =>
      t.http().post(`/api/stock-takes/${id}/cancel`).set(as(user)),
  });
  const manager = api('manager');
  const pharmacist = api('pharmacist');
  const cashier = api('cashier');

  const qty = async (batchId: string) =>
    (await t.dataSource.getRepository(Batch).findOneByOrFail({ id: batchId }))
      .qtySellable;

  const adjustments = () =>
    t.dataSource
      .getRepository(StockMovement)
      .find({ where: { type: MovementType.ADJUSTMENT }, relations: { batch: true } });

  /** Opens a stock take for `medicineIds` and returns its body. */
  const open = async (medicineIds: string[]) => {
    const res = await manager.open({ medicineIds });
    expect(res.status).toBe(201);
    return res.body;
  };

  const lineOf = (take: { lines: Array<{ id: string; batch: { id: string } }> }, batchId: string) =>
    take.lines.find((l) => l.batch.id === batchId)!.id;

  it('UC09-01 opening for two medicines makes one line per batch with stock, numbered ST-…-0001, system quantity hidden', async () => {
    const p1 = await receive(paraId, 'P1', 10);
    const p2 = await receive(paraId, 'P2', 5);
    const v1 = await receive(vitcId, 'V1', 7);
    const empty = await receive(vitcId, 'V0', 2);
    await sell(vitcId, 7); // FEFO empties one Vitamin C batch

    const take = await open([paraId, vitcId]);
    expect(take.status).toBe(StockTakeStatus.COUNTING);
    expect(take.referenceNumber).toBe('ST-20261012-0001');
    const batchIds = take.lines.map((l: { batch: { id: string } }) => l.batch.id);
    expect(batchIds).toHaveLength(3);
    expect(batchIds).toEqual(expect.arrayContaining([p1, p2]));
    expect(batchIds.filter((id: string) => id === v1 || id === empty)).toHaveLength(1);
    for (const line of take.lines) {
      expect(line.systemQuantity).toBeNull();
      expect(line.difference).toBeNull();
    }

    const second = await open([paraId]);
    expect(second.referenceNumber).toBe('ST-20261012-0002');
  });

  it('UC09-02 TC-19: system 10, counted 8 with a reason, approved by another user, posts ADJUSTMENT −2', async () => {
    const batch = await receive(paraId, 'P1', 10);
    const take = await open([paraId]);
    const line = lineOf(take, batch);

    expect((await pharmacist.count(take.id, line, { countedQuantity: 8, reason: 'Two boxes damaged and thrown away' })).status).toBe(200);
    const submitted = await pharmacist.submit(take.id);
    expect(submitted.status).toBe(201);
    expect(submitted.body.status).toBe(StockTakeStatus.PENDING_APPROVAL);
    expect(submitted.body.countedBy.fullName).toBeTruthy();
    expect(submitted.body.lines[0]).toMatchObject({
      systemQuantity: 10,
      countedQuantity: 8,
      difference: -2,
      differenceValue: '-1600.00',
    });

    const approved = await manager.approve(take.id);
    expect(approved.status).toBe(201);
    expect(approved.body.status).toBe(StockTakeStatus.APPROVED);
    // Times come from the business clock, not the machine.
    expect(approved.body.approvedAt).toBe(clock.now().toISOString());
    expect(approved.body.submittedAt).toBe(clock.now().toISOString());
    expect(approved.body.adjustments).toEqual([
      expect.objectContaining({ lineId: line, batchNumber: 'P1', deltaSellable: -2 }),
    ]);
    expect(await qty(batch)).toBe(8);
    const [movement] = await adjustments();
    expect(movement).toMatchObject({
      deltaSellable: -2,
      reason: 'Two boxes damaged and thrown away',
      sourceDocumentType: 'stock_take_line',
      sourceDocumentId: line,
    });
  });

  it('UC09-03 TC-39: counted = system on every line is approved with no movement', async () => {
    const p1 = await receive(paraId, 'P1', 10);
    const v1 = await receive(vitcId, 'V1', 4);
    const take = await open([paraId, vitcId]);
    await pharmacist.count(take.id, lineOf(take, p1), { countedQuantity: 10 });
    await pharmacist.count(take.id, lineOf(take, v1), { countedQuantity: 4 });
    expect((await pharmacist.submit(take.id)).status).toBe(201);

    const approved = await manager.approve(take.id);
    expect(approved.status).toBe(201);
    expect(approved.body.status).toBe(StockTakeStatus.APPROVED);
    expect(approved.body.adjustments).toEqual([]);
    expect(await adjustments()).toHaveLength(0);
    expect(await qty(p1)).toBe(10);
  });

  it('UC09-04 decision 15: a sale between opening and counting is not a difference', async () => {
    const batch = await receive(paraId, 'P1', 10);
    const take = await open([paraId]);
    await sell(paraId, 3);

    await pharmacist.count(take.id, lineOf(take, batch), { countedQuantity: 7 });
    const submitted = await pharmacist.submit(take.id);
    expect(submitted.status).toBe(201);
    expect(submitted.body.lines[0]).toMatchObject({ systemQuantity: 7, difference: 0 });
    await manager.approve(take.id);
    expect(await adjustments()).toHaveLength(0);
    expect(await qty(batch)).toBe(7);
  });

  it('UC09-05 decision 15: a sale between counting and approval does not change the adjustment', async () => {
    const batch = await receive(paraId, 'P1', 10);
    const take = await open([paraId]);
    await pharmacist.count(take.id, lineOf(take, batch), { countedQuantity: 8, reason: 'Missing' });
    await pharmacist.submit(take.id);
    await sell(paraId, 3);

    expect((await manager.approve(take.id)).status).toBe(201);
    const [movement] = await adjustments();
    expect(movement.deltaSellable).toBe(-2);
    expect(await qty(batch)).toBe(5);
  });

  it('UC09-06 TC-20: a difference without a reason cannot be submitted; the line is named', async () => {
    const batch = await receive(paraId, 'P1', 10);
    const take = await open([paraId]);
    await pharmacist.count(take.id, lineOf(take, batch), { countedQuantity: 8, reason: '   ' });

    const res = await pharmacist.submit(take.id);
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([
      expect.objectContaining({ field: 'lines.0.reason' }),
    ]);
    expect(res.body.errors[0].message).toContain('P1');
    expect((await manager.get(take.id)).body.status).toBe(StockTakeStatus.COUNTING);
  });

  it('UC09-07 a line not counted cannot be submitted', async () => {
    const p1 = await receive(paraId, 'P1', 10);
    await receive(paraId, 'P2', 5, '2027-12-31');
    const take = await open([paraId]);
    await pharmacist.count(take.id, lineOf(take, p1), { countedQuantity: 10 });

    const res = await pharmacist.submit(take.id);
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e: { field: string }) => e.field)).toEqual([
      'lines.1.countedQuantity',
    ]);
  });

  it('UC09-08 a count of -1, 2.5 or nothing is a field error and is not saved', async () => {
    const batch = await receive(paraId, 'P1', 10);
    const take = await open([paraId]);
    const line = lineOf(take, batch);
    for (const body of [{ countedQuantity: -1 }, { countedQuantity: 2.5 }, {}]) {
      const res = await pharmacist.count(take.id, line, body);
      expect(res.status).toBe(400);
      expect([...new Set(res.body.errors.map((e: { field: string }) => e.field))]).toEqual(['countedQuantity']);
    }
    expect((await manager.get(take.id)).body.lines[0].countedQuantity).toBeNull();
  });

  it('UC09-09 TC-20, TC-28: a cashier can neither list, open, count nor submit', async () => {
    const batch = await receive(paraId, 'P1', 10);
    const take = await open([paraId]);
    expect((await cashier.list()).status).toBe(403);
    expect((await cashier.get(take.id)).status).toBe(403);
    expect((await cashier.open({ medicineIds: [paraId] })).status).toBe(403);
    expect((await cashier.count(take.id, lineOf(take, batch), { countedQuantity: 10 })).status).toBe(403);
    expect((await cashier.submit(take.id)).status).toBe(403);
  });

  it('UC09-10 a pharmacist can count but not open, approve, return or cancel', async () => {
    const batch = await receive(paraId, 'P1', 10);
    const take = await open([paraId]);
    expect((await pharmacist.open({ medicineIds: [paraId] })).status).toBe(403);
    await pharmacist.count(take.id, lineOf(take, batch), { countedQuantity: 10 });
    await manager.submit(take.id);
    expect((await pharmacist.approve(take.id)).status).toBe(403);
    expect((await pharmacist.return(take.id, 'Recount')).status).toBe(403);
    expect((await pharmacist.cancel(take.id)).status).toBe(403);
  });

  it('UC09-11 TC-51 BR08: the user who submitted cannot approve; nothing is posted', async () => {
    const batch = await receive(paraId, 'P1', 10);
    const take = await open([paraId]);
    await manager.count(take.id, lineOf(take, batch), { countedQuantity: 9, reason: 'Broken' });
    await manager.submit(take.id);

    const res = await manager.approve(take.id);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('SAME_COUNTER');
    expect(await adjustments()).toHaveLength(0);
    expect(await qty(batch)).toBe(10);
    expect((await manager.get(take.id)).body.status).toBe(StockTakeStatus.PENDING_APPROVAL);
  });

  it('UC09-11b TC-20 BR08: a manager who counted a line cannot approve, even if someone else submitted', async () => {
    const p1 = await receive(paraId, 'P1', 10);
    const p2 = await receive(paraId, 'P2', 5, '2027-12-31');
    const take = await open([paraId]);
    await manager.count(take.id, lineOf(take, p1), { countedQuantity: 9, reason: 'Broken' });
    await pharmacist.count(take.id, lineOf(take, p2), { countedQuantity: 5 });
    expect((await pharmacist.submit(take.id)).status).toBe(201);

    const view = (await manager.get(take.id)).body;
    expect(view.lines.map((l: { countedBy: { fullName: string } }) => l.countedBy.fullName).sort()).toHaveLength(2);
    const res = await manager.approve(take.id);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('SAME_COUNTER');
    expect(await adjustments()).toHaveLength(0);
  });

  it('UC09-12 approving while counting, or twice, is a 409 and posts once', async () => {
    const batch = await receive(paraId, 'P1', 10);
    const take = await open([paraId]);
    await pharmacist.count(take.id, lineOf(take, batch), { countedQuantity: 9, reason: 'Broken' });
    expect((await manager.approve(take.id)).status).toBe(409);

    await pharmacist.submit(take.id);
    const [first, second] = await Promise.all([
      manager.approve(take.id),
      manager.approve(take.id),
    ]);
    expect([first.status, second.status].sort()).toEqual([201, 409]);
    expect(await adjustments()).toHaveLength(1);
    expect(await qty(batch)).toBe(9);
  });

  it('UC09-13 counting or adding a line after submit is a 409', async () => {
    const p1 = await receive(paraId, 'P1', 10);
    const take = await open([paraId]);
    await pharmacist.count(take.id, lineOf(take, p1), { countedQuantity: 10 });
    await pharmacist.submit(take.id);
    const later = await receive(paraId, 'P2', 5, '2027-12-31');

    expect((await pharmacist.count(take.id, lineOf(take, p1), { countedQuantity: 9 })).status).toBe(409);
    expect((await pharmacist.addLine(take.id, later)).status).toBe(409);
    expect((await manager.get(take.id)).body.lines).toEqual([
      expect.objectContaining({ countedQuantity: 10 }),
    ]);
  });

  it('UC09-14 A6: an adjustment that would go below zero is refused, naming the line; nothing posted', async () => {
    const batch = await receive(paraId, 'P1', 10);
    const take = await open([paraId]);
    await pharmacist.count(take.id, lineOf(take, batch), { countedQuantity: 2, reason: 'Missing' });
    await pharmacist.submit(take.id);
    await sell(paraId, 5);

    const res = await manager.approve(take.id);
    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual([
      expect.objectContaining({ field: 'lines.0.countedQuantity' }),
    ]);
    expect(await adjustments()).toHaveLength(0);
    expect(await qty(batch)).toBe(5);
    expect((await manager.get(take.id)).body.status).toBe(StockTakeStatus.PENDING_APPROVAL);
  });

  it('UC09-15 A5: the manager returns it to counting with a comment; counts are kept', async () => {
    const batch = await receive(paraId, 'P1', 10);
    const take = await open([paraId]);
    await pharmacist.count(take.id, lineOf(take, batch), { countedQuantity: 8, reason: 'Missing' });
    await pharmacist.submit(take.id);

    expect((await manager.return(take.id, '   ')).status).toBe(400);
    const res = await manager.return(take.id, 'Count shelf B again');
    expect(res.status).toBe(201);
    expect(res.body.status).toBe(StockTakeStatus.COUNTING);
    expect(res.body.note).toContain('Count shelf B again');
    expect(res.body.countedBy).toBeNull();
    expect(res.body.lines[0].countedQuantity).toBe(8);
    expect(res.body.lines[0].systemQuantity).toBeNull();
  });

  it('UC09-16 A8: the manager cancels; nothing posted, record kept', async () => {
    const batch = await receive(paraId, 'P1', 10);
    const take = await open([paraId]);
    await pharmacist.count(take.id, lineOf(take, batch), { countedQuantity: 3, reason: 'Missing' });

    const res = await manager.cancel(take.id);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe(StockTakeStatus.CANCELLED);
    expect((await manager.cancel(take.id)).status).toBe(409);
    expect(await adjustments()).toHaveLength(0);
    const list = await manager.list();
    expect(list.body).toEqual([
      expect.objectContaining({ id: take.id, status: 'cancelled', lineCount: 1, countedCount: 1 }),
    ]);
  });

  it('UC09-17 A3: a batch the book holds at 0 is added and counted 3; approval posts +3', async () => {
    const p1 = await receive(paraId, 'P1', 10);
    const p0 = await receive(paraId, 'P0', 2, '2026-12-31'); // expires first
    await sell(paraId, 2); // FEFO empties P0
    const v1 = await receive(vitcId, 'V1', 4);
    const take = await open([paraId]);
    expect(take.lines).toHaveLength(1);

    expect((await pharmacist.addLine(take.id, v1)).status).toBe(400);
    const added = await pharmacist.addLine(take.id, p0);
    expect(added.status).toBe(201);
    expect(added.body.lines).toHaveLength(2);
    expect((await pharmacist.addLine(take.id, p0)).status).toBe(409);

    await pharmacist.count(take.id, lineOf(added.body, p0), { countedQuantity: 3, reason: 'Found on the back shelf' });
    await pharmacist.count(take.id, lineOf(added.body, p1), { countedQuantity: 10 });
    await pharmacist.submit(take.id);
    expect((await manager.approve(take.id)).status).toBe(201);
    expect(await qty(p0)).toBe(3);
    expect(await qty(p1)).toBe(10);
  });

  it('UC09-18 BR05: after approvals the cached quantities equal the sum of the movements', async () => {
    const p1 = await receive(paraId, 'P1', 10);
    const v1 = await receive(vitcId, 'V1', 6);
    const take = await open([paraId, vitcId]);
    await pharmacist.count(take.id, lineOf(take, p1), { countedQuantity: 12, reason: 'Delivery not booked' });
    await pharmacist.count(take.id, lineOf(take, v1), { countedQuantity: 1, reason: 'Expired boxes removed' });
    await pharmacist.submit(take.id);
    await sell(vitcId, 1);
    expect((await manager.approve(take.id)).status).toBe(201);

    expect(await qty(p1)).toBe(12);
    expect(await qty(v1)).toBe(0);
    expect(await findLedgerMismatches(t.dataSource.manager)).toEqual([]);
  });

  it('opening with an unknown medicine or one with no stock is a field error', async () => {
    const unknown = randomUUID();
    const res = await manager.open({ medicineIds: [paraId, unknown] });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e: { field: string }) => e.field)).toEqual(['medicineIds.1']);
    const none = await manager.open({ medicineIds: [paraId] });
    expect(none.status).toBe(400);
    expect(none.body.errors.map((e: { field: string }) => e.field)).toEqual(['medicineIds']);
  });
});
