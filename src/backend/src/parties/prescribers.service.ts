import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, type Repository } from 'typeorm';
import { type Actor, assertPermission } from '../auth/actor.js';
import { Permission } from '../auth/permissions.js';
import { Conflict, NotFound } from '../common/errors.js';
import { likePattern } from '../common/transforms.js';
import { Prescriber } from '../entities/index.js';
import type {
  CreatePrescriberDto,
  ListPrescribersQuery,
  UpdatePrescriberDto,
} from './dto/prescriber.dto.js';

/** Prescribers (doctors) named on prescriptions (FR-15). */
@Injectable()
export class PrescribersService {
  constructor(
    @InjectRepository(Prescriber)
    private readonly prescribers: Repository<Prescriber>,
  ) {}

  async list(actor: Actor, query: ListPrescribersQuery): Promise<Prescriber[]> {
    assertPermission(actor, Permission.PRESCRIPTION_MANAGE);

    const qb = this.prescribers
      .createQueryBuilder('p')
      .orderBy('p.fullName', 'ASC');
    qb.andWhere('p.isActive = :active', {
      active: query.active ?? true,
    });
    if (query.search) {
      qb.andWhere(
        '(p.fullName ILIKE :pattern OR p.licenceNumber ILIKE :pattern OR p.clinicName ILIKE :pattern)',
        { pattern: likePattern(query.search) },
      );
    }
    return qb.getMany();
  }

  async get(actor: Actor, id: string): Promise<Prescriber> {
    assertPermission(actor, Permission.PRESCRIPTION_MANAGE);
    return this.findOrFail(id);
  }

  async create(actor: Actor, dto: CreatePrescriberDto): Promise<Prescriber> {
    assertPermission(actor, Permission.PRESCRIPTION_MANAGE);
    await this.assertLicenceFree(dto.licenceNumber);
    // The entity type predates the nullable column (do not edit entities per
    // ticket); the database column is nullable and stores NULL.
    const prescriber = this.prescribers.create({
      licenceNumber: dto.licenceNumber,
      fullName: dto.fullName,
      clinicName: dto.clinicName ?? null,
    } as unknown as Prescriber);
    return this.translateDuplicate(() => this.prescribers.save(prescriber));
  }

  async update(
    actor: Actor,
    id: string,
    dto: UpdatePrescriberDto,
  ): Promise<Prescriber> {
    assertPermission(actor, Permission.PRESCRIPTION_MANAGE);
    const current = await this.findOrFail(id);
    if (
      dto.licenceNumber !== undefined &&
      dto.licenceNumber !== current.licenceNumber
    ) {
      await this.assertLicenceFree(dto.licenceNumber);
    }
    // Write only the columns the request sent, so a concurrent change to
    // another column (e.g. a deactivation) is never overwritten by a stale copy.
    const changes: Partial<Prescriber> = {};
    if (dto.licenceNumber !== undefined)
      changes.licenceNumber = dto.licenceNumber;
    if (dto.fullName !== undefined) changes.fullName = dto.fullName;
    // Same entity-typing cast as in create: null clears the column.
    if (dto.clinicName !== undefined)
      changes.clinicName = dto.clinicName as unknown as string;
    if (Object.keys(changes).length > 0) {
      await this.translateDuplicate(() =>
        this.prescribers.update({ id }, changes),
      );
    }
    return this.findOrFail(id);
  }

  /**
   * A deactivated prescriber stays in history but can no longer be chosen
   * on a new prescription (checked by UC05).
   */
  async setActive(
    actor: Actor,
    id: string,
    active: boolean,
  ): Promise<Prescriber> {
    assertPermission(actor, Permission.PRESCRIPTION_MANAGE);
    await this.findOrFail(id);
    await this.prescribers.update({ id }, { isActive: active });
    return this.findOrFail(id);
  }

  private async assertLicenceFree(licenceNumber: string): Promise<void> {
    const taken = await this.prescribers.existsBy({ licenceNumber });
    if (taken) throw this.duplicateLicence(licenceNumber);
  }

  private duplicateLicence(licenceNumber: string): Conflict {
    return new Conflict(
      'DUPLICATE_LICENCE_NUMBER',
      `A prescriber with licence number ${licenceNumber} already exists.`,
      'licenceNumber',
    );
  }

  /** Two requests racing for the same licence: the unique index answers. */
  private async translateDuplicate<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      const code = (
        error as QueryFailedError & { driverError?: { code?: string } }
      ).driverError?.code;
      if (error instanceof QueryFailedError && code === '23505') {
        throw new Conflict(
          'DUPLICATE_LICENCE_NUMBER',
          'A prescriber with this licence number already exists.',
          'licenceNumber',
        );
      }
      throw error;
    }
  }

  private async findOrFail(id: string): Promise<Prescriber> {
    const prescriber = await this.prescribers.findOneBy({ id });
    if (!prescriber) throw new NotFound('Prescriber', id);
    return prescriber;
  }
}
