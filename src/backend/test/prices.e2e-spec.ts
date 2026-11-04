import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Actor } from '../src/auth/actor.js';
import { PriceBook } from '../src/catalogue/price-book.js';
import {
  type Medicine,
  MedicinePrice,
  MovementType,
  SourceDocumentType,
} from '../src/entities/index.js';
import { StockLedger } from '../src/stock/stock-ledger.js';
import { FixedClock } from '../src/stock/clock.js';
import { actorFor, createMedicine } from './e2e/fixtures.js';
import { as, createTestApp, resetDatabase, type TestApp } from './e2e/helpers.js';

const DOC = '00000000-0000-4000-8000-0000000000d1';
/** 10:00 on Mon 02/11/2026 in Ho Chi Minh City. */
const ON_2_NOV = new Date('2026-11-02T03:00:00Z');
const ON_3_NOV = new Date('2026-11-03T03:00:00Z');

/**
 * UC13 through the HTTP API: the rows S01–S10 of the scenario table in
 * UC13-manage-medicine-prices.md (S09 is the access matrix).
 */
describe('UC13 medicine prices (e2e)', () => {
  const clock = new FixedClock(ON_2_NOV);
  let t: TestApp;
  let ledger: StockLedger;
  let manager: Actor;
  let medicine: Medicine;

  beforeAll(async () => {
    t = await createTestApp({ clock });
    ledger = t.app.get(StockLedger);
  });

  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    clock.set(ON_2_NOV);
    await resetDatabase(t.dataSource);
    manager = await actorFor(t.dataSource, 'manager');
    // An OTC medicine as UC01 keeps it, so UC01's edit accepts it (UC13-03).
    medicine = await createMedicine(t.dataSource, {
      classificationSource: 'Registration VD-12345-26',
      classificationDate: '2026-09-01',
    });
    // 500 ₫ in force since 14/09, as UC01 would have set it.
    await t.app
      .get(PriceBook)
      .setPrice(t.dataSource.manager, manager, medicine.id, 500, '2026-09-14');
  });

  const url = (id = medicine.id) => `/api/medicines/${id}/prices`;
  const schedule = (unitPrice: unknown, effectiveFrom: unknown, user: 'manager' | 'pharmacist' | 'cashier' = 'manager') =>
    t.http().post(url()).set(as(user)).send({ unitPrice, effectiveFrom });
  const history = () => t.http().get(url()).set(as('manager'));
  const rows = () => t.dataSource.getRepository(MedicinePrice).count();
  const listPrice = async () =>
    (await t.http().get(`/api/medicines/${medicine.id}`).set(as('manager'))).body.currentPrice;

  async function stockOf(quantity: number) {
    await ledger.run(async (tx) => {
      await tx.lockMedicines([medicine.id]);
      const batch = await tx.createBatch({
        medicineId: medicine.id,
        batchNumber: 'P13-A',
        expiryDate: '2027-12-31',
        unitCost: '300',
        receivedAt: new Date('2026-10-01T03:00:00Z'),
      });
      await tx.post(manager, {
        batchId: batch.id,
        type: MovementType.RECEIPT,
        deltaSellable: quantity,
        sourceDocumentType: SourceDocumentType.GOODS_RECEIPT,
        sourceDocumentId: DOC,
      });
    });
  }

  const sell = (quantity: number) =>
    t.http()
      .post('/api/sales')
      .set(as('cashier'))
      .send({ requestId: randomUUID(), otcLines: [{ medicineId: medicine.id, quantity }] });

  it('UC13-01 (S01): a price scheduled for tomorrow is stored, and today\'s price stays in force', async () => {
    const res = await schedule(600, '2026-11-03');

    expect(res.status).toBe(201);
    expect(res.body.today).toBe('2026-11-02');
    expect(res.body.prices.map((p: { effectiveFrom: string; unitPrice: string; state: string }) => [p.effectiveFrom, p.unitPrice, p.state])).toEqual([
      ['2026-11-03', '600.00', 'scheduled'],
      ['2026-09-14', '500.00', 'in_force'],
    ]);
    expect(res.body.prices[0].setBy.fullName).toBe('Sample Manager');
    expect(await listPrice()).toBe('500.00');
  });

  it('UC13-02 (S02, TC-40): a sale on the day the scheduled price starts is valued at the new price', async () => {
    await stockOf(10);
    expect((await schedule(600, '2026-11-03')).status).toBe(201);

    const today = await sell(1);
    clock.set(ON_3_NOV);
    const tomorrow = await sell(1);

    expect(today.status).toBe(201);
    expect(today.body.lines[0].unitPrice).toBe('500.00');
    expect(tomorrow.status).toBe(201);
    expect(tomorrow.body.lines[0].unitPrice).toBe('600.00');
    expect(await listPrice()).toBe('600.00');
  });

  it('UC13-03 (S03, TC-41): changing the price after a sale leaves the sale as it was', async () => {
    await stockOf(10);
    const sale = await sell(2);
    expect(sale.status).toBe(201);

    // Today's price through UC01, and a scheduled one through UC13.
    const edit = await t.http().patch(`/api/medicines/${medicine.id}`).set(as('manager')).send({ currentPrice: 550 });
    expect(edit.status, JSON.stringify(edit.body)).toBe(200);
    expect((await schedule(700, '2026-11-10')).status).toBe(201);

    const again = await t.http().get(`/api/sales/${sale.body.id}`).set(as('cashier'));
    expect(again.body.lines[0].unitPrice).toBe('500.00');
    expect(again.body.totalAmount).toBe(sale.body.totalAmount);
  });

  it('UC13-04 (S04): a price that is not a whole positive number, or a date in the past, is refused on its field', async () => {
    const cases: Array<[unknown, unknown, string]> = [
      [10.5, '2026-11-03', 'unitPrice'],
      [0, '2026-11-03', 'unitPrice'],
      [-5, '2026-11-03', 'unitPrice'],
      [600, '2026-11-01', 'effectiveFrom'],
      [600, '2026-13-01', 'effectiveFrom'],
    ];
    for (const [price, date, field] of cases) {
      const res = await schedule(price, date);
      expect(res.status, `${price} ${date}`).toBe(400);
      expect(res.body.errors.map((e: { field: string }) => e.field)).toContain(field);
    }
    expect(await rows()).toBe(1);
  });

  it('UC13-05 (S05): a date that already has a price is refused with PRICE_DATE_TAKEN', async () => {
    expect((await schedule(450, '2026-11-02')).status).toBe(201); // no price starts today yet
    expect((await schedule(600, '2026-11-10')).status).toBe(201);

    const todayAgain = await schedule(480, '2026-11-02');
    const scheduledAgain = await schedule(650, '2026-11-10');

    for (const res of [todayAgain, scheduledAgain]) {
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('PRICE_DATE_TAKEN');
      expect(res.body.errors[0].field).toBe('effectiveFrom');
    }
    const prices = (await history()).body.prices;
    expect(prices.map((p: { unitPrice: string }) => p.unitPrice)).toEqual(['600.00', '450.00', '500.00']);
  });

  it('UC13-06 (S06): a scheduled price can be cancelled before it starts', async () => {
    const scheduled = (await schedule(600, '2026-11-03')).body.prices[0];

    const res = await t.http().delete(`${url()}/${scheduled.id}`).set(as('manager'));

    expect(res.status).toBe(204);
    expect((await history()).body.prices).toHaveLength(1);
    clock.set(ON_3_NOV);
    expect(await listPrice()).toBe('500.00');
  });

  it('UC13-07 (S07): a price in force or past cannot be cancelled, nor a price of another medicine', async () => {
    await schedule(450, '2026-11-02');
    const [today, past] = (await history()).body.prices;
    const other = await createMedicine(t.dataSource);

    const inForce = await t.http().delete(`${url()}/${today.id}`).set(as('manager'));
    const old = await t.http().delete(`${url()}/${past.id}`).set(as('manager'));
    const wrongMedicine = await t.http().delete(`${url(other.id)}/${today.id}`).set(as('manager'));

    expect([inForce.status, inForce.body.code]).toEqual([422, 'PRICE_ALREADY_IN_FORCE']);
    expect([old.status, old.body.code]).toEqual([422, 'PRICE_ALREADY_IN_FORCE']);
    expect(wrongMedicine.status).toBe(404);
    expect(await rows()).toBe(2);
  });

  it('UC13-08 (S08): two managers scheduling the same date at once end with one price', async () => {
    const [a, b] = await Promise.all([schedule(600, '2026-11-05'), schedule(650, '2026-11-05')]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await rows()).toBe(2);
  });

  it('UC13-09 (S10): the history lists past, current and scheduled prices newest first', async () => {
    await t.app
      .get(PriceBook)
      .setPrice(t.dataSource.manager, manager, medicine.id, 520, '2026-10-20');
    await schedule(600, '2026-11-20');

    const res = await history();

    expect(res.status).toBe(200);
    expect(res.body.medicine.code).toBe(medicine.code);
    expect(res.body.prices.map((p: { effectiveFrom: string; state: string }) => [p.effectiveFrom, p.state])).toEqual([
      ['2026-11-20', 'scheduled'],
      ['2026-10-20', 'in_force'],
      ['2026-09-14', 'past'],
    ]);
    expect(res.body.prices.every((p: { createdAt: string }) => typeof p.createdAt === 'string')).toBe(true);
  });

  it('an unknown medicine is a 404, and a pharmacist cannot schedule', async () => {
    expect((await t.http().get(url(randomUUID())).set(as('manager'))).status).toBe(404);
    expect((await schedule(600, '2026-11-03', 'pharmacist')).status).toBe(403);
    expect(await rows()).toBe(1);
  });
});
