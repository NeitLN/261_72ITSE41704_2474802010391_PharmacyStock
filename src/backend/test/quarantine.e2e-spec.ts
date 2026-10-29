import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Actor } from '../src/auth/actor.js';
import { PriceBook } from '../src/catalogue/price-book.js';
import {
  Batch,
  DestructionRecord,
  Medicine,
  MedicineClassification,
  MovementType,
  ReturnAssessmentStatus,
  ReturnLine,
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

type User = 'manager' | 'pharmacist' | 'cashier';
/** Business date 2026-10-20, 10:00 in Asia/Ho_Chi_Minh. */
const D = new Date('2026-10-20T03:00:00Z');

/**
 * UC11 assessment of quarantined returns and destruction records (FR-46,
 * FR-47, BR11, DEC-04). One test per row S14–S22 of the UC11 scenario table.
 */
describe('UC11 quarantine assessment and destruction (e2e)', () => {
  const clock = new FixedClock(D);
  let t: TestApp;
  let ledger: StockLedger;
  let manager: Actor;
  let otc: Medicine;

  beforeAll(async () => {
    t = await createTestApp({ clock });
    ledger = t.app.get(StockLedger);
  });

  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    clock.set(D);
    await resetDatabase(t.dataSource);
    manager = await actorFor(t.dataSource, 'manager');
    otc = await createMedicine(t.dataSource, { reorderLevel: 0 });
    await t.app
      .get(PriceBook)
      .setPrice(t.dataSource.manager, manager, otc.id, 2000, '2026-10-01');
  });

  const receive = (batchNumber: string, quantity: number, expiryDate = '2027-06-30') =>
    ledger.run(async (tx) => {
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
        sourceDocumentId: randomUUID(),
      });
      return batch.id;
    });

  /** Sells `sold`, returns `returned` of it, and gives the return line id. */
  const returned = async (sold: number, returnedQty: number): Promise<string> => {
    const sale = await t
      .http()
      .post('/api/sales')
      .set(as('cashier'))
      .send({ requestId: randomUUID(), otcLines: [{ medicineId: otc.id, quantity: sold }] });
    expect(sale.status, JSON.stringify(sale.body)).toBe(201);
    const found = await t
      .http()
      .get(`/api/returns/sales/${sale.body.receiptNumber}`)
      .set(as('cashier'));
    const ret = await t
      .http()
      .post('/api/returns')
      .set(as('cashier'))
      .send({
        requestId: randomUUID(),
        saleId: sale.body.id,
        reason: 'Customer brought it back',
        lines: [{ saleLineId: found.body.lines[0].saleLineId, quantity: returnedQty }],
      });
    expect(ret.status, JSON.stringify(ret.body)).toBe(201);
    // The slip names its lines by sale line; the assessment needs the return line.
    const line = await t.dataSource.getRepository(ReturnLine).findOneByOrFail({
      saleReturn: { id: ret.body.id },
    });
    return line.id;
  };

  const list = (user: User = 'manager') => t.http().get('/api/quarantine').set(as(user));
  const assess = (lineId: string, body: object, user: User = 'manager') =>
    t.http().post(`/api/quarantine/${lineId}/assess`).set(as(user)).send(body);
  const release = (note = 'Sealed box, kept at room temperature') => ({
    outcome: 'release',
    packagingIntact: true,
    storageCredible: true,
    note,
  });
  const reject = (note = 'Blister opened') => ({
    outcome: 'reject',
    packagingIntact: false,
    storageCredible: false,
    note,
  });
  const destroy = (batchId: string, body: object, user: User = 'manager') =>
    t.http().post(`/api/batches/${batchId}/destructions`).set(as(user)).send(body);
  const batch = (id: string) => t.dataSource.getRepository(Batch).findOneByOrFail({ id });
  const lineOf = (id: string) =>
    t.dataSource.getRepository(ReturnLine).findOneOrFail({
      where: { id },
      relations: { assessedBy: true },
    });
  const movements = (batchId: string, type: MovementType) =>
    t.dataSource.getRepository(StockMovement).find({
      where: { batch: { id: batchId }, type },
    });

  it('UC11-14 TC-61: releasing 2 of a returned OTC item puts them back on sale and records who decided', async () => {
    const b = await receive('Q1', 10);
    const lineId = await returned(5, 2);
    expect(await batch(b)).toMatchObject({ qtySellable: 5, qtyQuarantine: 2 });

    const listed = await list();
    expect(listed.status).toBe(200);
    expect(listed.body).toEqual([
      expect.objectContaining({
        returnLineId: lineId,
        quantity: 2,
        batch: expect.objectContaining({ id: b, batchNumber: 'Q1' }),
        releaseBlockedBy: null,
      }),
    ]);

    const res = await assess(lineId, release());
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body).toMatchObject({
      assessmentStatus: 'released',
      assessmentNote: 'Sealed box, kept at room temperature',
      movement: { type: MovementType.RELEASE, deltaSellable: 2, deltaQuarantine: -2 },
    });
    expect(await batch(b)).toMatchObject({ qtySellable: 7, qtyQuarantine: 0 });
    const line = await lineOf(lineId);
    expect(line.assessmentStatus).toBe(ReturnAssessmentStatus.RELEASED);
    expect(line.assessedBy?.id).toBe(manager.id);
    expect(line.assessedAt).toEqual(D);
    expect((await list()).body).toEqual([]);
  });

  it('UC11-15 TC-61: rejecting 1 sends it to pending destruction, not back on sale', async () => {
    const b = await receive('Q1', 10);
    const lineId = await returned(5, 1);

    const res = await assess(lineId, reject());
    expect(res.status).toBe(200);
    expect(res.body.movement).toMatchObject({
      type: MovementType.REJECT,
      deltaQuarantine: -1,
      deltaPendingDestruction: 1,
    });
    expect(await batch(b)).toMatchObject({ qtySellable: 5, qtyQuarantine: 0, qtyPendingDestruction: 1 });
    expect((await lineOf(lineId)).assessmentStatus).toBe(ReturnAssessmentStatus.REJECTED);
  });

  it('UC11-16 BR11: a controlled medicine or an expired batch cannot be released, nor goods with doubtful packaging', async () => {
    const b = await receive('Q1', 10, '2026-10-25');
    const lineId = await returned(5, 2);

    const unsure = await assess(lineId, { ...release(), packagingIntact: false });
    expect(unsure.status).toBe(400);
    expect(unsure.body.errors[0].field).toBe('packagingIntact');
    const noStorage = await assess(lineId, { ...release(), storageCredible: false });
    expect(noStorage.body.errors[0].field).toBe('storageCredible');

    // The batch expires on 25/10; on 26/10 it can only be rejected.
    clock.set(new Date('2026-10-26T03:00:00Z'));
    expect((await list()).body[0].releaseBlockedBy).toBe('expired');
    const expired = await assess(lineId, release());
    expect(expired.status).toBe(422);
    expect(expired.body.code).toBe('CANNOT_RELEASE');

    clock.set(D);
    await t.dataSource
      .getRepository(Medicine)
      .update(otc.id, { classification: MedicineClassification.CONTROLLED });
    expect((await list()).body[0].releaseBlockedBy).toBe('controlled');
    const controlled = await assess(lineId, release());
    expect(controlled.status).toBe(422);
    expect(controlled.body.code).toBe('CANNOT_RELEASE');

    expect(await batch(b)).toMatchObject({ qtySellable: 5, qtyQuarantine: 2 });
    expect(await movements(b, MovementType.RELEASE)).toHaveLength(0);
    expect((await lineOf(lineId)).assessmentStatus).toBe(ReturnAssessmentStatus.PENDING_ASSESSMENT);
  });

  it('UC11-17 a line is assessed once; a note is required; an unknown line is 404', async () => {
    await receive('Q1', 10);
    const lineId = await returned(5, 2);

    const noNote = await assess(lineId, { ...reject(), note: '' });
    expect(noNote.status).toBe(400);
    expect(noNote.body.errors[0].field).toBe('note');

    expect((await assess(lineId, reject())).status).toBe(200);
    const twice = await assess(lineId, release());
    expect(twice.status).toBe(409);
    expect(twice.body.code).toBe('ALREADY_ASSESSED');

    expect((await assess(randomUUID(), reject())).status).toBe(404);
  });

  it('UC11-18 TC-61: destroying 5 of 5 pending posts DESTROY and keeps its record', async () => {
    const b = await receive('Q1', 10, '2026-10-25');
    const wrote = await t
      .http()
      .post(`/api/batches/${b}/write-off`)
      .set(as('manager'))
      .send({ reason: 'Recalled by the supplier' });
    expect(wrote.status).toBe(422); // active and unexpired: written off only once recalled
    await t
      .http()
      .post(`/api/batches/${b}/status`)
      .set(as('manager'))
      .send({ status: 'recalled', reason: 'Recall letter' });
    expect(
      (await t.http().post(`/api/batches/${b}/write-off`).set(as('manager')).send({ reason: 'Recalled' })).status,
    ).toBe(200);
    expect(await batch(b)).toMatchObject({ qtySellable: 0, qtyPendingDestruction: 10 });

    const pending = await t.http().get('/api/batches/pending-destruction').set(as('manager'));
    expect(pending.body.map((x: { id: string }) => x.id)).toEqual([b]);

    const res = await destroy(b, {
      quantity: 10,
      destroyedOn: '2026-10-20',
      method: 'licensed_contractor',
      witness: 'Nguyen Van An',
      note: 'Certificate HD-778',
    });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body).toMatchObject({
      quantity: 10,
      destroyedOn: '2026-10-20',
      method: 'licensed_contractor',
      witness: 'Nguyen Van An',
      recordedBy: { id: manager.id },
      movement: { deltaPendingDestruction: -10 },
    });
    expect(await batch(b)).toMatchObject({ qtyPendingDestruction: 0 });
    const [destroyed] = await movements(b, MovementType.DESTROY);
    expect(destroyed.reason).toBe(
      'Destroyed on 2026-10-20, destroyed by a licensed contractor; witness Nguyen Van An',
    );
    expect(await t.dataSource.getRepository(DestructionRecord).count()).toBe(1);
    expect((await t.http().get('/api/batches/pending-destruction').set(as('manager'))).body).toEqual([]);
    const records = await t.http().get(`/api/batches/${b}/destructions`).set(as('manager'));
    expect(records.body).toHaveLength(1);
  });

  it('UC11-19 destruction: more than pending, a future date, no witness, "other" without a note', async () => {
    const b = await receive('Q1', 10);
    const lineId = await returned(5, 2);
    await assess(lineId, reject());
    const body = { quantity: 2, destroyedOn: '2026-10-20', method: 'supplier_return', witness: 'Tran Thi B' };

    const tooMany = await destroy(b, { ...body, quantity: 3 });
    expect(tooMany.status).toBe(422);
    expect(tooMany.body.code).toBe('INSUFFICIENT_STOCK'); // BR03
    const future = await destroy(b, { ...body, destroyedOn: '2026-10-21' });
    expect(future.status).toBe(400);
    expect(future.body.errors[0].field).toBe('destroyedOn');
    const noWitness = await destroy(b, { ...body, witness: '' });
    expect(noWitness.body.errors[0].field).toBe('witness');
    const other = await destroy(b, { ...body, method: 'other' });
    expect(other.status).toBe(400);
    expect(other.body.errors[0].field).toBe('methodNote');

    expect(await batch(b)).toMatchObject({ qtyPendingDestruction: 2 });
    expect(await t.dataSource.getRepository(DestructionRecord).count()).toBe(0);
  });

  it('UC11-20 two managers assessing the same line at once: one succeeds, one gets 409, one movement', async () => {
    const b = await receive('Q1', 10);
    const lineId = await returned(5, 2);

    const results = await Promise.all([assess(lineId, release()), assess(lineId, reject())]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const moved = [
      ...(await movements(b, MovementType.RELEASE)),
      ...(await movements(b, MovementType.REJECT)),
    ];
    expect(moved).toHaveLength(1);
    expect(await batch(b)).toMatchObject({ qtyQuarantine: 0 });
  });

  it('UC11-21 TC-53: a pharmacist or a cashier can neither list, assess nor record destruction', async () => {
    const b = await receive('Q1', 10);
    const lineId = await returned(5, 2);
    for (const user of ['pharmacist', 'cashier'] as const) {
      expect((await list(user)).status).toBe(403);
      expect((await assess(lineId, reject(), user)).status).toBe(403);
      expect((await t.http().get('/api/batches/pending-destruction').set(as(user))).status).toBe(403);
      expect(
        (await destroy(b, { quantity: 1, destroyedOn: '2026-10-20', method: 'supplier_return', witness: 'X Y' }, user)).status,
      ).toBe(403);
    }
  });

  it('UC11-22 BR05: after release, reject and destruction the cached quantities equal the movements', async () => {
    const b = await receive('Q1', 10);
    const first = await returned(5, 2);
    const second = await returned(2, 1);
    await assess(first, release());
    await assess(second, reject());
    await destroy(b, { quantity: 1, destroyedOn: '2026-10-20', method: 'supplier_return', witness: 'Tran Thi B' });

    expect(await batch(b)).toMatchObject({ qtySellable: 5, qtyQuarantine: 0, qtyPendingDestruction: 0 });
    expect(await findLedgerMismatches(t.dataSource.manager)).toEqual([]);
  });
});
