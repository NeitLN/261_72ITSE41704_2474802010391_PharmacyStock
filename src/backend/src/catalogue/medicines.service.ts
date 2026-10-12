import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager, QueryFailedError } from 'typeorm';
import { type Actor, assertPermission } from '../auth/actor.js';
import { Permission } from '../auth/permissions.js';
import {
  Conflict,
  type FieldError,
  NotFound,
  ValidationFailed,
} from '../common/errors.js';
import { likePattern } from '../common/transforms.js';
import {
  Batch,
  Medicine,
  MedicineCategory,
  MedicineClassification,
  UnitOfMeasure,
} from '../entities/index.js';
import { Clock } from '../stock/clock.js';
import type {
  CreateMedicineDto,
  ListMedicinesQuery,
  UpdateMedicineDto,
} from './dto/medicine.dto.js';
import { PriceBook } from './price-book.js';

/** A medicine as the API returns it, with the price in force today. */
export interface MedicineView {
  id: string;
  code: string;
  name: string;
  activeIngredient: string | null;
  strength: string | null;
  classification: MedicineClassification;
  classificationSource: string | null;
  classificationDate: string | null;
  reorderLevel: number;
  lowStockMonitored: boolean;
  expiryAlertDays: number;
  isActive: boolean;
  category: { id: string; code: string; name: string };
  baseUnit: { id: string; code: string; name: string };
  currentPrice: string | null;
}

/**
 * UC01 Manage medicine catalogue (FR-01 to FR-03). Reading the catalogue is
 * part of stock lookup and open to every role; changing it is the manager's.
 */
@Injectable()
export class MedicinesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly priceBook: PriceBook,
    private readonly clock: Clock,
  ) {}

  async list(actor: Actor, query: ListMedicinesQuery): Promise<MedicineView[]> {
    assertPermission(actor, Permission.STOCK_VIEW);
    const qb = this.dataSource
      .getRepository(Medicine)
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.category', 'category')
      .leftJoinAndSelect('m.baseUnit', 'baseUnit')
      .orderBy('m.name', 'ASC')
      .addOrderBy('m.code', 'ASC');
    if (!query.includeInactive) qb.andWhere('m.isActive = true');
    if (query.categoryId) {
      qb.andWhere('category.id = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    if (query.search) {
      qb.andWhere(
        '(m.code ILIKE :p OR m.name ILIKE :p OR m.activeIngredient ILIKE :p)',
        { p: likePattern(query.search) },
      );
    }
    return this.withPrices(this.dataSource.manager, await qb.getMany());
  }

  async get(actor: Actor, id: string): Promise<MedicineView> {
    assertPermission(actor, Permission.STOCK_VIEW);
    const [view] = await this.withPrices(this.dataSource.manager, [
      await this.findOrFail(this.dataSource.manager, id),
    ]);
    return view;
  }

  async create(actor: Actor, dto: CreateMedicineDto): Promise<MedicineView> {
    assertPermission(actor, Permission.CATALOGUE_MANAGE);
    const today = this.clock.today();

    return this.translateDuplicate(() =>
      this.dataSource.transaction(async (manager) => {
        await this.assertCodeFree(manager, dto.code);
        const medicine = manager.create(Medicine, {
          code: dto.code,
          name: dto.name,
          activeIngredient: dto.activeIngredient ?? null,
          strength: dto.strength ?? null,
          classification:
            dto.classification ?? MedicineClassification.PRESCRIPTION,
          classificationSource: dto.classificationSource ?? null,
          classificationDate: dto.classificationDate ?? null,
          reorderLevel: dto.reorderLevel ?? 0,
          lowStockMonitored: dto.lowStockMonitored ?? true,
          expiryAlertDays: dto.expiryAlertDays ?? 90,
          category: await this.category(manager, dto.categoryId),
          baseUnit: await this.unit(manager, dto.baseUnitId),
        });
        this.checkClassification(medicine, today);
        await manager.save(medicine);
        await this.priceBook.setPrice(
          manager,
          actor,
          medicine.id,
          dto.currentPrice,
          today,
        );
        const [view] = await this.withPrices(manager, [medicine]);
        return view;
      }),
    );
  }

  async update(
    actor: Actor,
    id: string,
    dto: UpdateMedicineDto,
  ): Promise<MedicineView> {
    assertPermission(actor, Permission.CATALOGUE_MANAGE);
    const today = this.clock.today();

    return this.translateDuplicate(() =>
      this.dataSource.transaction(async (manager) => {
        // Lock the row so two edits cannot overwrite each other's columns.
        await this.lockRow(manager, id);
        const medicine = await this.findOrFail(manager, id);
        if (dto.code !== undefined && dto.code !== medicine.code) {
          await this.assertCodeFree(manager, dto.code);
          medicine.code = dto.code;
        }
        if (dto.name !== undefined) medicine.name = dto.name;
        if (dto.activeIngredient !== undefined)
          medicine.activeIngredient = dto.activeIngredient;
        if (dto.strength !== undefined) medicine.strength = dto.strength;
        if (dto.classification !== undefined)
          medicine.classification = dto.classification;
        if (dto.classificationSource !== undefined)
          medicine.classificationSource = dto.classificationSource;
        if (dto.classificationDate !== undefined)
          medicine.classificationDate = dto.classificationDate;
        if (dto.reorderLevel !== undefined)
          medicine.reorderLevel = dto.reorderLevel;
        if (dto.lowStockMonitored !== undefined)
          medicine.lowStockMonitored = dto.lowStockMonitored;
        if (dto.expiryAlertDays !== undefined)
          medicine.expiryAlertDays = dto.expiryAlertDays;
        if (dto.categoryId !== undefined)
          medicine.category = await this.category(manager, dto.categoryId);
        if (
          dto.baseUnitId !== undefined &&
          dto.baseUnitId !== medicine.baseUnit.id
        ) {
          // Quantities and prices are stored in the base unit without a unit
          // of their own, so changing it would turn 100 tablets into 100
          // bottles. Allowed only before the medicine has any batch.
          if (await manager.existsBy(Batch, { medicine: { id } })) {
            throw ValidationFailed.field(
              'baseUnitId',
              'The base unit cannot change once the medicine has stock. Create a new medicine instead.',
            );
          }
          medicine.baseUnit = await this.unit(manager, dto.baseUnitId);
        }

        this.checkClassification(medicine, today);
        await manager.save(medicine);
        if (dto.currentPrice !== undefined) {
          await this.priceBook.setPrice(
            manager,
            actor,
            medicine.id,
            dto.currentPrice,
            today,
          );
        }
        const [view] = await this.withPrices(manager, [medicine]);
        return view;
      }),
    );
  }

  /**
   * FR-02: a deactivated medicine cannot be received, dispensed or sold, but
   * its batches and history stay viewable.
   */
  async setActive(
    actor: Actor,
    id: string,
    active: boolean,
  ): Promise<MedicineView> {
    assertPermission(actor, Permission.CATALOGUE_MANAGE);
    const manager = this.dataSource.manager;
    await this.findOrFail(manager, id);
    await manager.update(Medicine, { id }, { isActive: active });
    const [view] = await this.withPrices(manager, [
      await this.findOrFail(manager, id),
    ]);
    return view;
  }

  /** Categories and units are seed data (plan W05-A1); the form reads them here. */
  async referenceData(actor: Actor) {
    assertPermission(actor, Permission.STOCK_VIEW);
    const [categories, units] = await Promise.all([
      this.dataSource
        .getRepository(MedicineCategory)
        .find({ order: { name: 'ASC' } }),
      this.dataSource
        .getRepository(UnitOfMeasure)
        .find({ order: { name: 'ASC' } }),
    ]);
    return {
      categories: categories.map(({ id, code, name }) => ({ id, code, name })),
      units: units.map(({ id, code, name }) => ({ id, code, name })),
    };
  }

  /**
   * DEC-09: OTC is set only from a recorded source, with the date of that
   * classification, which cannot be in the future.
   */
  private checkClassification(medicine: Medicine, today: string): void {
    const errors: FieldError[] = [];
    if (medicine.classification === MedicineClassification.OTC) {
      if (!medicine.classificationSource) {
        errors.push({
          field: 'classificationSource',
          message:
            'An OTC medicine needs the source of its classification (registration or label).',
        });
      }
      if (!medicine.classificationDate) {
        errors.push({
          field: 'classificationDate',
          message: 'An OTC medicine needs the date of its classification.',
        });
      }
    }
    if (medicine.classificationDate && medicine.classificationDate > today) {
      errors.push({
        field: 'classificationDate',
        message: 'Classification date cannot be in the future.',
      });
    }
    if (errors.length > 0) throw new ValidationFailed(errors);
  }

  private async assertCodeFree(manager: EntityManager, code: string) {
    const taken = await manager.existsBy(Medicine, { code });
    if (taken) {
      throw new Conflict(
        'DUPLICATE_CODE',
        `A medicine with code ${code} already exists.`,
        'code',
      );
    }
  }

  /** Two requests racing for the same code: the unique index answers for the code field. */
  private async translateDuplicate<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      const code = (
        error as QueryFailedError & { driverError?: { code?: string } }
      ).driverError?.code;
      if (error instanceof QueryFailedError && code === '23505') {
        throw new Conflict(
          'DUPLICATE_CODE',
          'A medicine with this code already exists.',
          'code',
        );
      }
      throw error;
    }
  }

  private async category(manager: EntityManager, id: string) {
    const found = await manager.findOneBy(MedicineCategory, { id });
    if (!found)
      throw ValidationFailed.field('categoryId', 'Choose a category.');
    return found;
  }

  private async unit(manager: EntityManager, id: string) {
    const found = await manager.findOneBy(UnitOfMeasure, { id });
    if (!found)
      throw ValidationFailed.field('baseUnitId', 'Choose a base unit.');
    return found;
  }

  private async lockRow(manager: EntityManager, id: string): Promise<void> {
    const row = await manager
      .createQueryBuilder(Medicine, 'm')
      .select('m.id')
      .where('m.id = :id', { id })
      .setLock('pessimistic_write')
      .getOne();
    if (!row) throw new NotFound('Medicine', id);
  }

  private async findOrFail(
    manager: EntityManager,
    id: string,
  ): Promise<Medicine> {
    const medicine = await manager.findOne(Medicine, {
      where: { id },
      relations: { category: true, baseUnit: true },
    });
    if (!medicine) throw new NotFound('Medicine', id);
    return medicine;
  }

  private async withPrices(
    manager: EntityManager,
    medicines: Medicine[],
  ): Promise<MedicineView[]> {
    const prices = await this.priceBook.pricesOn(
      manager,
      medicines.map((m) => m.id),
      this.clock.today(),
    );
    return medicines.map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      activeIngredient: m.activeIngredient,
      strength: m.strength,
      classification: m.classification,
      classificationSource: m.classificationSource,
      classificationDate: m.classificationDate,
      reorderLevel: m.reorderLevel,
      lowStockMonitored: m.lowStockMonitored,
      expiryAlertDays: m.expiryAlertDays,
      isActive: m.isActive,
      category: {
        id: m.category.id,
        code: m.category.code,
        name: m.category.name,
      },
      baseUnit: {
        id: m.baseUnit.id,
        code: m.baseUnit.code,
        name: m.baseUnit.name,
      },
      currentPrice: prices.get(m.id) ?? null,
    }));
  }
}
