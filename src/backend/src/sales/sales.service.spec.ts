import type { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import type { Actor } from '../auth/actor.js';
import { ROLE_PERMISSIONS, RoleCode } from '../auth/permissions.js';
import type { PriceBook } from '../catalogue/price-book.js';
import { PermissionDenied, ValidationFailed } from '../common/errors.js';
import { FixedClock } from '../stock/clock.js';
import type { StockLedger } from '../stock/stock-ledger.js';
import type { SaleDto } from './dto/sale.dto.js';
import { fromXu, lineTotal, toXu } from './money.js';
import { hashSalePayload, SalesService } from './sales.service.js';

const MED_A = '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e';
const MED_B = '2b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e';

function dto(over: Partial<SaleDto> = {}): SaleDto {
  return {
    requestId: '9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f',
    otcLines: [
      { medicineId: MED_A, quantity: 2 },
      { medicineId: MED_B, quantity: 3 },
    ],
    ...over,
  };
}

function actor(role: RoleCode): Actor {
  return {
    id: 'u1',
    username: role.toLowerCase(),
    fullName: role,
    role,
    permissions: new Set(ROLE_PERMISSIONS[role]),
  };
}

function service() {
  const ledger = { run: vi.fn() } as unknown as StockLedger;
  return {
    ledger,
    sales: new SalesService(
      { manager: {} } as unknown as DataSource,
      ledger,
      {} as PriceBook,
      new FixedClock(new Date('2026-10-13T03:00:00Z')),
    ),
  };
}

describe('Money in whole xu (TC-52)', () => {
  it('UC07-U1 reads numeric(12,2) strings exactly and writes them back', () => {
    expect(toXu('2200.00')).toBe(220000n);
    expect(toXu('1750.5')).toBe(175050n);
    expect(toXu('400')).toBe(40000n);
    expect(fromXu(175050n)).toBe('1750.50');
    expect(fromXu(5n)).toBe('0.05');
  });

  it('UC07-U2 multiplies without float error, also for large quantities', () => {
    expect(lineTotal('0.10', 3)).toBe('0.30');
    expect(lineTotal('1750.50', 3)).toBe('5251.50');
    expect(lineTotal('180000.00', 100000)).toBe('18000000000.00');
  });

  it('UC07-U3 refuses anything that is not a money amount', () => {
    for (const bad of ['', '-1.00', '1.234', 'abc', '1e3']) {
      expect(() => toXu(bad)).toThrow(RangeError);
    }
  });
});

describe('Sale request payload hash (FR-23)', () => {
  it('UC07-U4 ignores the request ID and the order of the lines', () => {
    const reordered = dto({
      requestId: '00000000-0000-4000-8000-000000000001',
      otcLines: [...(dto().otcLines ?? [])].reverse(),
    });
    expect(hashSalePayload(reordered)).toBe(hashSalePayload(dto()));
  });

  it('UC07-U5 changes when a quantity, the customer or the billed prescription changes', () => {
    const base = hashSalePayload(dto());
    expect(
      hashSalePayload(dto({ otcLines: [{ medicineId: MED_A, quantity: 3 }] })),
    ).not.toBe(base);
    expect(
      hashSalePayload(dto({ customerId: '0b6f1c9e-5d7a-4c3b-8e2f-6a9d4b1c2e03' })),
    ).not.toBe(base);
    expect(
      hashSalePayload(dto({ prescriptionId: '3a4b5c6d-7e8f-4a0b-9c1d-2e3f4a5b6c7d' })),
    ).not.toBe(base);
  });
});

describe('SalesService checks before touching stock', () => {
  it('UC07-U6 refuses a pharmacist (no sale.create) before opening a transaction (FR-39)', async () => {
    const { sales, ledger } = service();
    await expect(
      sales.record(actor(RoleCode.PHARMACIST), dto()),
    ).rejects.toThrow(PermissionDenied);
    await expect(
      sales.get(actor(RoleCode.PHARMACIST), MED_A),
    ).rejects.toThrow(PermissionDenied);
    expect(ledger.run).not.toHaveBeenCalled();
  });

  it('UC07-U7 refuses the same medicine on two lines, naming the second one', async () => {
    const { sales, ledger } = service();
    const attempt = sales.record(
      actor(RoleCode.CASHIER),
      dto({
        otcLines: [
          { medicineId: MED_A, quantity: 1 },
          { medicineId: MED_A.toUpperCase(), quantity: 2 },
        ],
      }),
    );
    await expect(attempt).rejects.toThrow(ValidationFailed);
    await expect(attempt).rejects.toMatchObject({
      errors: [
        {
          field: 'otcLines.1.medicineId',
          message: 'Each medicine can appear only once.',
        },
      ],
    });
    expect(ledger.run).not.toHaveBeenCalled();
  });

  it('UC07-U8 needs a cart line or a prescription to bill; billing lists need sale.create', async () => {
    const { sales, ledger } = service();
    const attempt = sales.record(
      actor(RoleCode.CASHIER),
      dto({ otcLines: undefined }),
    );
    await expect(attempt).rejects.toThrow(ValidationFailed);
    await expect(attempt).rejects.toMatchObject({
      errors: [{ field: 'otcLines' }],
    });
    await expect(sales.billable(actor(RoleCode.PHARMACIST))).rejects.toThrow(
      PermissionDenied,
    );
    expect(ledger.run).not.toHaveBeenCalled();
  });
});
