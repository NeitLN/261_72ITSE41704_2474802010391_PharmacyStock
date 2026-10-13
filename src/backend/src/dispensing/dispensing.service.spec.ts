import type { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import type { Actor } from '../auth/actor.js';
import { ROLE_PERMISSIONS, RoleCode } from '../auth/permissions.js';
import { PermissionDenied } from '../common/errors.js';
import { FixedClock } from '../stock/clock.js';
import type { StockLedger } from '../stock/stock-ledger.js';
import { DispensingService, hashPayload } from './dispensing.service.js';
import type { DispenseDto } from './dto/dispense.dto.js';

const ITEM_A = '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e';
const ITEM_B = '2b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e';

function dto(over: Partial<DispenseDto> = {}): DispenseDto {
  return {
    requestId: '9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f',
    prescriptionId: '3a4b5c6d-7e8f-4a0b-9c1d-2e3f4a5b6c7d',
    items: [
      { prescriptionItemId: ITEM_A, quantity: 2 },
      { prescriptionItemId: ITEM_B, quantity: 1 },
    ],
    ...over,
  };
}

describe('Request payload hash (FR-23)', () => {
  it('UC06-U3 ignores the request ID and the order of the items', () => {
    const reordered = dto({
      requestId: '00000000-0000-4000-8000-000000000001',
      items: [...dto().items].reverse(),
    });
    expect(hashPayload(reordered)).toBe(hashPayload(dto()));
  });

  it('UC06-U4 changes when a quantity or a note changes', () => {
    const base = hashPayload(dto());
    expect(
      hashPayload(
        dto({ items: [{ prescriptionItemId: ITEM_A, quantity: 3 }] }),
      ),
    ).not.toBe(base);
    expect(
      hashPayload(
        dto({
          items: [
            { prescriptionItemId: ITEM_A, quantity: 2, partialSupplyNote: 'x' },
            { prescriptionItemId: ITEM_B, quantity: 1 },
          ],
        }),
      ),
    ).not.toBe(base);
  });
});

describe('DispensingService permissions (FR-39)', () => {
  it('UC06-U5 refuses a cashier before touching stock', async () => {
    const ledger = { run: vi.fn() } as unknown as StockLedger;
    const service = new DispensingService(
      { manager: {} } as unknown as DataSource,
      ledger,
      new FixedClock(new Date('2026-10-13T03:00:00Z')),
    );
    const cashier: Actor = {
      id: 'u1',
      username: 'cashier',
      fullName: 'Cashier',
      role: RoleCode.CASHIER,
      permissions: new Set(ROLE_PERMISSIONS[RoleCode.CASHIER]),
    };
    await expect(service.dispense(cashier, dto())).rejects.toThrow(
      PermissionDenied,
    );
    await expect(service.preview(cashier, dto())).rejects.toThrow(
      PermissionDenied,
    );
    expect(ledger.run).not.toHaveBeenCalled();
  });
});
