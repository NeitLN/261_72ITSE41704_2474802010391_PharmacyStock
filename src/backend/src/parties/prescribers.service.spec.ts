import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryFailedError, type Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import type { Actor } from '../auth/actor.js';
import { ROLE_PERMISSIONS, RoleCode } from '../auth/permissions.js';
import { Conflict, PermissionDenied } from '../common/errors.js';
import type { Prescriber } from '../entities/index.js';
import {
  CreatePrescriberDto,
  UpdatePrescriberDto,
} from './dto/prescriber.dto.js';
import { PrescribersService } from './prescribers.service.js';

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
function untouchedRepository(): Repository<Prescriber> {
  const fail = vi.fn(() => {
    throw new Error('the repository must not be reached');
  });
  return {
    createQueryBuilder: fail,
    findOneBy: fail,
    existsBy: fail,
    create: fail,
    save: fail,
    update: fail,
  } as unknown as Repository<Prescriber>;
}

describe('PrescribersService permissions (FR-39)', () => {
  const service = new PrescribersService(untouchedRepository());
  const id = '00000000-0000-4000-8000-000000000002';
  const dto = { licenceNumber: 'CCHN-1', fullName: 'Dr. A' };

  it('UC05-U10 refuses every operation for cashier before reading data', async () => {
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
    await expect(service.setActive(who, id, false)).rejects.toBeInstanceOf(
      PermissionDenied,
    );
  });
});

describe('PrescribersService licence number (FR-15)', () => {
  function serviceWith(existing: string[]): PrescribersService {
    const repository = {
      existsBy: vi.fn(async ({ licenceNumber }: { licenceNumber: string }) =>
        existing.includes(licenceNumber),
      ),
      create: vi.fn((value: unknown) => value),
      save: vi.fn((value: unknown) => Promise.resolve(value)),
      findOneBy: vi.fn(),
      update: vi.fn(),
    } as unknown as Repository<Prescriber>;
    return new PrescribersService(repository);
  }

  it('UC14-U1 refuses a duplicate licence number on the licence field', async () => {
    const service = serviceWith(['CCHN-000101-HCM']);
    const error = await service
      .create(actor(RoleCode.PHARMACIST), {
        licenceNumber: 'CCHN-000101-HCM',
        fullName: 'Dr. B',
      })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Conflict);
    expect((error as Conflict).errors[0].field).toBe('licenceNumber');
  });

  it('UC14-U2 two requests racing for one licence both end in a licence conflict', async () => {
    const repository = {
      existsBy: vi.fn().mockResolvedValue(false),
      create: vi.fn((value: unknown) => value),
      save: vi.fn(() => {
        throw new QueryFailedError('insert', [], {
          code: '23505',
        } as unknown as Error);
      }),
    } as unknown as Repository<Prescriber>;
    const service = new PrescribersService(repository);
    const error = await service
      .create(actor(RoleCode.PHARMACIST), {
        licenceNumber: 'CCHN-9',
        fullName: 'Dr. C',
      })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Conflict);
    expect((error as Conflict).errors[0].field).toBe('licenceNumber');
  });
});

describe('Prescriber DTO validation (FR-15)', () => {
  async function errorsOf<T extends object>(cls: new () => T, plain: object) {
    const dto = plainToInstance(cls, plain);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    return { dto, fields: errors.map((e) => e.property) };
  }

  it('UC14-U3 trims text and turns an empty clinic into null', async () => {
    const { dto, fields } = await errorsOf(CreatePrescriberDto, {
      licenceNumber: '  CCHN-1  ',
      fullName: '  Dr. A  ',
      clinicName: '   ',
    });
    expect(fields).toEqual([]);
    expect(dto).toMatchObject({
      licenceNumber: 'CCHN-1',
      fullName: 'Dr. A',
      clinicName: null,
    });
  });

  it('UC14-U4 requires licence number and full name', async () => {
    const { fields } = await errorsOf(CreatePrescriberDto, {
      licenceNumber: '   ',
    });
    expect(fields.sort()).toEqual(['fullName', 'licenceNumber']);
  });

  it('UC14-U6 #201: a licence number is stored upper-case, on create and on update', async () => {
    const created = await errorsOf(CreatePrescriberDto, {
      licenceNumber: ' cchn-000107-hcm ',
      fullName: 'Dr. A',
    });
    const updated = await errorsOf(UpdatePrescriberDto, {
      licenceNumber: 'Cchn-000107-Hcm',
    });
    expect(created.dto.licenceNumber).toBe('CCHN-000107-HCM');
    expect(updated.dto.licenceNumber).toBe('CCHN-000107-HCM');
  });

  it('UC14-U5 an update may leave every field out, but not blank the licence', async () => {
    expect((await errorsOf(UpdatePrescriberDto, {})).fields).toEqual([]);
    expect(
      (await errorsOf(UpdatePrescriberDto, { licenceNumber: ' ' })).fields,
    ).toEqual(['licenceNumber']);
  });
});
