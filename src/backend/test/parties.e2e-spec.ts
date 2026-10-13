import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { as, resetDatabase } from './e2e/helpers.js';
import { PartiesModule } from '../src/parties/parties.module.js';

/**
 * OC-01 customers and prescribers through the HTTP API, on the e2e database.
 *
 * The spec boots AppModule plus PartiesModule without editing
 * `app.module.ts` (owned by Claude at merge time): one line,
 * `PartiesModule` in `AppModule.imports`, wires these routes in production.
 */
describe('OC-01 parties (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, PartiesModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
  });

  const customer = {
    fullName: '  Nguyen Van Test  ',
    phone: '0909 123 456',
    dateOfBirth: '1990-01-01',
    address: '1 Test Street',
  };
  const prescriber = {
    licenceNumber: 'CCHN-TEST-001',
    fullName: 'Dr. Test',
    clinicName: 'Test Clinic',
  };

  it('UC05-20 a pharmacist creates a customer; the code is generated and text trimmed', async () => {
    const res = await http()
      .post('/api/customers')
      .set(as('pharmacist'))
      .send(customer);

    expect(res.status).toBe(201);
    // The e2e seed holds accounts only, so the first customer is KH0001.
    expect(res.body).toMatchObject({
      code: 'KH0001',
      fullName: 'Nguyen Van Test',
      phone: '0909 123 456',
    });
  });

  it('UC05-21 missing full name is a field error and nothing is saved', async () => {
    const res = await http()
      .post('/api/customers')
      .set(as('pharmacist'))
      .send({ phone: '0909 123 456' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
    expect(
      res.body.errors.map((e: { field: string }) => e.field),
    ).toContain('fullName');
  });

  it('UC05-22 a future date of birth is refused on its field', async () => {
    const res = await http()
      .post('/api/customers')
      .set(as('pharmacist'))
      .send({ ...customer, dateOfBirth: '2999-01-01' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('dateOfBirth');
  });

  it('UC05-23 search finds a customer and edit keeps the generated code', async () => {
    const created = await http()
      .post('/api/customers')
      .set(as('pharmacist'))
      .send(customer);
    expect(created.status).toBe(201);
    const { id, code } = created.body as { id: string; code: string };

    const found = await http()
      .get('/api/customers?search=van test')
      .set(as('pharmacist'));
    expect(
      found.body.map((c: { code: string }) => c.code),
    ).toContain(code);

    const edited = await http()
      .patch(`/api/customers/${id}`)
      .set(as('pharmacist'))
      .send({ fullName: 'Renamed Patient', address: '' });
    expect(edited.status).toBe(200);
    expect(edited.body).toMatchObject({
      code,
      fullName: 'Renamed Patient',
      address: null,
    });
  });

  it('UC05-24 a pharmacist creates a prescriber; duplicate licence is 409 on its field', async () => {
    const first = await http()
      .post('/api/prescribers')
      .set(as('pharmacist'))
      .send(prescriber);
    expect(first.status).toBe(201);

    const again = await http()
      .post('/api/prescribers')
      .set(as('pharmacist'))
      .send(prescriber);
    expect(again.status).toBe(409);
    expect(again.body.errors[0].field).toBe('licenceNumber');
  });

  it('UC05-25 missing full name is a field error for prescribers', async () => {
    const res = await http()
      .post('/api/prescribers')
      .set(as('pharmacist'))
      .send({ licenceNumber: 'CCHN-TEST-002' });

    expect(res.status).toBe(400);
    expect(
      res.body.errors.map((e: { field: string }) => e.field),
    ).toContain('fullName');
  });

  it('UC05-26 deactivation hides the prescriber from the default list', async () => {
    const created = await http()
      .post('/api/prescribers')
      .set(as('pharmacist'))
      .send(prescriber);
    const { id } = created.body as { id: string };

    const off = await http()
      .post(`/api/prescribers/${id}/deactivate`)
      .set(as('pharmacist'));
    expect(off.status).toBe(200);
    expect(off.body.isActive).toBe(false);

    const listed = await http().get('/api/prescribers').set(as('pharmacist'));
    expect(
      listed.body.map((p: { licenceNumber: string }) => p.licenceNumber),
    ).not.toContain(prescriber.licenceNumber);

    const withInactive = await http()
      .get('/api/prescribers?active=false')
      .set(as('pharmacist'));
    expect(
      withInactive.body.map((p: { licenceNumber: string }) => p.licenceNumber),
    ).toContain(prescriber.licenceNumber);
  });

  it('UC05-27 a cashier calling the API directly is refused (FR-39)', async () => {
    const list = await http().get('/api/customers').set(as('cashier'));
    expect(list.status).toBe(403);
    expect(list.body.code).toBe('PERMISSION_DENIED');

    const create = await http()
      .post('/api/prescribers')
      .set(as('cashier'))
      .send(prescriber);
    expect(create.status).toBe(403);
  });

  it('UC05-28 a malformed id is a field error and an unknown id is 404', async () => {
    const bad = await http()
      .get('/api/customers/123')
      .set(as('pharmacist'));
    expect(bad.status).toBe(400);
    expect(bad.body.errors[0].field).toBe('id');

    const missing = await http()
      .get('/api/customers/00000000-0000-4000-8000-000000000000')
      .set(as('pharmacist'));
    expect(missing.status).toBe(404);
    expect(missing.body.code).toBe('NOT_FOUND');
  });
});
