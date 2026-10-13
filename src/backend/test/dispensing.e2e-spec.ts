import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Actor } from '../src/auth/actor.js';
import {
  Batch,
  BatchStatus,
  Customer,
  DispenseLine,
  type Medicine,
  MovementType,
  Prescriber,
  PrescriptionItem,
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

/** UC06 dispense against a prescription, through the HTTP API. */
describe('UC06 dispensing (e2e)', () => {
  // 10:00 on 13/10/2026 in Vietnam.
  const clock = new FixedClock(new Date('2026-10-13T03:00:00Z'));
  let t: TestApp;
  let ledger: StockLedger;
  let manager: Actor;
  let medicine: Medicine;
  let customerId: string;
  let prescriberId: string;
  let seq = 0;

  beforeAll(async () => {
    t = await createTestApp({ clock });
    ledger = t.app.get(StockLedger);
  });

  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    clock.set(new Date('2026-10-13T03:00:00Z'));
    await resetDatabase(t.dataSource);
    manager = await actorFor(t.dataSource, 'manager');
    medicine = await createMedicine(t.dataSource, { expiryAlertDays: 90 });
    customerId = (
      await t.dataSource.getRepository(Customer).save({
        code: 'KH0001',
        fullName: 'Nguyen Van An',
        dateOfBirth: '1980-05-01',
        address: '10 Tran Hung Dao, District 5',
      })
    ).id;
    prescriberId = (
      await t.dataSource.getRepository(Prescriber).save({
        licenceNumber: 'CCHN-000101-HCM',
        fullName: 'Dr. Tran Van Quang',
        isActive: true,
      })
    ).id;
  });

  /** Receives `quantity` into a new batch of `medicine` and returns its id. */
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
      if (quantity > 0) {
        await tx.post(manager, {
          batchId: batch.id,
          type: MovementType.RECEIPT,
          deltaSellable: quantity,
          sourceDocumentType: SourceDocumentType.GOODS_RECEIPT,
          sourceDocumentId: DOC,
        });
      }
      return batch.id;
    });
  }

  /** Records and verifies a prescription; returns its id and item ids. */
  async function verifiedPrescription(
    lines: Array<{ quantity: number; daysOfUse?: number; of?: Medicine }>,
    verify = true,
  ) {
    seq += 1;
    const res = await t
      .http()
      .post('/api/prescriptions')
      .set(as('pharmacist'))
      .send({
        referenceNumber: `RX-${seq}`,
        issuedDate: '2026-10-13',
        customerId,
        prescriberId,
        items: lines.map((l) => ({
          medicineId: (l.of ?? medicine).id,
          strength: '500 mg',
          quantityPrescribed: l.quantity,
          dose: '1 tablet twice a day',
          route: 'oral',
          daysOfUse: l.daysOfUse ?? 5,
        })),
      });
    expect(res.status).toBe(201);
    if (verify) {
      const v = await t
        .http()
        .post(`/api/prescriptions/${res.body.id}/verify`)
        .set(as('pharmacist'))
        .send({});
      expect(v.status).toBe(200);
    }
    const items = await t.dataSource
      .getRepository(PrescriptionItem)
      .find({
        where: { prescription: { id: res.body.id } },
        relations: { medicine: true },
      });
    // Request order = the order of `lines`.
    const ordered = lines.map(
      (l) =>
        items.splice(
          items.findIndex(
            (i) =>
              i.medicine.id === (l.of ?? medicine).id &&
              i.quantityPrescribed === l.quantity,
          ),
          1,
        )[0].id,
    );
    return { id: res.body.id as string, itemIds: ordered };
  }

  function dispense(
    prescriptionId: string,
    items: Array<{
      prescriptionItemId: string;
      quantity: number;
      partialSupplyNote?: string;
    }>,
    requestId = randomUUID(),
    user: 'pharmacist' | 'cashier' = 'pharmacist',
  ) {
    return t
      .http()
      .post('/api/dispensings')
      .set(as(user))
      .send({ requestId, prescriptionId, items });
  }

  const qty = async (batchId: string) =>
    (await t.dataSource.getRepository(Batch).findOneByOrFail({ id: batchId }))
      .qtySellable;

  async function expectBalanced() {
    expect(await findLedgerMismatches(t.dataSource)).toEqual([]);
  }

  it('UC06-01 TC-04 BR01: 7 from A=3 (expires first) and B=8 leaves A=0, B=4 with two lines and two movements', async () => {
    const a = await receive('A', 3, '2027-01-31');
    const b = await receive('B', 8, '2027-03-31');
    const rx = await verifiedPrescription([{ quantity: 7 }]);

    const res = await dispense(rx.id, [
      { prescriptionItemId: rx.itemIds[0], quantity: 7 },
    ]);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('fully_dispensed');
    expect(res.body.items[0]).toMatchObject({
      quantityDispensed: 7,
      quantityOutstanding: 0,
    });
    expect(
      res.body.items[0].lines.map(
        (l: { batchNumber: string; quantity: number }) => [
          l.batchNumber,
          l.quantity,
        ],
      ),
    ).toEqual([
      ['A', 3],
      ['B', 4],
    ]);
    expect(await qty(a)).toBe(0);
    expect(await qty(b)).toBe(4);

    const lines = await t.dataSource.getRepository(DispenseLine).find();
    expect(lines).toHaveLength(2);
    const movements = await t.dataSource
      .getRepository(StockMovement)
      .find({
        where: { type: MovementType.DISPENSE },
        order: { deltaSellable: 'ASC' },
      });
    expect(
      movements.map((m) => [m.deltaSellable, m.sourceDocumentType]),
    ).toEqual([
      [-4, SourceDocumentType.DISPENSE_LINE],
      [-3, SourceDocumentType.DISPENSE_LINE],
    ]);
    await expectBalanced();
  });

  it('UC06-02 TC-05 TC-08 TC-60: skips an empty, an expired and an on-hold batch', async () => {
    await receive('EMPTY', 0, '2026-12-01');
    await receive('EXPIRED', 5, '2026-10-12');
    const held = await receive('HELD', 5, '2026-12-15');
    await t.dataSource
      .getRepository(Batch)
      .update({ id: held }, { status: BatchStatus.ON_HOLD });
    const good = await receive('GOOD', 5, '2027-06-30');
    const rx = await verifiedPrescription([{ quantity: 2 }]);

    const res = await dispense(rx.id, [
      { prescriptionItemId: rx.itemIds[0], quantity: 2 },
    ]);
    expect(res.status).toBe(201);
    expect(
      res.body.items[0].lines.map(
        (l: { batchNumber: string }) => l.batchNumber,
      ),
    ).toEqual(['GOOD']);
    expect(await qty(good)).toBe(3);
    expect(await qty(held)).toBe(5);
  });

  it('UC06-03 TC-06 TC-07 BR02: a batch expiring on or before the business date is never issued', async () => {
    const today = await receive('TODAY', 5, '2026-10-13');
    const rx = await verifiedPrescription([{ quantity: 1 }]);
    const res = await dispense(rx.id, [
      { prescriptionItemId: rx.itemIds[0], quantity: 1 },
    ]);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('INSUFFICIENT_STOCK');
    expect(await qty(today)).toBe(5);
  });

  it('UC06-04 TC-09 FR-18: a shortage is refused with the sellable quantity and changes nothing', async () => {
    const a = await receive('A', 4);
    const rx = await verifiedPrescription([{ quantity: 6 }]);
    const res = await dispense(rx.id, [
      { prescriptionItemId: rx.itemIds[0], quantity: 6 },
    ]);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('INSUFFICIENT_STOCK');
    expect(res.body.errors).toEqual([
      { field: 'items.0.quantity', message: 'Only 4 can be issued now.' },
    ]);
    expect(await qty(a)).toBe(4);
    expect(await t.dataSource.getRepository(DispenseLine).count()).toBe(0);
  });

  it('UC06-05 TC-10 DEC-02: a smaller hand-over needs a note and leaves the rest outstanding', async () => {
    await receive('A', 4);
    const rx = await verifiedPrescription([{ quantity: 6 }]);
    const item = rx.itemIds[0];

    const noNote = await dispense(rx.id, [
      { prescriptionItemId: item, quantity: 4 },
    ]);
    expect(noNote.status).toBe(400);
    expect(noNote.body.errors[0].field).toBe('items.0.partialSupplyNote');

    const res = await dispense(rx.id, [
      {
        prescriptionItemId: item,
        quantity: 4,
        partialSupplyNote: 'Discussed with the patient; returns Friday.',
      },
    ]);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('partially_dispensed');
    expect(res.body.items[0]).toMatchObject({
      quantityDispensed: 4,
      quantityOutstanding: 2,
    });
    const line = await t.dataSource
      .getRepository(DispenseLine)
      .findOneByOrFail({});
    expect(line.partialSupplyNote).toBe(
      'Discussed with the patient; returns Friday.',
    );
  });

  it('UC06-06 TC-37 BR07: a second visit may take the rest but never more than prescribed', async () => {
    await receive('A', 20);
    const rx = await verifiedPrescription([{ quantity: 6 }]);
    const item = rx.itemIds[0];
    await dispense(rx.id, [
      {
        prescriptionItemId: item,
        quantity: 4,
        partialSupplyNote: 'Split over two visits.',
      },
    ]);

    const over = await dispense(rx.id, [
      { prescriptionItemId: item, quantity: 3 },
    ]);
    expect(over.status).toBe(422);
    expect(over.body.code).toBe('OVER_PRESCRIBED_QUANTITY');
    expect(over.body.errors[0].field).toBe('items.0.quantity');

    const rest = await dispense(rx.id, [
      { prescriptionItemId: item, quantity: 2 },
    ]);
    expect(rest.status).toBe(201);
    expect(rest.body.status).toBe('fully_dispensed');

    const again = await dispense(rx.id, [
      { prescriptionItemId: item, quantity: 1 },
    ]);
    expect(again.status).toBe(422);
    expect(again.body.code).toBe('PRESCRIPTION_NOT_DISPENSABLE');
    await expectBalanced();
  });

  it('UC06-07 TC-58 BR04: a prescription that is not verified cannot be dispensed', async () => {
    await receive('A', 5);
    const rx = await verifiedPrescription([{ quantity: 2 }], false);
    const res = await dispense(rx.id, [
      { prescriptionItemId: rx.itemIds[0], quantity: 2 },
    ]);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('PRESCRIPTION_NOT_DISPENSABLE');
  });

  it('UC06-08 TC-38 BR10: refused after valid-until, checked again at every visit', async () => {
    await receive('A', 10);
    const rx = await verifiedPrescription([{ quantity: 4 }]);
    const item = rx.itemIds[0];
    clock.set(new Date('2026-10-18T10:00:00Z')); // 17:00 on 18/10: last valid day
    const first = await dispense(rx.id, [
      {
        prescriptionItemId: item,
        quantity: 2,
        partialSupplyNote: 'First half.',
      },
    ]);
    expect(first.status).toBe(201);

    clock.set(new Date('2026-10-18T17:30:00Z')); // 00:30 on 19/10 in Vietnam
    const second = await dispense(rx.id, [
      { prescriptionItemId: item, quantity: 2 },
    ]);
    expect(second.status).toBe(422);
    expect(second.body.code).toBe('PRESCRIPTION_EXPIRED');
  });

  it('UC06-09 TC-27 FR-23: a repeated request returns the first result and moves stock once', async () => {
    const a = await receive('A', 10);
    const rx = await verifiedPrescription([{ quantity: 3 }]);
    const requestId = randomUUID();
    const items = [{ prescriptionItemId: rx.itemIds[0], quantity: 3 }];

    const first = await dispense(rx.id, items, requestId);
    const repeat = await dispense(rx.id, items, requestId);
    expect(first.status).toBe(201);
    expect(repeat.status).toBe(201);
    expect(repeat.body).toEqual(first.body);
    expect(await qty(a)).toBe(7);

    const other = await dispense(
      rx.id,
      [{ ...items[0], quantity: 2 }],
      requestId,
    );
    expect(other.status).toBe(409);
    expect(other.body.code).toBe('REQUEST_ID_REUSED');
    await expectBalanced();
  });

  it('UC06-10 TC-57 FR-16: preview shows the batches and warnings and changes nothing', async () => {
    const soon = await receive('SOON', 2, '2026-11-12'); // 30 days left
    await receive('LATER', 10, '2027-06-30');
    const rx = await verifiedPrescription([{ quantity: 5 }]);

    const res = await t
      .http()
      .post('/api/dispensings/preview')
      .set(as('pharmacist'))
      .send({
        prescriptionId: rx.id,
        items: [{ prescriptionItemId: rx.itemIds[0], quantity: 3 }],
      });
    expect(res.status).toBe(200);
    expect(res.body.items[0]).toMatchObject({
      requested: 3,
      available: 12,
      quantityOutstanding: 5,
      needsPartialSupplyNote: true,
    });
    expect(res.body.items[0].batches).toEqual([
      expect.objectContaining({
        batchNumber: 'SOON',
        quantity: 2,
        warning: { kind: 'WITHIN_ALERT_WINDOW', daysLeft: 30 },
      }),
      expect.objectContaining({
        batchNumber: 'LATER',
        quantity: 1,
        warning: null,
      }),
    ]);
    expect(await qty(soon)).toBe(2);
    expect(
      await t.dataSource
        .getRepository(StockMovement)
        .count({ where: { type: MovementType.DISPENSE } }),
    ).toBe(0);
  });

  it('UC06-11 two items of the same medicine draw from the same batches without double counting', async () => {
    await receive('A', 5);
    const rx = await verifiedPrescription([{ quantity: 4 }, { quantity: 3 }]);
    const res = await dispense(rx.id, [
      { prescriptionItemId: rx.itemIds[0], quantity: 4 },
      { prescriptionItemId: rx.itemIds[1], quantity: 3 },
    ]);
    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual([
      { field: 'items.1.quantity', message: 'Only 1 can be issued now.' },
    ]);
  });

  it('UC06-12 TC-28: a cashier cannot dispense or preview', async () => {
    await receive('A', 5);
    const rx = await verifiedPrescription([{ quantity: 1 }]);
    const res = await dispense(
      rx.id,
      [{ prescriptionItemId: rx.itemIds[0], quantity: 1 }],
      randomUUID(),
      'cashier',
    );
    expect(res.status).toBe(403);
    const preview = await t
      .http()
      .post('/api/dispensings/preview')
      .set(as('cashier'))
      .send({
        prescriptionId: rx.id,
        items: [{ prescriptionItemId: rx.itemIds[0], quantity: 1 }],
      });
    expect(preview.status).toBe(403);
  });

  it('UC06-13 BR03 (W05-B3): two hand-overs racing for the last units — exactly one wins', async () => {
    const a = await receive('A', 5);
    const rx1 = await verifiedPrescription([{ quantity: 5 }]);
    const rx2 = await verifiedPrescription([{ quantity: 5 }]);

    const [r1, r2] = await Promise.all([
      dispense(rx1.id, [{ prescriptionItemId: rx1.itemIds[0], quantity: 5 }]),
      dispense(rx2.id, [{ prescriptionItemId: rx2.itemIds[0], quantity: 5 }]),
    ]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([201, 422]);
    const loser = r1.status === 422 ? r1 : r2;
    expect(loser.body.code).toBe('INSUFFICIENT_STOCK');
    expect(await qty(a)).toBe(0);
    await expectBalanced();
  });

  it('UC06-14 TC-54 BR07: two pharmacists dispensing the same item at once never exceed the prescription', async () => {
    await receive('A', 20);
    const rx = await verifiedPrescription([{ quantity: 4 }]);
    const item = { prescriptionItemId: rx.itemIds[0], quantity: 4 };

    const [r1, r2] = await Promise.all([
      dispense(rx.id, [item]),
      dispense(rx.id, [item]),
    ]);
    expect([r1.status, r2.status].sort()).toEqual([201, 422]);
    const after = await t.dataSource
      .getRepository(PrescriptionItem)
      .findOneByOrFail({ id: rx.itemIds[0] });
    expect(after.quantityDispensed).toBe(4);
    await expectBalanced();
  });
});
