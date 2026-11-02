import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager, QueryFailedError } from 'typeorm';
import { type Actor, assertPermission } from '../auth/actor.js';
import { Permission } from '../auth/permissions.js';
import {
  BusinessRuleViolation,
  Conflict,
  NotFound,
  ValidationFailed,
} from '../common/errors.js';
import { Medicine, MedicinePrice } from '../entities/index.js';
import { Clock } from '../stock/clock.js';
import type { SchedulePriceDto } from './dto/price.dto.js';

export type PriceState = 'scheduled' | 'in_force' | 'past';

export interface PriceHistoryView {
  medicine: { id: string; code: string; name: string };
  /** The business date the states are worked out against. */
  today: string;
  prices: Array<{
    id: string;
    effectiveFrom: string;
    unitPrice: string;
    state: PriceState;
    setBy: { id: string; fullName: string };
    createdAt: Date;
  }>;
}

const dateTaken = (date: string) =>
  new Conflict(
    'PRICE_DATE_TAKEN',
    `A price already starts on ${date}. Cancel it first, or use Edit for today's price.`,
    'effectiveFrom',
  );

/**
 * UC13: scheduling a price, cancelling one that has not started, and the
 * price history. UC01's edit still changes today's price (FR-03); a scheduled
 * price is only ever added or removed, never overwritten. Prices in force or
 * past are never touched, so a sale or report never changes (BR09).
 */
@Injectable()
export class PricesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly clock: Clock,
  ) {}

  async history(actor: Actor, medicineId: string): Promise<PriceHistoryView> {
    assertPermission(actor, Permission.CATALOGUE_MANAGE);
    return this.view(this.dataSource.manager, medicineId);
  }

  async schedule(
    actor: Actor,
    medicineId: string,
    dto: SchedulePriceDto,
  ): Promise<PriceHistoryView> {
    assertPermission(actor, Permission.CATALOGUE_MANAGE);
    const today = this.clock.today();
    if (dto.effectiveFrom < today) {
      throw ValidationFailed.field(
        'effectiveFrom',
        'The price can start today at the earliest.',
      );
    }
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Same lock as UC01's edit, so the date check and the insert see one state.
        await this.lockMedicine(manager, medicineId);
        const taken = await manager.existsBy(MedicinePrice, {
          medicine: { id: medicineId },
          effectiveFrom: dto.effectiveFrom,
        });
        if (taken) throw dateTaken(dto.effectiveFrom);
        await manager.insert(MedicinePrice, {
          medicine: { id: medicineId },
          effectiveFrom: dto.effectiveFrom,
          unitPrice: String(dto.unitPrice),
          setBy: { id: actor.id },
        });
        return this.view(manager, medicineId);
      });
    } catch (error) {
      // The unique index is the backstop if the check above is ever bypassed.
      const code = (error as { driverError?: { code?: string } }).driverError
        ?.code;
      if (error instanceof QueryFailedError && code === '23505') {
        throw dateTaken(dto.effectiveFrom);
      }
      throw error;
    }
  }

  async cancel(
    actor: Actor,
    medicineId: string,
    priceId: string,
  ): Promise<void> {
    assertPermission(actor, Permission.CATALOGUE_MANAGE);
    const today = this.clock.today();
    await this.dataSource.transaction(async (manager) => {
      await this.lockMedicine(manager, medicineId);
      const price = await manager.findOneBy(MedicinePrice, {
        id: priceId,
        medicine: { id: medicineId },
      });
      if (!price) throw new NotFound('Price', priceId);
      if (price.effectiveFrom <= today) {
        throw new BusinessRuleViolation(
          'BR09',
          'PRICE_ALREADY_IN_FORCE',
          'This price has already started, so it stays in the history. Schedule a new price instead.',
        );
      }
      await manager.delete(MedicinePrice, { id: priceId });
    });
  }

  private async lockMedicine(
    manager: EntityManager,
    id: string,
  ): Promise<void> {
    const row = await manager
      .createQueryBuilder(Medicine, 'm')
      .select('m.id')
      .where('m.id = :id', { id })
      .setLock('pessimistic_write')
      .getOne();
    if (!row) throw new NotFound('Medicine', id);
  }

  private async view(
    manager: EntityManager,
    medicineId: string,
  ): Promise<PriceHistoryView> {
    const medicine = await manager.findOneBy(Medicine, { id: medicineId });
    if (!medicine) throw new NotFound('Medicine', medicineId);
    const today = this.clock.today();
    const rows = await manager.find(MedicinePrice, {
      where: { medicine: { id: medicineId } },
      relations: { setBy: true },
      order: { effectiveFrom: 'DESC' },
    });
    // The newest price that started on or before today is the one in force.
    const inForce = rows.find((r) => r.effectiveFrom <= today);
    return {
      medicine: { id: medicine.id, code: medicine.code, name: medicine.name },
      today,
      prices: rows.map((r) => ({
        id: r.id,
        effectiveFrom: r.effectiveFrom,
        unitPrice: r.unitPrice,
        state:
          r.effectiveFrom > today
            ? 'scheduled'
            : r === inForce
              ? 'in_force'
              : 'past',
        setBy: { id: r.setBy.id, fullName: r.setBy.fullName },
        createdAt: r.createdAt,
      })),
    };
  }
}
