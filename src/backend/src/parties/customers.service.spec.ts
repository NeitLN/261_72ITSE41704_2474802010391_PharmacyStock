import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import type { Actor } from '../auth/actor.js';
import { ROLE_PERMISSIONS, RoleCode } from '../auth/permissions.js';
import { PermissionDenied, ValidationFailed } from '../common/errors.js';
import type { Customer } from '../entities/index.js';
import { FixedClock } from '../stock/clock.js';
import { CustomersService } from './customers.service.js';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
} from './dto/customer.dto.js';

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
function untouchedRepository(): Repository<Customer> {
  const fail = vi.fn(() => {
    throw new Error('the repository must not be reached');
  });
  return {
    createQueryBuilder: fail,
    findOneBy: fail,
    create: fail,
    save: fail,
    update: fail,
  } as unknown as Repository<Customer>;
}

const TODAY = new FixedClock(new Date('2026-10-13T00:00:00Z'));

describe('CustomersService permissions (FR-39)', () => {
  const service = new CustomersService(untouchedRepository(), TODAY);
  const id = '00000000-0000-4000-8000-000000000002';
  const dto = { fullName: 'Nguyen Van An' };

  it('UC05-U1 refuses every operation for cashier before reading data', async () => {
    const who = actor(RoleCode.CASHIER);
    await expect(service.list(who, {})).rejects.toBeInstanceOf(
      PermissionDenied,
    );
    await expect(service.get(who, id)).rejects.toBeInstanceOf(PermissionDenied);
    await expect(service.create(who, dto)).rejects.toBeInstanceOf(
      PermissionDenied,
    );
    await expect(service.update(who, id, dto)).rejects.toBeInstanceOf(
      PermissionDenied,
    );
  });
});

describe('CustomersService customer code (FR-15)', () => {
  function serviceWithLatest(code?: string): {
    service: CustomersService;
    save: ReturnType<typeof vi.fn>;
  } {
    const qb = {
      select: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      getRawOne: vi.fn().mockResolvedValue(code ? { code } : null),
    };
    const save = vi.fn((customer: unknown) => Promise.resolve(customer));
    const repository = {
      createQueryBuilder: vi.fn(() => qb),
      create: vi.fn((value: unknown) => value),
      save,
    } as unknown as Repository<Customer>;
    return { service: new CustomersService(repository, TODAY), save };
  }

  it('UC05-U2 generates the next code above the highest KH code', async () => {
    const { service } = serviceWithLatest('KH0012');
    const created = await service.create(actor(RoleCode.PHARMACIST), {
      fullName: 'New Patient',
    });
    expect(created.code).toBe('KH0013');
  });

  it('UC05-U3 starts at KH0001 when no customer exists yet', async () => {
    const { service } = serviceWithLatest(undefined);
    const created = await service.create(actor(RoleCode.PHARMACIST), {
      fullName: 'First Patient',
    });
    expect(created.code).toBe('KH0001');
  });
});

describe('CustomersService date of birth (FR-13)', () => {
  it('UC05-U4 refuses a date of birth in the future', async () => {
    const repository = {
      createQueryBuilder: vi.fn(),
      findOneBy: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
    } as unknown as Repository<Customer>;
    const service = new CustomersService(repository, TODAY);
    await expect(
      service.create(actor(RoleCode.PHARMACIST), {
        fullName: 'New Patient',
        dateOfBirth: '2026-10-14',
      }),
    ).rejects.toBeInstanceOf(ValidationFailed);
    expect(repository.save).not.toHaveBeenCalled();
  });
});

describe('Customer DTO validation (FR-13, FR-15)', () => {
  async function errorsOf<T extends object>(cls: new () => T, plain: object) {
    const dto = plainToInstance(cls, plain);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    return { dto, fields: errors.map((e) => e.property) };
  }

  it('UC05-U5 trims text and turns empty optional fields into null', async () => {
    const { dto, fields } = await errorsOf(CreateCustomerDto, {
      fullName: '  Nguyen Van An  ',
      phone: '   ',
      address: '',
    });
    expect(fields).toEqual([]);
    expect(dto).toMatchObject({
      fullName: 'Nguyen Van An',
      phone: null,
      address: null,
    });
  });

  it('UC05-U6 requires full name; whitespace alone is not a name', async () => {
    const { fields } = await errorsOf(CreateCustomerDto, { fullName: '   ' });
    expect(fields).toEqual(['fullName']);
  });

  it('UC05-U7 a malformed phone number is refused on its field', async () => {
    const { fields } = await errorsOf(CreateCustomerDto, {
      fullName: 'A',
      phone: 'call me',
    });
    expect(fields).toEqual(['phone']);
  });

  it('UC05-U8 a calendar date is required for date of birth, not a bare year', async () => {
    const { fields } = await errorsOf(CreateCustomerDto, {
      fullName: 'A',
      dateOfBirth: '2026',
    });
    expect(fields).toEqual(['dateOfBirth']);
  });

  it('UC05-U9 an update may leave every field out, but not blank the name', async () => {
    expect((await errorsOf(UpdateCustomerDto, {})).fields).toEqual([]);
    expect(
      (await errorsOf(UpdateCustomerDto, { fullName: ' ' })).fields,
    ).toEqual(['fullName']);
  });
});
