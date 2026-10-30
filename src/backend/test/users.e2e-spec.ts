import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuditLog, User } from '../src/entities/index.js';
import { createTestApp, resetDatabase, type TestApp } from './e2e/helpers.js';

/** SEED_PASSWORD in vitest.config.e2e.ts. */
const PASSWORD = 'Test-password-1';
const NEW_PASSWORD = 'Counter-2026';

/**
 * UC15 users, roles and the audit log (FR-40, FR-41), with real sign-in so a
 * lock or a role change is seen on the next request. One test per row of the
 * UC15 scenario table.
 */
describe('UC15 users, roles and audit log (e2e, AUTH_MODE=jwt)', () => {
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

  const signIn = (username: string, password = PASSWORD) =>
    t.http().post('/api/auth/login').send({ username, password });
  const tokenFor = async (username: string, password = PASSWORD) => {
    const res = await signIn(username, password);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    return res.body.accessToken as string;
  };
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const userId = async (username: string) =>
    (await t.dataSource.getRepository(User).findOneByOrFail({ username })).id;
  const entries = (action: string) =>
    t.dataSource.getRepository(AuditLog).find({
      where: { action },
      relations: { performedBy: true },
      order: { occurredAt: 'ASC' },
    });
  const newUser = (over: object = {}) => ({
    username: 'thu.nguyen',
    fullName: 'Nguyen Thi Thu',
    roleCode: 'PHARMACIST',
    password: NEW_PASSWORD,
    passwordConfirm: NEW_PASSWORD,
    ...over,
  });

  it('UC15-01 TC-44: the manager adds a pharmacist, who can sign in; the password is a bcrypt hash; it is logged', async () => {
    const m = await tokenFor('manager');
    const res = await t.http().post('/api/users').set(as(m)).send(newUser());
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body).toMatchObject({
      username: 'thu.nguyen',
      fullName: 'Nguyen Thi Thu',
      role: { code: 'PHARMACIST' },
      isActive: true,
    });
    expect(res.body.passwordHash).toBeUndefined();

    const signedIn = await signIn('thu.nguyen', NEW_PASSWORD);
    expect(signedIn.status).toBe(200);
    expect(signedIn.body.user.permissions).toContain('dispense');
    const stored = await t.dataSource.getRepository(User).findOneByOrFail({ username: 'thu.nguyen' });
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$10\$/);
    const [created] = await entries('user.created');
    expect(created).toMatchObject({ entityName: 'User', entityId: stored.id });
    expect(JSON.parse(created.details)).toEqual({ username: 'thu.nguyen', role: 'PHARMACIST' });
  });

  it('UC15-02 a username taken in another case, a short password and differing passwords are refused', async () => {
    const m = await tokenFor('manager');
    const taken = await t.http().post('/api/users').set(as(m)).send(newUser({ username: 'Pharmacist' }));
    expect(taken.status).toBe(409);
    expect(taken.body).toMatchObject({ code: 'USERNAME_TAKEN', errors: [{ field: 'username' }] });
    const short = await t.http().post('/api/users').set(as(m)).send(newUser({ password: 'Short-1', passwordConfirm: 'Short-1' }));
    expect(short.status).toBe(400);
    expect(short.body.errors.map((e: { field: string }) => e.field)).toContain('password');
    const differ = await t.http().post('/api/users').set(as(m)).send(newUser({ passwordConfirm: 'Something-else' }));
    expect(differ.status).toBe(400);
    expect(differ.body.errors[0].field).toBe('passwordConfirm');
    expect(await t.dataSource.getRepository(User).countBy({ username: 'thu.nguyen' })).toBe(0);
  });

  it('UC15-03 TC-44: a cashier made pharmacist gets the new permissions on the next request, without signing in again', async () => {
    const m = await tokenFor('manager');
    const c = await tokenFor('cashier');
    expect((await t.http().get('/api/prescriptions').set(as(c))).status).toBe(403);

    const res = await t.http().patch(`/api/users/${await userId('cashier')}`).set(as(m)).send({ roleCode: 'PHARMACIST' });
    expect(res.status).toBe(200);
    expect(res.body.role.code).toBe('PHARMACIST');
    expect((await t.http().get('/api/prescriptions').set(as(c))).status).toBe(200);
    const [changed] = await entries('user.role_changed');
    expect(JSON.parse(changed.details)).toEqual({ from: 'CASHIER', to: 'PHARMACIST' });
  });

  it('UC15-04 TC-44: a locked user is refused at once and at sign-in; unlocked, they sign in again', async () => {
    const m = await tokenFor('manager');
    const c = await tokenFor('cashier');
    const id = await userId('cashier');

    expect((await t.http().patch(`/api/users/${id}`).set(as(m)).send({ isActive: false })).status).toBe(200);
    expect((await t.http().get('/api/auth/me').set(as(c))).status).toBe(401);
    const locked = await signIn('cashier');
    expect(locked.status).toBe(401);
    expect(locked.body.message).toBe('This account is locked. Ask the manager.');

    expect((await t.http().patch(`/api/users/${id}`).set(as(m)).send({ isActive: true })).status).toBe(200);
    expect((await signIn('cashier')).status).toBe(200);
    expect(await entries('user.locked')).toHaveLength(1);
    expect(await entries('user.unlocked')).toHaveLength(1);
  });

  it('UC15-05 with one manager: locking themselves, changing their own role, or taking user.manage from Manager is refused', async () => {
    const m = await tokenFor('manager');
    const me = await userId('manager');

    const lockSelf = await t.http().patch(`/api/users/${me}`).set(as(m)).send({ isActive: false });
    expect(lockSelf.status).toBe(422);
    expect(lockSelf.body.code).toBe('LAST_USER_MANAGER');
    const demote = await t.http().patch(`/api/users/${me}`).set(as(m)).send({ roleCode: 'CASHIER' });
    expect(demote.body.code).toBe('LAST_USER_MANAGER');
    const roles = (await t.http().get('/api/roles').set(as(m))).body;
    const managerPerms: string[] = roles.roles.find((r: { code: string }) => r.code === 'MANAGER').permissions;
    const strip = await t
      .http()
      .put('/api/roles/MANAGER/permissions')
      .set(as(m))
      .send({ permissions: managerPerms.filter((p) => p !== 'user.manage') });
    expect(strip.status).toBe(422);
    expect(strip.body.code).toBe('LAST_USER_MANAGER');

    expect((await t.http().get('/api/users').set(as(m))).status).toBe(200);
    expect(await t.dataSource.getRepository(AuditLog).countBy({ action: 'user.locked' })).toBe(0);
  });

  it('UC15-06 a reset password replaces the old one; the log holds no password', async () => {
    const m = await tokenFor('manager');
    const res = await t
      .http()
      .post(`/api/users/${await userId('pharmacist')}/password`)
      .set(as(m))
      .send({ password: NEW_PASSWORD, passwordConfirm: NEW_PASSWORD });
    expect(res.status).toBe(204);
    expect((await signIn('pharmacist')).status).toBe(401);
    expect((await signIn('pharmacist', NEW_PASSWORD)).status).toBe(200);
    const [reset] = await entries('user.password_reset');
    expect(reset.details).not.toContain(NEW_PASSWORD);
    expect(reset.details).not.toMatch(/\$2[aby]\$/);
  });

  it('UC15-07 taking stock.view from the cashier role takes effect at once, and giving it back restores it', async () => {
    const m = await tokenFor('manager');
    const c = await tokenFor('cashier');
    expect((await t.http().get('/api/stock').set(as(c))).status).toBe(200);

    const off = await t.http().put('/api/roles/CASHIER/permissions').set(as(m)).send({ permissions: ['sale.create', 'return.create'] });
    expect(off.status).toBe(200);
    expect(off.body).toMatchObject({ code: 'CASHIER', permissions: ['return.create', 'sale.create'] });
    expect((await t.http().get('/api/stock').set(as(c))).status).toBe(403);

    await t.http().put('/api/roles/CASHIER/permissions').set(as(m)).send({ permissions: ['sale.create', 'return.create', 'stock.view'] });
    expect((await t.http().get('/api/stock').set(as(c))).status).toBe(200);
    const changes = await entries('role.permissions_changed');
    expect(changes.map((e) => JSON.parse(e.details))).toEqual([
      { role: 'CASHIER', added: [], removed: ['stock.view'] },
      { role: 'CASHIER', added: ['stock.view'], removed: [] },
    ]);
    const unknown = await t.http().put('/api/roles/CASHIER/permissions').set(as(m)).send({ permissions: ['sale.create', 'fly'] });
    expect(unknown.status).toBe(400);
  });

  it('UC15-08 FR-41: sign-in, a failed sign-in and sign-out are logged; the failure keeps the username, not the password', async () => {
    const p = await tokenFor('pharmacist');
    await signIn('pharmacist', 'Wrong-password-9');
    await signIn('ghost', 'Wrong-password-9');
    expect((await t.http().post('/api/auth/logout').set(as(p))).status).toBe(204);

    expect((await entries('auth.login')).map((e) => e.performedBy?.username)).toEqual(['pharmacist']);
    const failed = await entries('auth.login_failed');
    expect(failed.map((e) => JSON.parse(e.details))).toEqual([
      { username: 'pharmacist', why: 'wrong password' },
      { username: 'ghost', why: 'unknown user' },
    ]);
    expect(failed.every((e) => e.performedBy === null)).toBe(true);
    expect(failed.some((e) => e.details.includes('Wrong-password-9'))).toBe(false);
    expect((await entries('auth.logout')).map((e) => e.performedBy?.username)).toEqual(['pharmacist']);

    const m = await tokenFor('manager');
    const log = await t.http().get('/api/audit-logs').set(as(m)).query({ action: 'auth.login_failed' });
    expect(log.status).toBe(200);
    expect(log.body.total).toBe(2);
    expect(log.body.items[0]).toMatchObject({ action: 'auth.login_failed', details: { username: 'ghost', why: 'unknown user' }, performedBy: null });
  });

  it('UC15-09 approving a stock take writes one stock_take.approved entry', async () => {
    const m = await tokenFor('manager');
    const p = await tokenFor('pharmacist');
    const ref = await t.http().get('/api/medicines/reference-data').set(as(m));
    const med = await t.http().post('/api/medicines').set(as(m)).send({
      code: 'AUD1', name: 'Audit medicine', categoryId: ref.body.categories[0].id, baseUnitId: ref.body.units[0].id,
      currentPrice: 1000, classification: 'otc', classificationSource: 'Label', classificationDate: '2026-10-01',
    });
    const sup = await t.http().post('/api/suppliers').set(as(m)).send({ name: 'Audit supplier', phone: '028 3855 1234' });
    await t.http().post('/api/goods-receipts').set(as(m)).send({
      supplierId: sup.body.id, documentNumber: 'AUD-1', receiptDate: '2026-10-13',
      lines: [{ medicineId: med.body.id, batchNumber: 'AUD-B', expiryDate: '2027-06-30', quantity: 5, unitCost: 800 }],
    });
    const take = await t.http().post('/api/stock-takes').set(as(m)).send({ medicineIds: [med.body.id] });
    await t.http().put(`/api/stock-takes/${take.body.id}/lines/${take.body.lines[0].id}`).set(as(p)).send({ countedQuantity: 4, reason: 'One box missing' });
    await t.http().post(`/api/stock-takes/${take.body.id}/submit`).set(as(p));
    expect((await t.http().post(`/api/stock-takes/${take.body.id}/approve`).set(as(m))).status).toBe(201);

    const [approved] = await entries('stock_take.approved');
    expect(approved).toMatchObject({ entityName: 'StockTake', entityId: take.body.id });
    expect(JSON.parse(approved.details)).toMatchObject({ referenceNumber: take.body.referenceNumber, adjustments: 1 });
  });

  it('UC15-10 TC-53: a pharmacist or a cashier can use none of the UC15 routes', async () => {
    const id = await userId('cashier');
    for (const who of ['pharmacist', 'cashier']) {
      const tok = await tokenFor(who);
      expect((await t.http().get('/api/users').set(as(tok))).status).toBe(403);
      expect((await t.http().post('/api/users').set(as(tok)).send(newUser())).status).toBe(403);
      expect((await t.http().patch(`/api/users/${id}`).set(as(tok)).send({ fullName: 'Changed' })).status).toBe(403);
      expect((await t.http().get('/api/roles').set(as(tok))).status).toBe(403);
      expect((await t.http().get('/api/audit-logs').set(as(tok))).status).toBe(403);
    }
  });

  it('UC15-11 two managers locking each other at once: one succeeds, one is refused, one active manager remains', async () => {
    const m = await tokenFor('manager');
    await t.http().post('/api/users').set(as(m)).send(newUser({ username: 'second.manager', roleCode: 'MANAGER' }));
    const m2 = await tokenFor('second.manager', NEW_PASSWORD);
    const [first, second] = [await userId('manager'), await userId('second.manager')];

    const results = await Promise.all([
      t.http().patch(`/api/users/${second}`).set(as(m)).send({ isActive: false }),
      t.http().patch(`/api/users/${first}`).set(as(m2)).send({ isActive: false }),
    ]);
    const statuses = results.map((r) => r.status);
    // The loser is either refused by the rule (422) or, when the winner's lock
    // committed first, no longer signed in at all (401).
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(statuses.filter((s) => s === 422 || s === 401)).toHaveLength(1);
    const active = await t.dataSource.getRepository(User).find({ where: { isActive: true }, relations: { role: true } });
    expect(active.filter((u) => u.role.code === 'MANAGER')).toHaveLength(1);
  });
});
