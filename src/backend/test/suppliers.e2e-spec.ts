import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  as,
  createTestApp,
  resetDatabase,
  type TestApp,
} from './e2e/helpers.js';

/** UC02 Manage suppliers through the HTTP API, on the e2e database. */
describe('UC02 suppliers (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(t.dataSource);
  });

  const valid = {
    name: '  Phano Pharma  ',
    phone: '028 3855 1234',
    address: '12 Nguyen Trai, District 1',
  };

  async function createSupplier(body: object = valid) {
    const res = await t
      .http()
      .post('/api/suppliers')
      .set(as('manager'))
      .send(body);
    expect(res.status).toBe(201);
    return res.body as { id: string };
  }

  it('UC02-01 a manager creates a supplier; text is trimmed', async () => {
    const res = await t
      .http()
      .post('/api/suppliers')
      .set(as('manager'))
      .send(valid);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Phano Pharma',
      phone: '028 3855 1234',
      isActive: true,
      contactPerson: null,
    });
  });

  it('UC02-02 missing name and phone are reported per field, nothing saved (3a, TC-46)', async () => {
    const res = await t
      .http()
      .post('/api/suppliers')
      .set(as('manager'))
      .send({ name: '   ', address: 'x' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
    const fields = res.body.errors.map((e: { field: string }) => e.field);
    expect(fields).toContain('name');
    expect(fields).toContain('phone');

    const list = await t.http().get('/api/suppliers').set(as('manager'));
    expect(list.body).toHaveLength(0);
  });

  it('UC02-03 a malformed phone number or e-mail is refused on its field', async () => {
    const res = await t
      .http()
      .post('/api/suppliers')
      .set(as('manager'))
      .send({ ...valid, phone: 'call me', email: 'not-an-email' });

    expect(res.status).toBe(400);
    const fields = res.body.errors.map((e: { field: string }) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['phone', 'email']));
  });

  it('UC02-04 an undeclared field is refused', async () => {
    const res = await t
      .http()
      .post('/api/suppliers')
      .set(as('manager'))
      .send({ ...valid, isActive: false });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('isActive');
  });

  it('UC02-05 edit changes only the fields sent; "" clears an optional field', async () => {
    const { id } = await createSupplier();

    const res = await t
      .http()
      .patch(`/api/suppliers/${id}`)
      .set(as('manager'))
      .send({ phone: '0909 123 456', address: '' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      name: 'Phano Pharma',
      phone: '0909 123 456',
      address: null,
    });
  });

  it('UC02-11 null for a required field is a field error, not a server error', async () => {
    const { id } = await createSupplier();
    const res = await t
      .http()
      .patch(`/api/suppliers/${id}`)
      .set(as('manager'))
      .send({ name: null, phone: null });

    expect(res.status).toBe(400);
    const fields = res.body.errors.map((e: { field: string }) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'phone']));
  });

  it('UC02-12 editing details leaves the active flag alone', async () => {
    const { id } = await createSupplier();
    await t.http().post(`/api/suppliers/${id}/deactivate`).set(as('manager'));

    const res = await t
      .http()
      .patch(`/api/suppliers/${id}`)
      .set(as('manager'))
      .send({ name: 'Renamed' });
    expect(res.body).toMatchObject({ name: 'Renamed', isActive: false });
  });

  it('UC02-06 a deactivated supplier leaves the default list and can be reactivated (1a)', async () => {
    const { id } = await createSupplier();
    await createSupplier({ name: 'Zuellig', phone: '028 1111 2222' });

    const off = await t
      .http()
      .post(`/api/suppliers/${id}/deactivate`)
      .set(as('manager'));
    expect(off.status).toBe(200);
    expect(off.body.isActive).toBe(false);

    const active = await t.http().get('/api/suppliers').set(as('manager'));
    expect(active.body.map((s: { name: string }) => s.name)).toEqual([
      'Zuellig',
    ]);

    const all = await t
      .http()
      .get('/api/suppliers?includeInactive=true')
      .set(as('manager'));
    expect(all.body).toHaveLength(2);

    const on = await t
      .http()
      .post(`/api/suppliers/${id}/activate`)
      .set(as('manager'));
    expect(on.body.isActive).toBe(true);
  });

  it('UC02-07 search matches name or phone, and % is taken literally', async () => {
    await createSupplier();
    await createSupplier({ name: 'Zuellig', phone: '0283 999 000' });

    const byName = await t
      .http()
      .get('/api/suppliers?search=phano')
      .set(as('manager'));
    expect(byName.body.map((s: { name: string }) => s.name)).toEqual([
      'Phano Pharma',
    ]);

    const byPhone = await t
      .http()
      .get('/api/suppliers?search=999')
      .set(as('manager'));
    expect(byPhone.body.map((s: { name: string }) => s.name)).toEqual([
      'Zuellig',
    ]);

    const wildcard = await t
      .http()
      .get('/api/suppliers?search=%25')
      .set(as('manager'));
    expect(wildcard.body).toHaveLength(0);
  });

  it('UC02-08 a pharmacist or cashier calling the API directly is refused (FR-39, TC-28)', async () => {
    const { id } = await createSupplier();

    for (const user of ['pharmacist', 'cashier'] as const) {
      const list = await t.http().get('/api/suppliers').set(as(user));
      expect(list.status).toBe(403);
      expect(list.body.code).toBe('PERMISSION_DENIED');

      const edit = await t
        .http()
        .patch(`/api/suppliers/${id}`)
        .set(as(user))
        .send({ name: 'Hacked' });
      expect(edit.status).toBe(403);
    }

    const after = await t.http().get(`/api/suppliers/${id}`).set(as('manager'));
    expect(after.body.name).toBe('Phano Pharma');
  });

  it('UC02-09 a request without a user is refused with 401', async () => {
    const res = await t.http().get('/api/suppliers');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it('UC02-10 a malformed id is a field error and an unknown id is 404', async () => {
    const bad = await t.http().get('/api/suppliers/123').set(as('manager'));
    expect(bad.status).toBe(400);
    expect(bad.body.errors[0].field).toBe('id');

    const missing = await t
      .http()
      .get('/api/suppliers/00000000-0000-4000-8000-000000000000')
      .set(as('manager'));
    expect(missing.status).toBe(404);
    expect(missing.body.code).toBe('NOT_FOUND');
  });
});
