import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PriceBook } from '../src/catalogue/price-book.js';
import { MedicinePrice } from '../src/entities/index.js';
import { FixedClock } from '../src/stock/clock.js';
import {
  as,
  createTestApp,
  resetDatabase,
  type TestApp,
} from './e2e/helpers.js';

/** UC01 Manage medicine catalogue (FR-01 to FR-03). */
describe('UC01 medicine catalogue (e2e)', () => {
  // 10:00 on 12/10/2026 in Vietnam.
  const clock = new FixedClock(new Date('2026-10-12T03:00:00Z'));
  let t: TestApp;
  let categoryId: string;
  let otherCategoryId: string;
  let unitId: string;

  beforeAll(async () => {
    t = await createTestApp({ clock });
  });

  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    clock.set(new Date('2026-10-12T03:00:00Z'));
    await resetDatabase(t.dataSource);
    const ref = await t
      .http()
      .get('/api/medicines/reference-data')
      .set(as('manager'));
    categoryId = ref.body.categories.find(
      (c: { code: string }) => c.code === 'ANALGESIC',
    ).id;
    otherCategoryId = ref.body.categories.find(
      (c: { code: string }) => c.code === 'VITAMIN',
    ).id;
    unitId = ref.body.units.find((u: { code: string }) => u.code === 'TAB').id;
  });

  const paracetamol = () => ({
    code: ' para500 ',
    name: 'Paracetamol 500 mg',
    activeIngredient: 'Paracetamol',
    strength: '500 mg',
    categoryId,
    baseUnitId: unitId,
    reorderLevel: 50,
    currentPrice: 1500,
  });

  async function create(body: object = paracetamol()) {
    const res = await t
      .http()
      .post('/api/medicines')
      .set(as('manager'))
      .send(body);
    expect(res.status).toBe(201);
    return res.body as { id: string; code: string };
  }

  const fieldsOf = (body: { errors: { field: string }[] }) =>
    body.errors.map((e) => e.field).sort();

  it('UC01-01 creates a medicine with its current price; prescription by default', async () => {
    const res = await t
      .http()
      .post('/api/medicines')
      .set(as('manager'))
      .send(paracetamol());

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      code: 'PARA500',
      name: 'Paracetamol 500 mg',
      classification: 'prescription',
      lowStockMonitored: true,
      expiryAlertDays: 90,
      currentPrice: '1500.00',
      category: { code: 'ANALGESIC' },
      baseUnit: { code: 'TAB' },
    });
  });

  it('UC01-02 a duplicate code is refused on the code field, whatever its case (3a, TC-45)', async () => {
    await create();
    const res = await t
      .http()
      .post('/api/medicines')
      .set(as('manager'))
      .send({ ...paracetamol(), code: 'Para500', name: 'Other' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_CODE');
    expect(fieldsOf(res.body)).toEqual(['code']);
  });

  it('UC01-03 negative levels and non-positive or fractional prices are field errors (3b)', async () => {
    const res = await t
      .http()
      .post('/api/medicines')
      .set(as('manager'))
      .send({
        ...paracetamol(),
        reorderLevel: -1,
        expiryAlertDays: -5,
        currentPrice: 0,
      });
    expect(res.status).toBe(400);
    expect(fieldsOf(res.body)).toEqual([
      'currentPrice',
      'expiryAlertDays',
      'reorderLevel',
    ]);

    const fraction = await t
      .http()
      .post('/api/medicines')
      .set(as('manager'))
      .send({ ...paracetamol(), currentPrice: 1500.5 });
    expect(fieldsOf(fraction.body)).toEqual(['currentPrice']);

    const list = await t.http().get('/api/medicines').set(as('manager'));
    expect(list.body).toHaveLength(0);
  });

  it('UC01-04 OTC needs the source and date of the classification, not in the future (DEC-09)', async () => {
    const missing = await t
      .http()
      .post('/api/medicines')
      .set(as('manager'))
      .send({ ...paracetamol(), classification: 'otc' });
    expect(missing.status).toBe(400);
    expect(fieldsOf(missing.body)).toEqual([
      'classificationDate',
      'classificationSource',
    ]);

    const future = await t
      .http()
      .post('/api/medicines')
      .set(as('manager'))
      .send({
        ...paracetamol(),
        classification: 'otc',
        classificationSource: 'Label, reg. VD-12345-10',
        classificationDate: '2026-10-13',
      });
    expect(fieldsOf(future.body)).toEqual(['classificationDate']);

    const ok = await t
      .http()
      .post('/api/medicines')
      .set(as('manager'))
      .send({
        ...paracetamol(),
        classification: 'otc',
        classificationSource: 'Label, reg. VD-12345-10',
        classificationDate: '2026-10-01',
      });
    expect(ok.status).toBe(201);
    expect(ok.body.classification).toBe('otc');
  });

  it('UC01-05 a price change applies from today and keeps earlier prices (FR-03)', async () => {
    const { id } = await create();

    // Same day: the day's price is corrected, no second row.
    await t
      .http()
      .patch(`/api/medicines/${id}`)
      .set(as('manager'))
      .send({ currentPrice: 1600 });
    expect(await t.dataSource.getRepository(MedicinePrice).count()).toBe(1);

    // Next day: a new row; the earlier day still has its own price.
    clock.set(new Date('2026-10-13T03:00:00Z'));
    const res = await t
      .http()
      .patch(`/api/medicines/${id}`)
      .set(as('manager'))
      .send({ currentPrice: 1800 });
    expect(res.body.currentPrice).toBe('1800.00');
    expect(await t.dataSource.getRepository(MedicinePrice).count()).toBe(2);

    const priceBook = t.app.get(PriceBook);
    const onTheTwelfth = await priceBook.pricesOn(
      t.dataSource.manager,
      [id],
      '2026-10-12',
    );
    expect(onTheTwelfth.get(id)).toBe('1600.00');
  });

  it('UC01-06 edit changes only the fields sent and can move the category', async () => {
    const { id } = await create();
    const res = await t
      .http()
      .patch(`/api/medicines/${id}`)
      .set(as('manager'))
      .send({
        categoryId: otherCategoryId,
        lowStockMonitored: false,
        strength: '',
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      name: 'Paracetamol 500 mg',
      strength: null,
      lowStockMonitored: false,
      category: { code: 'VITAMIN' },
      currentPrice: '1500.00',
    });
  });

  it('UC01-11 null for a required field is a field error, not a server error', async () => {
    const { id } = await create();
    const res = await t
      .http()
      .patch(`/api/medicines/${id}`)
      .set(as('manager'))
      .send({ name: null, reorderLevel: null, currentPrice: null });

    expect(res.status).toBe(400);
    expect(fieldsOf(res.body)).toEqual(
      expect.arrayContaining(['currentPrice', 'name', 'reorderLevel']),
    );
  });

  it('UC01-12 only full calendar dates are accepted for the classification date', async () => {
    for (const classificationDate of [
      '2026-10',
      '2026',
      '2026-02-30',
      '2026-10-01T10:00:00Z',
    ]) {
      const res = await t
        .http()
        .post('/api/medicines')
        .set(as('manager'))
        .send({ ...paracetamol(), classificationDate });
      expect(res.status).toBe(400);
      expect(fieldsOf(res.body)).toEqual(['classificationDate']);
    }
  });

  it('UC01-13 the base unit cannot change once the medicine has stock', async () => {
    const { id } = await create();
    const ref = await t
      .http()
      .get('/api/medicines/reference-data')
      .set(as('manager'));
    const bottle = ref.body.units.find(
      (u: { code: string }) => u.code === 'BOTTLE',
    ).id;

    // No stock yet: allowed.
    await t
      .http()
      .patch(`/api/medicines/${id}`)
      .set(as('manager'))
      .send({ baseUnitId: bottle })
      .expect(200);

    await t.dataSource.query(
      `INSERT INTO batches ("batchNumber", "expiryDate", "unitCost", "receivedAt", medicine_id)
       VALUES ('B1', '2027-01-31', 100, now(), $1)`,
      [id],
    );
    const res = await t
      .http()
      .patch(`/api/medicines/${id}`)
      .set(as('manager'))
      .send({ baseUnitId: unitId });
    expect(res.status).toBe(400);
    expect(fieldsOf(res.body)).toEqual(['baseUnitId']);
  });

  it('UC01-07 a deactivated medicine leaves the list but stays viewable (2a, FR-02)', async () => {
    const { id } = await create();
    await t
      .http()
      .post(`/api/medicines/${id}/deactivate`)
      .set(as('manager'))
      .expect(200);

    const list = await t.http().get('/api/medicines').set(as('manager'));
    expect(list.body).toHaveLength(0);
    const all = await t
      .http()
      .get('/api/medicines?includeInactive=true')
      .set(as('manager'));
    expect(all.body).toHaveLength(1);
    const one = await t.http().get(`/api/medicines/${id}`).set(as('manager'));
    expect(one.body.isActive).toBe(false);
  });

  it('UC01-08 search matches code, name or active ingredient; filter by category', async () => {
    await create();
    await create({
      ...paracetamol(),
      code: 'VITC',
      name: 'Vitamin C 500 mg',
      activeIngredient: 'Ascorbic acid',
      categoryId: otherCategoryId,
    });

    const byIngredient = await t
      .http()
      .get('/api/medicines?search=ascorbic')
      .set(as('manager'));
    expect(byIngredient.body.map((m: { code: string }) => m.code)).toEqual([
      'VITC',
    ]);

    const byCategory = await t
      .http()
      .get(`/api/medicines?categoryId=${categoryId}`)
      .set(as('manager'));
    expect(byCategory.body.map((m: { code: string }) => m.code)).toEqual([
      'PARA500',
    ]);
  });

  it('UC01-09 every role can read the catalogue; only the manager can change it (FR-39)', async () => {
    const { id } = await create();
    for (const user of ['pharmacist', 'cashier'] as const) {
      const list = await t.http().get('/api/medicines').set(as(user));
      expect(list.status).toBe(200);

      const edit = await t
        .http()
        .patch(`/api/medicines/${id}`)
        .set(as(user))
        .send({ currentPrice: 1 });
      expect(edit.status).toBe(403);
      const add = await t
        .http()
        .post('/api/medicines')
        .set(as(user))
        .send({ ...paracetamol(), code: 'X1' });
      expect(add.status).toBe(403);
    }
    const after = await t.http().get(`/api/medicines/${id}`).set(as('manager'));
    expect(after.body.currentPrice).toBe('1500.00');
  });

  it('UC01-10 an unknown category or unit is a field error', async () => {
    const res = await t
      .http()
      .post('/api/medicines')
      .set(as('manager'))
      .send({
        ...paracetamol(),
        categoryId: '00000000-0000-4000-8000-000000000000',
      });
    expect(res.status).toBe(400);
    expect(fieldsOf(res.body)).toEqual(['categoryId']);
  });
});
