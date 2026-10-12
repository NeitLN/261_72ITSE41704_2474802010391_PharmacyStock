import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import type { Actor } from '../auth/actor.js';
import { ROLE_PERMISSIONS, RoleCode } from '../auth/permissions.js';
import { PermissionDenied } from '../common/errors.js';
import type { Supplier } from '../entities/index.js';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto.js';
import { SuppliersService } from './suppliers.service.js';

function actor(role: RoleCode): Actor {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    username: role.toLowerCase(),
    fullName: role,
    role,
    permissions: new Set(ROLE_PERMISSIONS[role]),
  };
}

/** A repository whose every method fails the test if it is called. */
function untouchedRepository(): Repository<Supplier> {
  const fail = vi.fn(() => {
    throw new Error('the repository must not be reached');
  });
  return {
    createQueryBuilder: fail,
    findOneBy: fail,
    create: fail,
    save: fail,
  } as unknown as Repository<Supplier>;
}

describe('SuppliersService permissions (FR-39)', () => {
  const service = new SuppliersService(untouchedRepository());
  const id = '00000000-0000-4000-8000-000000000002';
  const dto = { name: 'A', phone: '0909123456' };

  for (const role of [RoleCode.PHARMACIST, RoleCode.CASHIER]) {
    it(`UC02-U1 refuses every operation for ${role} before reading data`, async () => {
      const who = actor(role);
      await expect(service.list(who, {})).rejects.toBeInstanceOf(
        PermissionDenied,
      );
      await expect(service.get(who, id)).rejects.toBeInstanceOf(
        PermissionDenied,
      );
      await expect(service.create(who, dto)).rejects.toBeInstanceOf(
        PermissionDenied,
      );
      await expect(service.update(who, id, dto)).rejects.toBeInstanceOf(
        PermissionDenied,
      );
      await expect(service.setActive(who, id, false)).rejects.toBeInstanceOf(
        PermissionDenied,
      );
    });
  }
});

describe('Supplier DTO validation (FR-05)', () => {
  async function errorsOf<T extends object>(cls: new () => T, plain: object) {
    const dto = plainToInstance(cls, plain);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    return { dto, fields: errors.map((e) => e.property) };
  }

  it('UC02-U2 trims text and turns empty optional fields into null', async () => {
    const { dto, fields } = await errorsOf(CreateSupplierDto, {
      name: '  Phano  ',
      phone: ' 0909 123 456 ',
      address: '   ',
    });
    expect(fields).toEqual([]);
    expect(dto).toMatchObject({
      name: 'Phano',
      phone: '0909 123 456',
      address: null,
    });
  });

  it('UC02-U3 requires name and phone; whitespace alone is not a name', async () => {
    const { fields } = await errorsOf(CreateSupplierDto, { name: '   ' });
    expect(fields.sort()).toEqual(['name', 'phone']);
  });

  it.each([
    ['1234567', 'too short'],
    ['+84 909 123 456 789 0123', 'too long'],
    ['0909-abc-456', 'letters'],
    ['-0909123456', 'leading dash'],
  ])('UC02-U4 refuses phone %s (%s)', async (phone) => {
    const { fields } = await errorsOf(CreateSupplierDto, { name: 'A', phone });
    expect(fields).toEqual(['phone']);
  });

  it.each(['0909123456', '+84 909 123 456', '028.3855.1234', '028-3855-1234'])(
    'UC02-U5 accepts phone %s',
    async (phone) => {
      const { fields } = await errorsOf(CreateSupplierDto, {
        name: 'A',
        phone,
      });
      expect(fields).toEqual([]);
    },
  );

  it('UC02-U6 an update may leave every field out, but not blank the name', async () => {
    expect((await errorsOf(UpdateSupplierDto, {})).fields).toEqual([]);
    expect((await errorsOf(UpdateSupplierDto, { name: ' ' })).fields).toEqual([
      'name',
    ]);
  });
});
