import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  as,
  createTestApp,
  resetDatabase,
  type TestApp,
} from './e2e/helpers.js';

describe('Application (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
    await resetDatabase(t.dataSource);
  });

  afterAll(async () => {
    await t.app.close();
  });

  it('answers the public health check without a user', async () => {
    await t.http().get('/api').expect(200).expect('Hello World!');
  });

  it('reports who the caller is and the permissions of the role', async () => {
    const res = await t.http().get('/api/auth/me').set(as('cashier'));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ username: 'cashier', role: 'CASHIER' });
    expect(res.body.permissions).toEqual([
      'return.create',
      'sale.create',
      'stock.view',
    ]);
  });

  it('never sends a stack trace for an unknown route', async () => {
    const res = await t.http().get('/api/nope').set(as('manager'));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      statusCode: 404,
      code: 'HTTP_404',
      message: expect.any(String),
      errors: [],
    });
  });
});
