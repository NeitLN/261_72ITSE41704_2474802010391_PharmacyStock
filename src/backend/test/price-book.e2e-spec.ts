import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Actor } from '../src/auth/actor.js';
import { PriceBook } from '../src/catalogue/price-book.js';
import { type Medicine, MedicinePrice } from '../src/entities/index.js';
import { actorFor, createMedicine } from './e2e/fixtures.js';
import { createTestApp, resetDatabase, type TestApp } from './e2e/helpers.js';

/**
 * PriceBook against the real database (BR09). The rule is one SQL query, so
 * it is checked here rather than with a mocked manager.
 */
describe('PriceBook (e2e)', () => {
  let t: TestApp;
  let prices: PriceBook;
  let manager: Actor;
  let medicine: Medicine;

  beforeAll(async () => {
    t = await createTestApp();
    prices = t.app.get(PriceBook);
  });

  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(t.dataSource);
    manager = await actorFor(t.dataSource, 'manager');
    medicine = await createMedicine(t.dataSource);
  });

  function set(medicineId: string, unitPrice: number, date: string) {
    return prices.setPrice(
      t.dataSource.manager,
      manager,
      medicineId,
      unitPrice,
      date,
    );
  }

  async function priceOn(medicineId: string, date: string) {
    return (
      await prices.pricesOn(t.dataSource.manager, [medicineId], date)
    ).get(medicineId);
  }

  it('BR09-01 the price in force is the newest one that started on or before the date', async () => {
    await set(medicine.id, 1500, '2026-10-01');
    await set(medicine.id, 1800, '2026-10-10');

    expect(await priceOn(medicine.id, '2026-10-05')).toBe('1500.00');
    expect(await priceOn(medicine.id, '2026-10-12')).toBe('1800.00');
  });

  it('BR09-02 a new price applies from its own start date, not the day before', async () => {
    await set(medicine.id, 1500, '2026-10-01');
    await set(medicine.id, 1800, '2026-10-10');

    expect(await priceOn(medicine.id, '2026-10-09')).toBe('1500.00');
    expect(await priceOn(medicine.id, '2026-10-10')).toBe('1800.00');
  });

  it('BR09-03 a price scheduled for a later date does not apply yet', async () => {
    await set(medicine.id, 1800, '2026-10-10');
    await set(medicine.id, 2000, '2026-10-20');

    expect(await priceOn(medicine.id, '2026-10-12')).toBe('1800.00');
    expect(await priceOn(medicine.id, '2026-10-20')).toBe('2000.00');
  });

  it('BR09-04 a medicine with no price on or before the date has none', async () => {
    await set(medicine.id, 2000, '2026-10-20');

    expect(await priceOn(medicine.id, '2026-10-12')).toBeUndefined();
    expect(
      await prices.pricesOn(t.dataSource.manager, [], '2026-10-12'),
    ).toEqual(new Map());
  });

  it('BR09-05 a second change on the same day replaces that day only; earlier days keep theirs', async () => {
    await set(medicine.id, 1500, '2026-10-01');
    await set(medicine.id, 1800, '2026-10-10');
    await set(medicine.id, 1900, '2026-10-10');

    const rows = await t.dataSource.getRepository(MedicinePrice).find({
      where: { medicine: { id: medicine.id } },
      order: { effectiveFrom: 'ASC' },
    });
    expect(rows.map((r) => [r.effectiveFrom, r.unitPrice])).toEqual([
      ['2026-10-01', '1500.00'],
      ['2026-10-10', '1900.00'],
    ]);
    expect(await priceOn(medicine.id, '2026-10-05')).toBe('1500.00');
  });

  it('BR09-06 each medicine gets its own price in one call', async () => {
    const other = await createMedicine(t.dataSource);
    await set(medicine.id, 1500, '2026-10-01');
    await set(other.id, 3200, '2026-10-05');
    await set(other.id, 3500, '2026-10-15');

    const map = await prices.pricesOn(
      t.dataSource.manager,
      [medicine.id, other.id],
      '2026-10-12',
    );
    expect(map).toEqual(
      new Map([
        [medicine.id, '1500.00'],
        [other.id, '3200.00'],
      ]),
    );
  });
});
