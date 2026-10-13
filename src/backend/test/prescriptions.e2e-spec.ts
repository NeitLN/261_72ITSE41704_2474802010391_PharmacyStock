import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  Customer,
  type Medicine,
  Prescriber,
  Prescription,
  PrescriptionStatus,
} from '../src/entities/index.js';
import { FixedClock } from '../src/stock/clock.js';
import { createMedicine } from './e2e/fixtures.js';
import {
  as,
  createTestApp,
  resetDatabase,
  type TestApp,
} from './e2e/helpers.js';

/** UC05 take in a prescription and verify it, through the HTTP API. */
describe('UC05 prescriptions (e2e)', () => {
  // 10:00 on 13/10/2026 in Vietnam.
  const clock = new FixedClock(new Date('2026-10-13T03:00:00Z'));
  let t: TestApp;
  let medicine: Medicine;
  let adult: Customer;
  let prescriber: Prescriber;

  beforeAll(async () => {
    t = await createTestApp({ clock });
  });

  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    clock.set(new Date('2026-10-13T03:00:00Z'));
    await resetDatabase(t.dataSource);
    medicine = await createMedicine(t.dataSource);
    adult = await t.dataSource.getRepository(Customer).save({
      code: 'KH0001',
      fullName: 'Nguyen Van An',
      dateOfBirth: '1980-05-01',
      address: '10 Tran Hung Dao, District 5',
    });
    prescriber = await t.dataSource.getRepository(Prescriber).save({
      licenceNumber: 'CCHN-000101-HCM',
      fullName: 'Dr. Tran Van Quang',
      isActive: true,
    });
  });

  function body(over: Record<string, unknown> = {}) {
    return {
      referenceNumber: 'RX-0001',
      issuedDate: '2026-10-13',
      customerId: adult.id,
      prescriberId: prescriber.id,
      items: [
        {
          medicineId: medicine.id,
          strength: '500 mg',
          quantityPrescribed: 20,
          dose: '1 tablet twice a day',
          route: 'oral',
          daysOfUse: 10,
        },
      ],
      ...over,
    };
  }

  const create = (over: Record<string, unknown> = {}) =>
    t.http().post('/api/prescriptions').set(as('pharmacist')).send(body(over));

  const fields = (res: { body: { errors: { field: string }[] } }) =>
    res.body.errors.map((e) => e.field);

  it('UC05-01 TC-47: records a prescription as RECEIVED with valid-until computed (FR-14)', async () => {
    const res = await create({ validUntil: undefined });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      referenceNumber: 'RX-0001',
      issuedDate: '2026-10-13',
      validUntil: '2026-10-18',
      isExpired: false,
      status: 'received',
      verifiedBy: null,
      customer: { code: 'KH0001' },
      prescriber: { licenceNumber: 'CCHN-000101-HCM' },
    });
    expect(res.body.items).toEqual([
      expect.objectContaining({
        strength: '500 mg',
        quantityPrescribed: 20,
        quantityDispensed: 0,
        quantityOutstanding: 20,
        medicine: expect.objectContaining({ id: medicine.id }),
      }),
    ]);
  });

  it('UC05-02 refuses an issue date in the future and a client-sent valid-until', async () => {
    const future = await create({ issuedDate: '2026-10-14' });
    expect(future.status).toBe(400);
    expect(fields(future)).toEqual(['issuedDate']);

    const sent = await create({ validUntil: '2026-12-31' });
    expect(sent.status).toBe(400);
    expect(fields(sent)).toEqual(['validUntil']);
  });

  it('UC05-03 TC-47: refuses an item with a missing field or quantity of zero; nothing saved', async () => {
    const res = await create({
      items: [{ ...body().items[0], dose: '', quantityPrescribed: 0 }],
    });
    expect(res.status).toBe(400);
    expect(fields(res)).toEqual(
      expect.arrayContaining(['items.0.dose', 'items.0.quantityPrescribed']),
    );
    expect(await t.dataSource.getRepository(Prescription).count()).toBe(0);
  });

  it('UC05-04 refuses a duplicate prescription reference with 409', async () => {
    expect((await create()).status).toBe(201);
    const res = await create();
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_PRESCRIPTION_REFERENCE');
    expect(fields(res)).toEqual(['referenceNumber']);
  });

  it('UC05-05 DEC-03: a patient needs an address, and an age when no date of birth is known', async () => {
    const noAddress = await t.dataSource.getRepository(Customer).save({
      code: 'KH0002',
      fullName: 'No Address',
    });
    const res = await create({ customerId: noAddress.id });
    expect(res.status).toBe(400);
    expect(fields(res)).toEqual(['customerId', 'patientAgeYears']);

    await t.dataSource
      .getRepository(Customer)
      .update({ id: noAddress.id }, { address: '1 Le Loi' });
    const withAge = await create({
      customerId: noAddress.id,
      patientAgeYears: 40,
    });
    expect(withAge.status).toBe(201);
  });

  it('UC05-06 FR-13: a child under 72 months needs age in months, weight and the accompanying adult', async () => {
    const child = await t.dataSource.getRepository(Customer).save({
      code: 'KH0003',
      fullName: 'Le Minh Khoa',
      dateOfBirth: '2024-03-02',
      address: '5 Hai Ba Trung',
    });
    const missing = await create({ customerId: child.id });
    expect(missing.status).toBe(400);
    expect(fields(missing)).toEqual([
      'patientAgeMonths',
      'patientWeightKg',
      'accompanyingAdult',
    ]);

    const complete = await create({
      customerId: child.id,
      patientAgeMonths: 31,
      patientWeightKg: 13.5,
      accompanyingAdult: 'Le Thi Hoa (mother)',
    });
    expect(complete.status).toBe(201);
    expect(complete.body).toMatchObject({
      patientAgeMonths: 31,
      patientWeightKg: '13.50',
      accompanyingAdult: 'Le Thi Hoa (mother)',
    });
  });

  it('UC05-07 refuses a deactivated prescriber or medicine, per field', async () => {
    await t.dataSource
      .getRepository(Prescriber)
      .update({ id: prescriber.id }, { isActive: false });
    const inactiveMedicine = await createMedicine(t.dataSource, {
      isActive: false,
    });
    const res = await create({
      items: [
        body().items[0],
        { ...body().items[0], medicineId: inactiveMedicine.id },
      ],
    });
    expect(res.status).toBe(400);
    expect(fields(res)).toEqual(['prescriberId', 'items.1.medicineId']);
  });

  it('UC05-08 TC-58: a pharmacist verifies a prescription; it cannot be verified twice (FR-44)', async () => {
    const { id } = (await create()).body;
    const res = await t
      .http()
      .post(`/api/prescriptions/${id}/verify`)
      .set(as('pharmacist'))
      .send({ note: 'Dose and strength checked with the patient.' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'verified',
      verifiedBy: { fullName: expect.any(String) },
      verificationNote: 'Dose and strength checked with the patient.',
    });
    expect(res.body.verifiedAt).toBe('2026-10-13T03:00:00.000Z');

    const again = await t
      .http()
      .post(`/api/prescriptions/${id}/verify`)
      .set(as('pharmacist'))
      .send({});
    expect(again.status).toBe(422);
    expect(again.body.code).toBe('PRESCRIPTION_NOT_RECEIVED');
  });

  it('UC05-09 FR-44: editing a verified prescription returns it to RECEIVED and replaces the items', async () => {
    const { id } = (await create()).body;
    await t
      .http()
      .post(`/api/prescriptions/${id}/verify`)
      .set(as('pharmacist'))
      .send({});
    const res = await t
      .http()
      .put(`/api/prescriptions/${id}`)
      .set(as('pharmacist'))
      .send(body({ items: [{ ...body().items[0], quantityPrescribed: 10 }] }));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'received',
      verifiedBy: null,
      verifiedAt: null,
    });
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].quantityPrescribed).toBe(10);
  });

  it('UC05-10 BR07: a prescription that has been dispensed cannot be edited', async () => {
    const { id } = (await create()).body;
    await t.dataSource
      .getRepository(Prescription)
      .update({ id }, { status: PrescriptionStatus.PARTIALLY_DISPENSED });
    const res = await t
      .http()
      .put(`/api/prescriptions/${id}`)
      .set(as('pharmacist'))
      .send(body());
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('PRESCRIPTION_NOT_EDITABLE');
  });

  it('UC05-11 TC-38 BR10: a prescription past valid-until cannot be verified and shows as expired', async () => {
    const { id } = (await create()).body;
    clock.set(new Date('2026-10-18T16:30:00Z')); // 23:30 on 18/10 in Vietnam: still valid
    const list = await t.http().get('/api/prescriptions').set(as('pharmacist'));
    expect(list.body[0].isExpired).toBe(false);

    clock.set(new Date('2026-10-18T17:30:00Z')); // 00:30 on 19/10 in Vietnam
    const res = await t
      .http()
      .post(`/api/prescriptions/${id}/verify`)
      .set(as('pharmacist'))
      .send({});
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('PRESCRIPTION_EXPIRED');
    const after = await t
      .http()
      .get(`/api/prescriptions/${id}`)
      .set(as('pharmacist'));
    expect(after.body).toMatchObject({ isExpired: true, status: 'received' });
  });

  it('UC05-12 lists with search, status filter and item count', async () => {
    await create();
    await create({ referenceNumber: 'RX-0002' });
    const all = await t.http().get('/api/prescriptions').set(as('pharmacist'));
    expect(all.status).toBe(200);
    expect(all.body).toHaveLength(2);
    expect(all.body[0].itemCount).toBe(1);

    const search = await t
      .http()
      .get('/api/prescriptions?search=rx-0002')
      .set(as('pharmacist'));
    expect(
      search.body.map((p: { referenceNumber: string }) => p.referenceNumber),
    ).toEqual(['RX-0002']);

    const verified = await t
      .http()
      .get('/api/prescriptions?status=verified')
      .set(as('pharmacist'));
    expect(verified.body).toEqual([]);
  });

  it('UC05-13 TC-28: a cashier cannot read or record prescriptions; an unknown id is 404', async () => {
    const list = await t.http().get('/api/prescriptions').set(as('cashier'));
    expect(list.status).toBe(403);
    const post = await t
      .http()
      .post('/api/prescriptions')
      .set(as('cashier'))
      .send(body());
    expect(post.status).toBe(403);

    const missing = await t
      .http()
      .get('/api/prescriptions/9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f')
      .set(as('pharmacist'));
    expect(missing.status).toBe(404);
  });
});
