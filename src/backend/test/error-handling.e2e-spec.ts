import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FixedClock } from '../src/stock/clock.js';
import {
  as,
  createTestApp,
  resetDatabase,
  type TestApp,
} from './e2e/helpers.js';

type Role = 'manager' | 'pharmacist' | 'cashier';
type Method = 'post' | 'patch' | 'put';

/** Ids made in `beforeAll`, used to build the bodies of each row. */
interface Ids {
  categoryId: string;
  unitId: string;
  supplierId: string;
  medicineId: string;
  customerId: string;
  prescriberId: string;
  prescriptionId: string;
  itemId: string;
}

/**
 * One row of the endpoint × invalid-input table in
 * docs/design/error-handling.md. Every endpoint that writes is listed.
 */
interface Row {
  endpoint: string;
  method: Method;
  path: (ids: Ids) => string;
  role: Role;
  forbidden: Role;
  /** A body the endpoint accepts; sent with the forbidden role it must be 403. */
  valid: (ids: Ids) => object;
  /** A body with required fields left out (or null on an update). */
  missing: object | null;
  missingFields: string[];
  /** A body with values of the wrong type or format. */
  wrongType: (ids: Ids) => object;
  wrongTypeFields: string[];
  /** An id that does not exist: in the path (404) or in the body (400 on the field). */
  unknown: {
    path?: (ids: Ids) => string;
    body?: (ids: Ids) => object;
    field?: string;
  };
}

const NOBODY = '00000000-0000-4000-8000-000000000000';

const item = (ids: Ids, overrides: object = {}) => ({
  medicineId: ids.medicineId,
  strength: '500 mg',
  quantityPrescribed: 2,
  dose: '1 tablet twice a day',
  route: 'oral',
  daysOfUse: 5,
  ...overrides,
});
const prescription = (ids: Ids, overrides: object = {}) => ({
  referenceNumber: `ERR-${randomUUID().slice(0, 8)}`,
  issuedDate: '2026-10-20',
  customerId: ids.customerId,
  prescriberId: ids.prescriberId,
  items: [item(ids)],
  ...overrides,
});
const receiptLine = (ids: Ids, overrides: object = {}) => ({
  medicineId: ids.medicineId,
  batchNumber: 'ERR-B1',
  expiryDate: '2027-06-30',
  quantity: 5,
  unitCost: 800,
  ...overrides,
});

const ROWS: Row[] = [
  {
    endpoint: 'POST /suppliers',
    method: 'post',
    path: () => '/api/suppliers',
    role: 'manager',
    forbidden: 'pharmacist',
    valid: () => ({ name: 'Err Supplier', phone: '028 3855 0000' }),
    missing: {},
    missingFields: ['name', 'phone'],
    wrongType: () => ({ name: 5, phone: 12345678 }),
    wrongTypeFields: ['name', 'phone'],
    unknown: {},
  },
  {
    endpoint: 'PATCH /suppliers/:id',
    method: 'patch',
    path: (ids) => `/api/suppliers/${ids.supplierId}`,
    role: 'manager',
    forbidden: 'cashier',
    valid: () => ({ address: '1 Le Loi, District 1' }),
    missing: { name: null },
    missingFields: ['name'],
    wrongType: () => ({ email: 5 }),
    wrongTypeFields: ['email'],
    unknown: { path: () => `/api/suppliers/${NOBODY}` },
  },
  {
    endpoint: 'POST /medicines',
    method: 'post',
    path: () => '/api/medicines',
    role: 'manager',
    forbidden: 'pharmacist',
    valid: (ids) => ({
      code: 'ERRMED2',
      name: 'Error medicine 2',
      categoryId: ids.categoryId,
      baseUnitId: ids.unitId,
      currentPrice: 1000,
    }),
    missing: {},
    missingFields: ['baseUnitId', 'categoryId', 'code', 'currentPrice', 'name'],
    wrongType: (ids) => ({
      code: 'ERRMED3',
      name: 'Error medicine 3',
      categoryId: 'x',
      baseUnitId: ids.unitId,
      currentPrice: 'ten',
    }),
    wrongTypeFields: ['categoryId', 'currentPrice'],
    unknown: {
      body: (ids) => ({
        code: 'ERRMED4',
        name: 'Error medicine 4',
        categoryId: NOBODY,
        baseUnitId: ids.unitId,
        currentPrice: 1000,
      }),
      field: 'categoryId',
    },
  },
  {
    endpoint: 'PATCH /medicines/:id',
    method: 'patch',
    path: (ids) => `/api/medicines/${ids.medicineId}`,
    role: 'manager',
    forbidden: 'cashier',
    valid: () => ({ reorderLevel: 10 }),
    missing: { name: null },
    missingFields: ['name'],
    wrongType: () => ({ reorderLevel: 'ten' }),
    wrongTypeFields: ['reorderLevel'],
    unknown: { path: () => `/api/medicines/${NOBODY}` },
  },
  {
    endpoint: 'POST /goods-receipts',
    method: 'post',
    path: () => '/api/goods-receipts',
    role: 'manager',
    forbidden: 'cashier',
    valid: (ids) => ({
      supplierId: ids.supplierId,
      documentNumber: 'ERR-HD-1',
      receiptDate: '2026-10-20',
      lines: [receiptLine(ids)],
    }),
    missing: {},
    missingFields: ['documentNumber', 'lines', 'receiptDate', 'supplierId'],
    wrongType: (ids) => ({
      supplierId: ids.supplierId,
      documentNumber: 'ERR-HD-2',
      receiptDate: '20/10/2026',
      lines: [receiptLine(ids, { quantity: 'ten' })],
    }),
    wrongTypeFields: ['lines.0.quantity', 'receiptDate'],
    unknown: {
      body: (ids) => ({
        supplierId: ids.supplierId,
        documentNumber: 'ERR-HD-3',
        receiptDate: '2026-10-20',
        lines: [receiptLine(ids, { medicineId: NOBODY })],
      }),
      field: 'lines.0.medicineId',
    },
  },
  {
    endpoint: 'POST /customers',
    method: 'post',
    path: () => '/api/customers',
    role: 'pharmacist',
    forbidden: 'cashier',
    valid: () => ({ fullName: 'Tran Thi Binh' }),
    missing: {},
    missingFields: ['fullName'],
    wrongType: () => ({ fullName: 'Tran Thi Binh', dateOfBirth: 'yesterday' }),
    wrongTypeFields: ['dateOfBirth'],
    unknown: {},
  },
  {
    endpoint: 'POST /prescribers',
    method: 'post',
    path: () => '/api/prescribers',
    role: 'pharmacist',
    forbidden: 'cashier',
    valid: () => ({ licenceNumber: 'CCHN-ERR-2', fullName: 'Dr. Le Van Hai' }),
    missing: {},
    missingFields: ['fullName', 'licenceNumber'],
    wrongType: () => ({ licenceNumber: 5, fullName: 'Dr. Le Van Hai' }),
    wrongTypeFields: ['licenceNumber'],
    unknown: {},
  },
  {
    endpoint: 'POST /prescriptions',
    method: 'post',
    path: () => '/api/prescriptions',
    role: 'pharmacist',
    forbidden: 'cashier',
    valid: (ids) => prescription(ids),
    missing: {},
    missingFields: [
      'customerId',
      'issuedDate',
      'items',
      'prescriberId',
      'referenceNumber',
    ],
    wrongType: (ids) =>
      prescription(ids, {
        issuedDate: 'today',
        items: [item(ids, { quantityPrescribed: 'ten' })],
      }),
    wrongTypeFields: ['issuedDate', 'items.0.quantityPrescribed'],
    unknown: {
      body: (ids) => prescription(ids, { customerId: NOBODY }),
      field: 'customerId',
    },
  },
  {
    endpoint: 'PUT /prescriptions/:id',
    method: 'put',
    path: (ids) => `/api/prescriptions/${ids.prescriptionId}`,
    role: 'pharmacist',
    forbidden: 'cashier',
    valid: (ids) => prescription(ids),
    missing: {},
    missingFields: [
      'customerId',
      'issuedDate',
      'items',
      'prescriberId',
      'referenceNumber',
    ],
    wrongType: (ids) =>
      prescription(ids, { items: [item(ids, { daysOfUse: 2.5 })] }),
    wrongTypeFields: ['items.0.daysOfUse'],
    unknown: { path: () => `/api/prescriptions/${NOBODY}` },
  },
  {
    endpoint: 'POST /prescriptions/:id/verify',
    method: 'post',
    path: (ids) => `/api/prescriptions/${ids.prescriptionId}/verify`,
    role: 'pharmacist',
    forbidden: 'cashier',
    valid: () => ({}),
    missing: null,
    missingFields: [],
    wrongType: () => ({ note: 5 }),
    wrongTypeFields: ['note'],
    unknown: { path: () => `/api/prescriptions/${NOBODY}/verify` },
  },
  {
    endpoint: 'POST /dispensings/preview',
    method: 'post',
    path: () => '/api/dispensings/preview',
    role: 'pharmacist',
    forbidden: 'cashier',
    valid: (ids) => ({
      prescriptionId: ids.prescriptionId,
      items: [{ prescriptionItemId: ids.itemId, quantity: 1 }],
    }),
    missing: {},
    missingFields: ['items', 'prescriptionId'],
    wrongType: () => ({
      prescriptionId: 'x',
      items: [{ prescriptionItemId: 'y', quantity: 'ten' }],
    }),
    wrongTypeFields: [
      'items.0.prescriptionItemId',
      'items.0.quantity',
      'prescriptionId',
    ],
    unknown: {
      body: (ids) => ({
        prescriptionId: NOBODY,
        items: [{ prescriptionItemId: ids.itemId, quantity: 1 }],
      }),
      field: 'prescriptionId',
    },
  },
  {
    endpoint: 'POST /dispensings',
    method: 'post',
    path: () => '/api/dispensings',
    role: 'pharmacist',
    forbidden: 'cashier',
    valid: (ids) => ({
      requestId: randomUUID(),
      prescriptionId: ids.prescriptionId,
      items: [{ prescriptionItemId: ids.itemId, quantity: 1 }],
    }),
    missing: {},
    missingFields: ['items', 'prescriptionId', 'requestId'],
    wrongType: (ids) => ({
      requestId: 'r',
      prescriptionId: ids.prescriptionId,
      items: [{ prescriptionItemId: ids.itemId, quantity: -1 }],
    }),
    wrongTypeFields: ['items.0.quantity', 'requestId'],
    unknown: {
      body: (ids) => ({
        requestId: randomUUID(),
        prescriptionId: ids.prescriptionId,
        items: [{ prescriptionItemId: NOBODY, quantity: 1 }],
      }),
      field: 'items.0.prescriptionItemId',
    },
  },
  {
    endpoint: 'POST /sales',
    method: 'post',
    path: () => '/api/sales',
    role: 'cashier',
    forbidden: 'pharmacist',
    valid: (ids) => ({
      requestId: randomUUID(),
      otcLines: [{ medicineId: ids.medicineId, quantity: 1 }],
    }),
    missing: {},
    missingFields: ['otcLines', 'requestId'],
    wrongType: (ids) => ({
      requestId: randomUUID(),
      otcLines: [{ medicineId: ids.medicineId, quantity: 'one' }],
    }),
    wrongTypeFields: ['otcLines.0.quantity'],
    unknown: {
      body: () => ({
        requestId: randomUUID(),
        otcLines: [{ medicineId: NOBODY, quantity: 1 }],
      }),
      field: 'otcLines.0.medicineId',
    },
  },
];

/**
 * Consistent error handling (#47): the endpoint × invalid-input table of
 * docs/design/error-handling.md, one test per cell (ERR-01…06 here; the
 * database cells ERR-07…10 are unit tests of the filter).
 */
describe('Error handling, endpoint × invalid input (e2e)', () => {
  const clock = new FixedClock(new Date('2026-10-20T03:00:00Z'));
  let t: TestApp;
  const ids = {} as Ids;

  beforeAll(async () => {
    t = await createTestApp({ clock });
    await resetDatabase(t.dataSource);
    const post = async (path: string, role: Role, body: object) => {
      const res = await t.http().post(path).set(as(role)).send(body);
      expect(res.status, `${path} ${JSON.stringify(res.body)}`).toBeLessThan(
        300,
      );
      return res.body;
    };
    const ref = (
      await t.http().get('/api/medicines/reference-data').set(as('manager'))
    ).body;
    ids.categoryId = ref.categories[0].id;
    ids.unitId = ref.units[0].id;
    ids.supplierId = (
      await post('/api/suppliers', 'manager', {
        name: 'Phano Pharma',
        phone: '028 3855 1234',
      })
    ).id;
    ids.medicineId = (
      await post('/api/medicines', 'manager', {
        code: 'ERRMED1',
        name: 'Error medicine 1',
        categoryId: ids.categoryId,
        baseUnitId: ids.unitId,
        classification: 'otc',
        classificationSource: 'Package label',
        classificationDate: '2026-10-01',
        currentPrice: 1500,
      })
    ).id;
    ids.customerId = (
      await post('/api/customers', 'pharmacist', {
        fullName: 'Nguyen Van An',
        dateOfBirth: '1980-05-01',
        address: '10 Tran Hung Dao, District 5',
      })
    ).id;
    ids.prescriberId = (
      await post('/api/prescribers', 'pharmacist', {
        licenceNumber: 'CCHN-ERR-1',
        fullName: 'Dr. Tran Van Quang',
      })
    ).id;
    const rx = await post(
      '/api/prescriptions',
      'pharmacist',
      prescription(ids),
    );
    ids.prescriptionId = rx.id;
    ids.itemId = rx.items[0].id;
    // Verified, so a dispensing reaches the item checks.
    await post(`/api/prescriptions/${rx.id}/verify`, 'pharmacist', {});
  });

  afterAll(async () => {
    await t.app.close();
  });

  const send = (
    row: Row,
    body: object | string,
    role: Role | null = row.role,
    path = row.path(ids),
  ) => {
    let req = t.http()[row.method](path);
    if (role) req = req.set(as(role));
    if (typeof body === 'string')
      req = req.set('Content-Type', 'application/json');
    return req.send(body);
  };
  const fields = (body: { errors: Array<{ field: string }> }) =>
    body.errors.map((e) => e.field).sort();

  describe.each(ROWS)('$endpoint', (row) => {
    it.skipIf(row.missing === null)(
      'ERR-01 a missing field is 400 with one message per field',
      async () => {
        const res = await send(row, row.missing!);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('VALIDATION_FAILED');
        expect(fields(res.body)).toEqual(row.missingFields);
      },
    );

    it('ERR-02 a value of the wrong type or format is 400 on its field', async () => {
      const res = await send(row, row.wrongType(ids));
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(fields(res.body)).toEqual(row.wrongTypeFields);
    });

    it('ERR-03 a body that is not JSON is 400 VALIDATION_FAILED', async () => {
      const res = await send(row, '{"name": "x",');
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        message: 'The request body is not valid JSON.',
        errors: [],
      });
    });

    it.skipIf(!row.unknown.path && !row.unknown.body)(
      'ERR-04 an unknown id is 404 in the path, 400 on its field in the body',
      async () => {
        if (row.unknown.path) {
          const res = await send(
            row,
            row.valid(ids),
            row.role,
            row.unknown.path(ids),
          );
          expect(res.status).toBe(404);
          expect(res.body.code).toBe('NOT_FOUND');
        } else {
          const res = await send(row, row.unknown.body!(ids));
          expect(res.status).toBe(400);
          expect(res.body.code).toBe('VALIDATION_FAILED');
          expect(fields(res.body)).toEqual([row.unknown.field]);
        }
      },
    );

    it('ERR-05 without a session is 401', async () => {
      const res = await send(row, row.valid(ids), null);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('ERR-06 a role without the permission is 403, even with a valid body', async () => {
      const res = await send(row, row.valid(ids), row.forbidden);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PERMISSION_DENIED');
    });
  });
});
