import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Actor } from '../src/auth/actor.js';
import { PriceBook } from '../src/catalogue/price-book.js';
import {
  Batch,
  Customer,
  type Medicine,
  MovementType,
  Prescriber,
  PrescriptionItem,
  SourceDocumentType,
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

/** TC-62, TC-54 and TC-26 ask for 20 runs, not the single run of UC06-13/14 and UC07-13. */
const RUNS = 20;

/**
 * Every race is run 20 times through the real API. Each round gets its own
 * medicine, batch and prescription, so a round can never lean on the data of
 * the one before it; only the database reset is shared.
 */
describe('Races, 20 runs each (e2e)', () => {
  // 10:00 on 13/10/2026 in Vietnam.
  const clock = new FixedClock(new Date('2026-10-13T03:00:00Z'));
  let t: TestApp;
  let ledger: StockLedger;
  let prices: PriceBook;
  let manager: Actor;
  let customerId: string;
  let prescriberId: string;
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
    clock.set(new Date('2026-10-13T03:00:00Z'));
    await resetDatabase(t.dataSource);
    manager = await actorFor(t.dataSource, 'manager');
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

  /** A medicine of this round, OTC and with a price in force (UC07 needs one). */
  async function pricedMedicine(): Promise<Medicine> {
    const medicine = await createMedicine(t.dataSource, { expiryAlertDays: 90 });
    await prices.setPrice(
      t.dataSource.manager,
      manager,
      medicine.id,
      2000,
      '2026-10-01',
    );
    return medicine;
  }

  /** Receives `quantity` into a new batch and returns its id. */
  function receive(
    batchNumber: string,
    quantity: number,
    of: Medicine,
  ): Promise<string> {
    return ledger.run(async (tx) => {
      await tx.lockMedicines([of.id]);
      const batch = await tx.createBatch({
        medicineId: of.id,
        batchNumber,
        expiryDate: '2027-06-30',
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

  /** Records and verifies a one-line prescription; returns its id and item id. */
  async function verifiedPrescription(
    of: Medicine,
    quantity: number,
  ): Promise<{ id: string; itemId: string }> {
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
        items: [
          {
            medicineId: of.id,
            strength: '500 mg',
            quantityPrescribed: quantity,
            dose: '1 tablet twice a day',
            route: 'oral',
            daysOfUse: 5,
          },
        ],
      });
    expect(res.status).toBe(201);
    const v = await t
      .http()
      .post(`/api/prescriptions/${res.body.id}/verify`)
      .set(as('pharmacist'))
      .send({});
    expect(v.status).toBe(200);
    const [item] = await t.dataSource
      .getRepository(PrescriptionItem)
      .findBy({ prescription: { id: res.body.id } });
    return { id: res.body.id as string, itemId: item.id };
  }

  /** One OTC line at the cashier's counter. */
  function sell(medicine: Medicine, quantity: number) {
    return t
      .http()
      .post('/api/sales')
      .set(as('cashier'))
      .send({
        requestId: randomUUID(),
        otcLines: [{ medicineId: medicine.id, quantity }],
      });
  }

  /** One hand-over line at the pharmacist's counter. */
  function dispense(
    prescriptionId: string,
    prescriptionItemId: string,
    quantity: number,
  ) {
    return t
      .http()
      .post('/api/dispensings')
      .set(as('pharmacist'))
      .send({
        requestId: randomUUID(),
        prescriptionId,
        items: [{ prescriptionItemId, quantity }],
      });
  }

  /**
   * Forces a real overlap: holds the medicine's row lock, starts the
   * requests, waits until the database shows `waiters` sessions blocked on
   * a lock, then lets go. `Promise.all` alone only sends the requests
   * together; this proves both were inside their transactions at once.
   */
  async function overlapping<T>(
    medicineId: string,
    waiters: number,
    requests: () => PromiseLike<T>[],
  ): Promise<T[]> {
    const holder = t.dataSource.createQueryRunner();
    await holder.connect();
    await holder.startTransaction();
    await holder.query('SELECT id FROM medicines WHERE id = $1 FOR UPDATE', [
      medicineId,
    ]);
    const pending = Promise.all(requests());
    try {
      let blocked = 0;
      for (let tries = 0; tries < 250 && blocked < waiters; tries += 1) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        const [row] = await t.dataSource.query(
          `SELECT count(*)::int AS n FROM pg_stat_activity
            WHERE datname = current_database() AND wait_event_type = 'Lock'`,
        );
        blocked = row.n;
      }
      expect(blocked, 'requests blocked behind the held lock').toBe(waiters);
    } finally {
      await holder.commitTransaction();
      await holder.release();
    }
    return pending;
  }

  const qty = async (batchId: string) =>
    (await t.dataSource.getRepository(Batch).findOneByOrFail({ id: batchId }))
      .qtySellable;

  /** BR05 after every round: the ledger balances and no batch went negative. */
  const expectHealthy = async (round: number) => {
    expect(
      await findLedgerMismatches(t.dataSource),
      `round ${round}: ledger mismatch`,
    ).toEqual([]);
    const negative = await t.dataSource
      .getRepository(Batch)
      .createQueryBuilder('batch')
      .where('batch.qtySellable < 0')
      .getCount();
    expect(negative, `round ${round}: a batch holds a negative quantity`).toBe(0);
  };

  it(
    'RACE-01 TC-62: a sale and a hand-over racing for the last 3 units, 20 times',
    async () => {
      let wins = 0;
      let losses = 0;

      for (let round = 1; round <= RUNS; round += 1) {
        const medicine = await pricedMedicine();
        const batchId = await receive(`A-${round}`, 3, medicine);
        const rx = await verifiedPrescription(medicine, 3);

        const [sale, handOver] = await Promise.all([
          sell(medicine, 3),
          dispense(rx.id, rx.itemId, 3),
        ]);

        const statuses = [sale.status, handOver.status];
        expect(
          [...statuses].sort(),
          `round ${round}: sale ${sale.status}, hand-over ${handOver.status}`,
        ).toEqual([201, 422]);

        const loser = sale.status === 422 ? sale : handOver;
        expect(loser.status, `round ${round}: loser status`).toBe(422);
        expect(loser.body.code, `round ${round}: loser code`).toBe(
          'INSUFFICIENT_STOCK',
        );
        wins += statuses.filter((s) => s === 201).length;
        losses += statuses.filter((s) => s === 422).length;

        expect(await qty(batchId), `round ${round}: batch left`).toBe(0);
        await expectHealthy(round);
      }

      expect(wins).toBe(RUNS);
      expect(losses).toBe(RUNS);
    },
    120_000,
  );

  it(
    'RACE-02 TC-54: two hand-overs of the same item racing, 20 times',
    async () => {
      let wins = 0;
      let losses = 0;

      for (let round = 1; round <= RUNS; round += 1) {
        const medicine = await pricedMedicine();
        const batchId = await receive(`B-${round}`, 20, medicine);
        const rx = await verifiedPrescription(medicine, 4);

        const [first, second] = await Promise.all([
          dispense(rx.id, rx.itemId, 4),
          dispense(rx.id, rx.itemId, 4),
        ]);

        const statuses = [first.status, second.status];
        expect(
          [...statuses].sort(),
          `round ${round}: dispense ${first.status}/${second.status}`,
        ).toEqual([201, 422]);
        wins += statuses.filter((s) => s === 201).length;
        losses += statuses.filter((s) => s === 422).length;

        const after = await t.dataSource
          .getRepository(PrescriptionItem)
          .findOneByOrFail({ id: rx.itemId });
        expect(
          after.quantityDispensed,
          `round ${round}: quantity dispensed`,
        ).toBe(4);
        expect(await qty(batchId), `round ${round}: batch left`).toBe(16);
        await expectHealthy(round);
      }

      expect(wins).toBe(RUNS);
      expect(losses).toBe(RUNS);
    },
    120_000,
  );

  it(
    'RACE-03 TC-26: two hand-overs of two prescriptions racing for 5 units, 20 times',
    async () => {
      let wins = 0;
      let losses = 0;

      for (let round = 1; round <= RUNS; round += 1) {
        const medicine = await pricedMedicine();
        const batchId = await receive(`C-${round}`, 5, medicine);
        const firstRx = await verifiedPrescription(medicine, 4);
        const secondRx = await verifiedPrescription(medicine, 4);

        const [first, second] = await Promise.all([
          dispense(firstRx.id, firstRx.itemId, 4),
          dispense(secondRx.id, secondRx.itemId, 4),
        ]);

        const statuses = [first.status, second.status];
        expect(
          [...statuses].sort(),
          `round ${round}: dispense ${first.status}/${second.status}`,
        ).toEqual([201, 422]);
        const loser = first.status === 422 ? first : second;
        expect(loser.body.code, `round ${round}: loser code`).toBe(
          'INSUFFICIENT_STOCK',
        );
        wins += statuses.filter((s) => s === 201).length;
        losses += statuses.filter((s) => s === 422).length;

        expect(await qty(batchId), `round ${round}: batch left`).toBe(1);
        await expectHealthy(round);
      }

      expect(wins).toBe(RUNS);
      expect(losses).toBe(RUNS);
    },
    120_000,
  );

  it(
    'RACE-04 TC-26: two hand-overs for 4 of the last 5, both held at the lock together, 20 times',
    async () => {
      for (let round = 1; round <= RUNS; round += 1) {
        const medicine = await pricedMedicine();
        const batchId = await receive(`D-${round}`, 5, medicine);
        const firstRx = await verifiedPrescription(medicine, 4);
        const secondRx = await verifiedPrescription(medicine, 4);

        const [first, second] = await overlapping(medicine.id, 2, () => [
          dispense(firstRx.id, firstRx.itemId, 4),
          dispense(secondRx.id, secondRx.itemId, 4),
        ]);

        expect(
          [first.status, second.status].sort(),
          `round ${round}: dispense ${first.status}/${second.status}`,
        ).toEqual([201, 422]);
        const loser = first.status === 422 ? first : second;
        expect(loser.body.code, `round ${round}: loser code`).toBe(
          'INSUFFICIENT_STOCK',
        );
        expect(await qty(batchId), `round ${round}: batch left`).toBe(1);
        await expectHealthy(round);
      }
    },
    180_000,
  );

  it(
    'RACE-05 TC-54: two hand-overs of the same last 4 prescribed, both held at the lock together, 20 times',
    async () => {
      for (let round = 1; round <= RUNS; round += 1) {
        const medicine = await pricedMedicine();
        const batchId = await receive(`E-${round}`, 20, medicine);
        const rx = await verifiedPrescription(medicine, 4);

        const [first, second] = await overlapping(medicine.id, 2, () => [
          dispense(rx.id, rx.itemId, 4),
          dispense(rx.id, rx.itemId, 4),
        ]);

        expect(
          [first.status, second.status].sort(),
          `round ${round}: dispense ${first.status}/${second.status}`,
        ).toEqual([201, 422]);
        const after = await t.dataSource
          .getRepository(PrescriptionItem)
          .findOneByOrFail({ id: rx.itemId });
        expect(
          after.quantityDispensed,
          `round ${round}: quantity dispensed`,
        ).toBe(4);
        expect(await qty(batchId), `round ${round}: batch left`).toBe(16);
        await expectHealthy(round);
      }
    },
    180_000,
  );
});
