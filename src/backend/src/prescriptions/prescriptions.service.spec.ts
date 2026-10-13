import type { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import type { Actor } from '../auth/actor.js';
import { ROLE_PERMISSIONS, RoleCode } from '../auth/permissions.js';
import { PermissionDenied } from '../common/errors.js';
import { FixedClock } from '../stock/clock.js';
import type { PrescriptionDto } from './dto/prescription.dto.js';
import {
  monthsBetween,
  PrescriptionsService,
} from './prescriptions.service.js';

function actor(role: RoleCode): Actor {
  return {
    id: 'u1',
    username: role.toLowerCase(),
    fullName: role,
    role,
    permissions: new Set(ROLE_PERMISSIONS[role]),
  };
}

describe('PrescriptionsService permissions (FR-39)', () => {
  it('UC05-U6 refuses a cashier before touching the database', async () => {
    const dataSource = {
      transaction: vi.fn(),
      getRepository: vi.fn(),
      manager: {},
    } as unknown as DataSource;
    const service = new PrescriptionsService(
      dataSource,
      new FixedClock(new Date('2026-10-13T03:00:00Z')),
    );
    const cashier = actor(RoleCode.CASHIER);
    const id = '3a4b5c6d-7e8f-4a0b-9c1d-2e3f4a5b6c7d';
    const dto = {} as PrescriptionDto;

    await expect(service.list(cashier, {})).rejects.toThrow(PermissionDenied);
    await expect(service.get(cashier, id)).rejects.toThrow(PermissionDenied);
    await expect(service.create(cashier, dto)).rejects.toThrow(
      PermissionDenied,
    );
    await expect(service.update(cashier, id, dto)).rejects.toThrow(
      PermissionDenied,
    );
    await expect(service.verify(cashier, id, {})).rejects.toThrow(
      PermissionDenied,
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(dataSource.getRepository).not.toHaveBeenCalled();
  });
});

describe('Age in months (FR-13)', () => {
  it('UC05-U7 counts whole months, not yet the month whose day has not come', () => {
    expect(monthsBetween('2020-10-13', '2026-10-13')).toBe(72);
    expect(monthsBetween('2020-10-14', '2026-10-13')).toBe(71);
    expect(monthsBetween('2026-01-31', '2026-02-28')).toBe(0);
    expect(monthsBetween('2025-10-13', '2026-10-13')).toBe(12);
  });
});
