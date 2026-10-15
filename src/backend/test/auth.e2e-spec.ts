import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { hashPassword } from '../src/auth/passwords.js';
import { User } from '../src/entities/index.js';
import { seed } from '../src/seed/seed.js';
import { createTestApp, resetDatabase, type TestApp } from './e2e/helpers.js';

/** SEED_PASSWORD in vitest.config.e2e.ts. */
const PASSWORD = 'Test-password-1';
const BAD_CREDENTIALS = 'Incorrect username or password.';

describe('UC16 sign in and sign out (e2e, AUTH_MODE=jwt)', () => {
  let t: TestApp;
  const previousMode = process.env.AUTH_MODE;

  beforeAll(async () => {
    process.env.AUTH_MODE = 'jwt';
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(t.dataSource);
  });

  afterAll(async () => {
    process.env.AUTH_MODE = previousMode;
    await t.app.close();
  });

  async function signIn(username: string, password = PASSWORD) {
    return t.http().post('/api/auth/login').send({ username, password });
  }

  async function tokenFor(username: string): Promise<string> {
    const res = await signIn(username);
    expect(res.status).toBe(200);
    return res.body.accessToken as string;
  }

  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function lock(username: string): Promise<void> {
    await t.dataSource
      .getRepository(User)
      .update({ username }, { isActive: false });
  }

  it('UC16-01 FR-38: signs in with a seeded account and returns the token, expiry and permissions', async () => {
    const before = Date.now();
    const res = await signIn('pharmacist');

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      username: 'pharmacist',
      role: 'PHARMACIST',
      permissions: [
        'dispense',
        'prescription.manage',
        'stock.view',
        'stock_take.count',
      ],
    });
    const expiresAt = Date.parse(res.body.expiresAt);
    expect(expiresAt - before).toBeGreaterThanOrEqual(8 * 3600 * 1000 - 1000);
    expect(expiresAt - before).toBeLessThanOrEqual(8 * 3600 * 1000 + 5000);

    const user = await t.dataSource
      .getRepository(User)
      .findOneByOrFail({ username: 'pharmacist' });
    expect(user.lastLoginAt).not.toBeNull();
  });

  it('UC16-02 FR-38: the username is matched without regard to case', async () => {
    const res = await signIn('Manager');
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('manager');
  });

  it('UC16-03 TC-42 FR-38: a wrong password and an unknown username give the same answer', async () => {
    const wrong = await signIn('cashier', 'not-the-password');
    const unknown = await signIn('nobody', PASSWORD);

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body).toEqual({
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message: BAD_CREDENTIALS,
      errors: [],
    });
  });

  it('UC16-04 NFR-04: empty fields are reported next to each field', async () => {
    const res = await signIn('', '');

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        { field: 'username', message: 'Enter your username.' },
        { field: 'password', message: 'Enter your password.' },
      ]),
    );
  });

  it('UC16-05 TC-42 FR-40: a locked account cannot sign in, and only the right password learns it is locked', async () => {
    await lock('cashier');

    const right = await signIn('cashier');
    expect(right.status).toBe(401);
    expect(right.body.message).toBe('This account is locked. Ask the manager.');

    const wrong = await signIn('cashier', 'not-the-password');
    expect(wrong.body.message).toBe(BAD_CREDENTIALS);
  });

  it('UC16-06 FR-38: the token opens protected routes; without it they are refused', async () => {
    const token = await tokenFor('cashier');

    const me = await t.http().get('/api/auth/me').set(bearer(token));
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ username: 'cashier', role: 'CASHIER' });

    await t.http().get('/api/auth/me').expect(401);
    await t.http().get('/api/auth/me').set(bearer('not.a.token')).expect(401);
    await t
      .http()
      .get('/api/auth/me')
      .set({ Authorization: token })
      .expect(401);
  });

  it('UC16-07 NFR-05: the X-Dev-User switch is ignored when AUTH_MODE=jwt', async () => {
    await t
      .http()
      .get('/api/auth/me')
      .set({ 'X-Dev-User': 'manager' })
      .expect(401);
  });

  it('UC16-08 TC-43 FR-38: an expired token is refused', async () => {
    const user = await t.dataSource
      .getRepository(User)
      .findOneByOrFail({ username: 'manager' });
    const expired = await new JwtService({
      secret: process.env.JWT_SECRET,
    }).signAsync({ sub: user.id }, { expiresIn: -60 });

    const res = await t.http().get('/api/auth/me').set(bearer(expired));
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it('UC16-09 FR-40: locking an account ends its session on the next request', async () => {
    const token = await tokenFor('pharmacist');
    await lock('pharmacist');

    await t.http().get('/api/auth/me').set(bearer(token)).expect(401);
  });

  it('UC16-10 TC-28 FR-39: a cashier signed in for real cannot dispense or change suppliers (403)', async () => {
    const token = await tokenFor('cashier');

    // A well-formed body, so the request passes validation and reaches the
    // service, which checks the permission before looking anything up.
    const dispense = await t
      .http()
      .post('/api/dispensings')
      .set(bearer(token))
      .send({
        requestId: randomUUID(),
        prescriptionId: randomUUID(),
        items: [{ prescriptionItemId: randomUUID(), quantity: 1 }],
      });
    expect(dispense.status).toBe(403);
    expect(dispense.body.code).toBe('PERMISSION_DENIED');

    const supplier = await t
      .http()
      .post('/api/suppliers')
      .set(bearer(token))
      .send({ name: 'Should not exist', phone: '0901234567' });
    expect(supplier.status).toBe(403);
  });

  it('UC16-11: the health check and sign-in need no token; sign-out does', async () => {
    await t.http().get('/api').expect(200);
    await t.http().post('/api/auth/logout').expect(401);

    const token = await tokenFor('manager');
    await t.http().post('/api/auth/logout').set(bearer(token)).expect(204);
  });

  it('UC16-12 NFR-05: passwords are stored as bcrypt hashes with cost 10', async () => {
    const users = await t.dataSource.getRepository(User).find();
    expect(users.length).toBeGreaterThan(0);
    for (const user of users) {
      expect(user.passwordHash).toMatch(/^\$2[aby]\$10\$/);
      expect(user.passwordHash).not.toContain(PASSWORD);
    }
  });

  it('UC16-13: running the seed again keeps a password that was changed', async () => {
    await t.dataSource
      .getRepository(User)
      .update(
        { username: 'manager' },
        { passwordHash: await hashPassword('Changed-password-2') },
      );
    await seed(t.dataSource);

    expect((await signIn('manager')).status).toBe(401);
    expect((await signIn('manager', 'Changed-password-2')).status).toBe(200);
  });
});
