import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Permission, ROLE_PERMISSIONS, RoleCode } from '../src/auth/permissions.js';
import { FixedClock } from '../src/stock/clock.js';
import {
  as,
  createTestApp,
  resetDatabase,
  type TestApp,
} from './e2e/helpers.js';

type User = 'manager' | 'pharmacist' | 'cashier';
const ROLE_OF: Record<User, RoleCode> = {
  manager: RoleCode.MANAGER,
  pharmacist: RoleCode.PHARMACIST,
  cashier: RoleCode.CASHIER,
};

interface Route {
  method: 'get' | 'post' | 'put' | 'patch';
  /** `:name` is replaced by the id of the fixture of that name. */
  path: string;
  /** null: any signed-in user. */
  permission: Permission | null;
  /** A body that passes validation, so a refusal can only be the permission. */
  body?: () => object;
  /** Placeholder that stands for the last path segment in the route table (`:kind`). */
  kind?: string;
}

/**
 * TC-53 (FR-39, NFR-05): every role × every endpoint. Each call is sent with
 * a valid body and real ids, so the only reason left to refuse it is the
 * role: a role without the permission must get 403, and a role with it must
 * never get 401 or 403 (it may still get 400, 404, 409 or 422 for business
 * reasons). Add a row here with every new endpoint.
 */
describe('TC-53 role × endpoint matrix (e2e)', () => {
  const clock = new FixedClock(new Date('2026-10-13T03:00:00Z'));
  let t: TestApp;
  const ids: Record<string, string> = {};
  let unique = 0;
  const next = () => `${(unique += 1)}`;

  beforeAll(async () => {
    t = await createTestApp({ clock });
    await resetDatabase(t.dataSource);
    const http = (user: User) => ({
      post: (url: string, body: object = {}) =>
        t.http().post(url).set(as(user)).send(body),
    });
    const ref = await t.http().get('/api/medicines/reference-data').set(as('manager'));
    ids.category = ref.body.categories[0].id;
    ids.unit = ref.body.units[0].id;
    for (const name of ['medicine', 'medicine2']) {
      ids[name] = (await http('manager').post('/api/medicines', medicineBody())).body.id;
    }
    for (const name of ['supplier', 'supplier2']) {
      ids[name] = (await http('manager').post('/api/suppliers', supplierBody())).body.id;
    }
    const receipt = await http('manager').post('/api/goods-receipts', receiptBody(100));
    expect(receipt.status, JSON.stringify(receipt.body)).toBe(201);
    ids.receipt = receipt.body.id;
    ids.batch = receipt.body.lines[0].batch.id;
    ids.customer = (await http('pharmacist').post('/api/customers', customerBody())).body.id;
    for (const name of ['prescriber', 'prescriber2']) {
      ids[name] = (await http('pharmacist').post('/api/prescribers', prescriberBody())).body.id;
    }
    const rx = await http('pharmacist').post('/api/prescriptions', prescriptionBody());
    expect(rx.status, JSON.stringify(rx.body)).toBe(201);
    ids.prescription = rx.body.id;
    ids.prescriptionItem = rx.body.items[0].id;
    await http('pharmacist').post(`/api/prescriptions/${ids.prescription}/verify`, {});
    const sale = await http('cashier').post('/api/sales', saleBody());
    expect(sale.status, JSON.stringify(sale.body)).toBe(201);
    ids.sale = sale.body.id;
    ids.receiptNumber = sale.body.receiptNumber;
    const found = await t
      .http()
      .get(`/api/returns/sales/${ids.receiptNumber}`)
      .set(as('cashier'));
    expect(found.status, JSON.stringify(found.body)).toBe(200);
    ids.saleLine = found.body.lines[0].saleLineId;
    const ret = await http('cashier').post('/api/returns', {
      requestId: randomUUID(),
      saleId: ids.sale,
      reason: 'Matrix return',
      lines: [{ saleLineId: ids.saleLine, quantity: 1 }],
    });
    expect(ret.status, JSON.stringify(ret.body)).toBe(201);
    ids.return = ret.body.id;
    const take = await http('manager').post('/api/stock-takes', { medicineIds: [ids.medicine] });
    expect(take.status, JSON.stringify(take.body)).toBe(201);
    ids.stockTake = take.body.id;
    ids.stockTakeLine = take.body.lines[0].id;
    // A low-stock alert to acknowledge (UC10).
    await t.http().patch(`/api/medicines/${ids.medicine2}`).set(as('manager')).send({ reorderLevel: 5 });
    const [alert] = await t.dataSource.query<Array<{ id: string }>>(
      `SELECT id FROM stock_alerts WHERE medicine_id = $1`,
      [ids.medicine2],
    );
    ids.alert = alert.id;
  });

  afterAll(async () => {
    await t.app.close();
  });

  function medicineBody() {
    return {
      code: `MX${next()}`,
      name: 'Matrix medicine',
      categoryId: ids.category,
      baseUnitId: ids.unit,
      currentPrice: 1000,
      classification: 'otc',
      classificationSource: 'Label: OTC',
      classificationDate: '2026-10-01',
    };
  }
  function supplierBody() {
    return { name: `Matrix supplier ${next()}`, phone: '028 3855 1234' };
  }
  function receiptBody(quantity = 1) {
    return {
      supplierId: ids.supplier,
      documentNumber: `MX-${next()}`,
      receiptDate: '2026-10-13',
      lines: [
        {
          medicineId: ids.medicine,
          batchNumber: `MX${next()}`,
          expiryDate: '2027-06-30',
          quantity,
          unitCost: 800,
        },
      ],
    };
  }
  function customerBody() {
    return {
      fullName: 'Matrix Customer',
      phone: '0909 123 456',
      dateOfBirth: '1990-01-01',
      address: '1 Matrix Street',
    };
  }
  function prescriberBody() {
    return { licenceNumber: `CCHN-MX-${next()}`, fullName: 'Dr. Matrix' };
  }
  function prescriptionBody() {
    return {
      referenceNumber: `RX-MX-${next()}`,
      issuedDate: '2026-10-13',
      customerId: ids.customer,
      prescriberId: ids.prescriber,
      items: [
        {
          medicineId: ids.medicine,
          strength: '500 mg',
          quantityPrescribed: 20,
          dose: '1 tablet twice a day',
          route: 'oral',
          daysOfUse: 10,
        },
      ],
    };
  }
  function saleBody() {
    return { requestId: randomUUID(), otcLines: [{ medicineId: ids.medicine, quantity: 1 }] };
  }
  function previewBody() {
    return {
      prescriptionId: ids.prescription,
      items: [{ prescriptionItemId: ids.prescriptionItem, quantity: 1 }],
    };
  }
  function dispenseBody() {
    return { requestId: randomUUID(), ...previewBody() };
  }

  const P = Permission;
  const ROUTES: Route[] = [
    { method: 'get', path: '/api/auth/me', permission: null },
    // UC01
    { method: 'get', path: '/api/medicines', permission: P.STOCK_VIEW },
    { method: 'get', path: '/api/medicines/reference-data', permission: P.STOCK_VIEW },
    { method: 'get', path: '/api/medicines/:medicine', permission: P.STOCK_VIEW },
    { method: 'post', path: '/api/medicines', permission: P.CATALOGUE_MANAGE, body: medicineBody },
    { method: 'patch', path: '/api/medicines/:medicine', permission: P.CATALOGUE_MANAGE, body: () => ({ name: 'Renamed' }) },
    { method: 'post', path: '/api/medicines/:medicine2/deactivate', permission: P.CATALOGUE_MANAGE },
    { method: 'post', path: '/api/medicines/:medicine2/activate', permission: P.CATALOGUE_MANAGE },
    // UC04
    { method: 'get', path: '/api/stock', permission: P.STOCK_VIEW },
    { method: 'get', path: '/api/stock/medicines/:medicine', permission: P.STOCK_VIEW },
    { method: 'get', path: '/api/stock/batches/:batch/movements', permission: P.STOCK_VIEW },
    // UC02
    { method: 'get', path: '/api/suppliers', permission: P.SUPPLIER_MANAGE },
    { method: 'get', path: '/api/suppliers/:supplier', permission: P.SUPPLIER_MANAGE },
    { method: 'post', path: '/api/suppliers', permission: P.SUPPLIER_MANAGE, body: supplierBody },
    { method: 'patch', path: '/api/suppliers/:supplier', permission: P.SUPPLIER_MANAGE, body: () => ({ phone: '028 3855 9999' }) },
    { method: 'post', path: '/api/suppliers/:supplier2/deactivate', permission: P.SUPPLIER_MANAGE },
    { method: 'post', path: '/api/suppliers/:supplier2/activate', permission: P.SUPPLIER_MANAGE },
    // UC03
    { method: 'get', path: '/api/goods-receipts', permission: P.GOODS_RECEIPT_CREATE },
    { method: 'get', path: '/api/goods-receipts/:receipt', permission: P.GOODS_RECEIPT_CREATE },
    { method: 'post', path: '/api/goods-receipts', permission: P.GOODS_RECEIPT_CREATE, body: () => receiptBody() },
    // UC05 and its quick-create (UC14)
    { method: 'get', path: '/api/customers', permission: P.PRESCRIPTION_MANAGE },
    { method: 'get', path: '/api/customers/:customer', permission: P.PRESCRIPTION_MANAGE },
    { method: 'post', path: '/api/customers', permission: P.PRESCRIPTION_MANAGE, body: customerBody },
    { method: 'patch', path: '/api/customers/:customer', permission: P.PRESCRIPTION_MANAGE, body: () => ({ address: '2 Matrix Street' }) },
    { method: 'get', path: '/api/prescribers', permission: P.PRESCRIPTION_MANAGE },
    { method: 'get', path: '/api/prescribers/:prescriber', permission: P.PRESCRIPTION_MANAGE },
    { method: 'post', path: '/api/prescribers', permission: P.PRESCRIPTION_MANAGE, body: prescriberBody },
    { method: 'patch', path: '/api/prescribers/:prescriber', permission: P.PRESCRIPTION_MANAGE, body: () => ({ clinicName: 'Matrix Clinic' }) },
    { method: 'post', path: '/api/prescribers/:prescriber2/deactivate', permission: P.PRESCRIPTION_MANAGE },
    { method: 'post', path: '/api/prescribers/:prescriber2/activate', permission: P.PRESCRIPTION_MANAGE },
    { method: 'get', path: '/api/prescriptions', permission: P.PRESCRIPTION_MANAGE },
    { method: 'get', path: '/api/prescriptions/:prescription', permission: P.PRESCRIPTION_MANAGE },
    { method: 'post', path: '/api/prescriptions', permission: P.PRESCRIPTION_MANAGE, body: prescriptionBody },
    { method: 'put', path: '/api/prescriptions/:prescription', permission: P.PRESCRIPTION_MANAGE, body: prescriptionBody },
    { method: 'post', path: '/api/prescriptions/:prescription/verify', permission: P.PRESCRIPTION_MANAGE, body: () => ({ note: 'Checked.' }) },
    // UC06
    { method: 'post', path: '/api/dispensings/preview', permission: P.DISPENSE, body: previewBody },
    { method: 'post', path: '/api/dispensings', permission: P.DISPENSE, body: dispenseBody },
    // UC07
    { method: 'post', path: '/api/sales', permission: P.SALE_CREATE, body: saleBody },
    { method: 'get', path: '/api/sales/billable', permission: P.SALE_CREATE },
    { method: 'get', path: '/api/sales/:sale', permission: P.SALE_CREATE },
    // UC08
    { method: 'get', path: '/api/returns/sales/:receiptNumber', permission: P.RETURN_CREATE },
    { method: 'post', path: '/api/returns', permission: P.RETURN_CREATE, body: () => ({ requestId: randomUUID(), saleId: ids.sale, reason: 'Matrix', lines: [{ saleLineId: ids.saleLine, quantity: 1 }] }) },
    { method: 'get', path: '/api/returns/:return', permission: P.RETURN_CREATE },
    // UC09
    { method: 'get', path: '/api/stock-takes', permission: P.STOCK_TAKE_COUNT },
    { method: 'post', path: '/api/stock-takes', permission: P.STOCK_TAKE_APPROVE, body: () => ({ medicineIds: [ids.medicine] }) },
    { method: 'get', path: '/api/stock-takes/:stockTake', permission: P.STOCK_TAKE_COUNT },
    { method: 'put', path: '/api/stock-takes/:stockTake/lines/:stockTakeLine', permission: P.STOCK_TAKE_COUNT, body: () => ({ countedQuantity: 1, reason: 'Matrix' }) },
    { method: 'post', path: '/api/stock-takes/:stockTake/lines', permission: P.STOCK_TAKE_COUNT, body: () => ({ batchId: ids.batch }) },
    { method: 'post', path: '/api/stock-takes/:stockTake/submit', permission: P.STOCK_TAKE_COUNT },
    { method: 'post', path: '/api/stock-takes/:stockTake/approve', permission: P.STOCK_TAKE_APPROVE },
    { method: 'post', path: '/api/stock-takes/:stockTake/return', permission: P.STOCK_TAKE_APPROVE, body: () => ({ comment: 'Matrix' }) },
    { method: 'post', path: '/api/stock-takes/:stockTake/cancel', permission: P.STOCK_TAKE_APPROVE },
    // UC10, UC11
    { method: 'get', path: '/api/alerts', permission: P.ALERT_MANAGE },
    { method: 'post', path: '/api/alerts/:alert/acknowledge', permission: P.ALERT_MANAGE },
    { method: 'post', path: '/api/batches/:batch/status', permission: P.BATCH_STATUS_MANAGE, body: () => ({ status: 'on_hold', reason: 'Matrix' }) },
    { method: 'post', path: '/api/batches/:batch/write-off', permission: P.BATCH_STATUS_MANAGE, body: () => ({ reason: 'Matrix' }) },
    // UC10–UC12 reports
    { method: 'get', path: '/api/reports/stock-movement?from=2026-10-01&to=2026-10-13', permission: P.REPORT_VIEW, kind: ':kind' },
    { method: 'get', path: '/api/reports/low-stock', permission: P.ALERT_MANAGE, kind: ':kind' },
    { method: 'get', path: '/api/reports/expiry', permission: P.ALERT_MANAGE, kind: ':kind' },
    { method: 'get', path: '/api/reports/stock-movement/medicines/:medicine?from=2026-10-01&to=2026-10-13', permission: P.REPORT_VIEW },
    // UC16
    { method: 'post', path: '/api/auth/logout', permission: null },
  ];

  const resolve = (path: string) =>
    path.replace(/:([a-zA-Z0-9]+)/g, (_, name: string) => {
      if (!ids[name]) throw new Error(`No fixture named ${name}`);
      return ids[name];
    });

  const allowed = (user: User, permission: Permission | null) =>
    permission === null || ROLE_PERMISSIONS[ROLE_OF[user]].includes(permission);

  for (const user of ['manager', 'pharmacist', 'cashier'] as const) {
    describe(user, () => {
      for (const route of ROUTES) {
        const expected = allowed(user, route.permission) ? 'allowed' : 'refused';
        it(`${route.method.toUpperCase()} ${route.path} → ${expected}`, async () => {
          const req = t.http()[route.method](resolve(route.path)).set(as(user));
          const res = await (route.body ? req.send(route.body()) : req);
          if (expected === 'refused') {
            expect(res.status, JSON.stringify(res.body)).toBe(403);
          } else {
            expect([401, 403], JSON.stringify(res.body)).not.toContain(res.status);
            expect(res.status, JSON.stringify(res.body)).toBeLessThan(500);
          }
        });
      }
    });
  }

  it('#70: every route the API serves has a row here, and none is left out', async () => {
    const shape = (path: string) => path.split('?')[0].replace(/:[A-Za-z0-9]+/g, ':x');
    const served = new Set<string>();
    const server = t.app.getHttpAdapter().getInstance() as {
      _router?: { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> };
      router?: { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> };
    };
    for (const layer of (server.router ?? server._router)!.stack) {
      if (!layer.route) continue;
      for (const method of Object.keys(layer.route.methods)) {
        served.add(`${method.toUpperCase()} ${shape(layer.route.path)}`);
      }
    }
    const listed = new Set(
      ROUTES.map((r) => {
        const path = r.kind ? r.path.split('?')[0].replace(/[^/]+$/, r.kind) : r.path;
        return `${r.method.toUpperCase()} ${shape(path)}`;
      }),
    );
    listed.add('POST /api/auth/login'); // public: covered by TC-42
    listed.add('GET /api'); // public health check
    const missing = [...served].filter((r) => !listed.has(r)).sort();
    expect(missing).toEqual([]);
  });

  it('without a session every endpoint except sign-in is 401 (NFR-05)', async () => {
    for (const route of ROUTES) {
      const req = t.http()[route.method](resolve(route.path));
      const res = await (route.body ? req.send(route.body()) : req);
      expect(res.status, `${route.method} ${route.path}`).toBe(401);
    }
  });
});
