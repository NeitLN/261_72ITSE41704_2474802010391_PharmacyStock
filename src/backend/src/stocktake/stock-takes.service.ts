import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager, In } from 'typeorm';
import { type Actor, assertPermission } from '../auth/actor.js';
import { Permission } from '../auth/permissions.js';
import {
  BusinessRuleViolation,
  Conflict,
  type FieldError,
  NotFound,
  ValidationFailed,
} from '../common/errors.js';
import {
  Batch,
  BatchStatus,
  Medicine,
  MovementType,
  SourceDocumentType,
  StockMovement,
  StockTake,
  StockTakeCounter,
  StockTakeLine,
  StockTakeStatus,
} from '../entities/index.js';
import { Clock } from '../stock/clock.js';
import { StockLedger } from '../stock/stock-ledger.js';
import type {
  AddLineDto,
  CountLineDto,
  ListStockTakesQuery,
  OpenStockTakeDto,
  ReturnStockTakeDto,
} from './dto/stock-take.dto.js';

type UserRef = { id: string; fullName: string };

export interface StockTakeLineView {
  id: string;
  batch: {
    id: string;
    batchNumber: string;
    expiryDate: string;
    status: BatchStatus;
    medicine: { id: string; code: string; name: string };
  };
  countedQuantity: number | null;
  reason: string | null;
  /** Who saved this count (BR08). */
  countedBy: UserRef | null;
  /** Hidden (null) while COUNTING, so the book does not steer the count. */
  systemQuantity: number | null;
  difference: number | null;
  /** difference × batch unit cost, e.g. "-1600.00"; null while COUNTING. */
  differenceValue: string | null;
}

export interface StockTakeView {
  id: string;
  referenceNumber: string;
  status: StockTakeStatus;
  note: string | null;
  openedBy: UserRef;
  countedBy: UserRef | null;
  submittedAt: Date | null;
  approvedBy: UserRef | null;
  approvedAt: Date | null;
  createdAt: Date;
  lines: StockTakeLineView[];
  /** ADJUSTMENT movements posted on approval (FR-31). */
  adjustments: Array<{
    id: string;
    lineId: string;
    batchNumber: string;
    deltaSellable: number;
    occurredAt: Date;
  }>;
}

export interface StockTakeSummary {
  id: string;
  referenceNumber: string;
  status: StockTakeStatus;
  openedBy: UserRef;
  countedBy: UserRef | null;
  approvedBy: UserRef | null;
  createdAt: Date;
  submittedAt: Date | null;
  approvedAt: Date | null;
  lineCount: number;
  countedCount: number;
}

const REFERENCE_LOCK = 'stock_take_reference_number';

/**
 * UC09 Conduct a stock take (FR-29 to FR-32, BR08, decision 15).
 *
 * Counting and posting are apart. Counts are entered while COUNTING; each
 * saved count takes the batch's sellable quantity at that moment as its
 * system quantity, so issues made since the stock take was opened are not
 * mistaken for differences. Only approval changes stock: one ADJUSTMENT per
 * line with a difference, in one StockLedger transaction, by a user other
 * than the counter.
 *
 * Every command locks the stock take row first and then checks its status,
 * so a repeated or racing command finds the new status and gets a 409.
 */
@Injectable()
export class StockTakesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ledger: StockLedger,
    private readonly clock: Clock,
  ) {}

  async list(
    actor: Actor,
    query: ListStockTakesQuery,
  ): Promise<StockTakeSummary[]> {
    assertPermission(actor, Permission.STOCK_TAKE_COUNT);
    const takes = await this.dataSource.manager.find(StockTake, {
      where: query.status ? { status: query.status } : {},
      relations: { openedBy: true, countedBy: true, approvedBy: true },
      order: { createdAt: 'DESC' },
      take: 200,
    });
    if (takes.length === 0) return [];
    const counts = await this.dataSource
      .createQueryBuilder(StockTakeLine, 'l')
      .select('l.stock_take_id', 'id')
      .addSelect('COUNT(*)::int', 'lineCount')
      .addSelect('COUNT(l."countedQuantity")::int', 'countedCount')
      .where('l.stock_take_id IN (:...ids)', { ids: takes.map((t) => t.id) })
      .groupBy('l.stock_take_id')
      .getRawMany<{ id: string; lineCount: number; countedCount: number }>();
    const byId = new Map(counts.map((c) => [c.id, c]));
    return takes.map((t) => ({
      id: t.id,
      referenceNumber: t.referenceNumber,
      status: t.status,
      openedBy: userRef(t.openedBy),
      countedBy: t.countedBy ? userRef(t.countedBy) : null,
      approvedBy: t.approvedBy ? userRef(t.approvedBy) : null,
      createdAt: t.createdAt,
      submittedAt: t.submittedAt,
      approvedAt: t.approvedAt,
      lineCount: byId.get(t.id)?.lineCount ?? 0,
      countedCount: byId.get(t.id)?.countedCount ?? 0,
    }));
  }

  async get(actor: Actor, id: string): Promise<StockTakeView> {
    assertPermission(actor, Permission.STOCK_TAKE_COUNT);
    return this.view(this.dataSource.manager, id);
  }

  /** Steps 1–2: one line per batch of the chosen medicines with sellable stock. */
  async open(actor: Actor, dto: OpenStockTakeDto): Promise<StockTakeView> {
    assertPermission(actor, Permission.STOCK_TAKE_APPROVE);
    const id = await this.dataSource.transaction(async (manager) => {
      const medicineIds = [...new Set(dto.medicineIds.map((m) => m.toLowerCase()))];
      const found = new Set(
        (await manager.findBy(Medicine, { id: In(medicineIds) })).map((m) =>
          m.id.toLowerCase(),
        ),
      );
      const unknown: FieldError[] = dto.medicineIds
        .map((m, index) => ({ m, index }))
        .filter(({ m }) => !found.has(m.toLowerCase()))
        .map(({ index }) => ({
          field: `medicineIds.${index}`,
          message: 'This medicine does not exist.',
        }));
      if (unknown.length > 0) throw new ValidationFailed(unknown);

      const batches = await manager
        .createQueryBuilder(Batch, 'b')
        .leftJoin('b.medicine', 'medicine')
        .where('medicine.id IN (:...medicineIds)', { medicineIds })
        .andWhere('b.qtySellable > 0')
        .getMany();
      if (batches.length === 0) {
        throw ValidationFailed.field(
          'medicineIds',
          'None of these medicines has stock on the book to count.',
        );
      }

      const take = await manager.save(
        manager.create(StockTake, {
          referenceNumber: await this.nextReferenceNumber(manager),
          status: StockTakeStatus.COUNTING,
          note: dto.note ?? null,
          openedBy: { id: actor.id },
        }),
      );
      await manager.save(
        batches.map((batch) =>
          manager.create(StockTakeLine, {
            stockTake: { id: take.id },
            batch: { id: batch.id },
            // Replaced when the line is counted (decision 15).
            systemQuantity: batch.qtySellable,
            countedQuantity: null,
            reason: null,
          }),
        ),
      );
      return take.id;
    });
    return this.view(this.dataSource.manager, id);
  }

  /** Steps 3–4: the count of one line, and the book quantity at that moment. */
  async count(
    actor: Actor,
    id: string,
    lineId: string,
    dto: CountLineDto,
  ): Promise<StockTakeView> {
    assertPermission(actor, Permission.STOCK_TAKE_COUNT);
    await this.dataSource.transaction(async (manager) => {
      await this.lockTake(manager, id, [StockTakeStatus.COUNTING]);
      const line = await manager.findOne(StockTakeLine, {
        where: { id: lineId, stockTake: { id } },
        relations: { batch: true },
      });
      if (!line) throw new NotFound('Stock take line', lineId);
      await manager.update(
        StockTakeLine,
        { id: line.id },
        {
          countedQuantity: dto.countedQuantity,
          reason: dto.reason ?? null,
          systemQuantity: line.batch.qtySellable,
          countedBy: { id: actor.id },
        },
      );
      // The line keeps only the latest counter; BR08 needs all of them (#215).
      await this.recordCounter(manager, id, actor.id);
    });
    return this.view(this.dataSource.manager, id);
  }

  /** A3: a batch of these medicines that the sheet does not list. */
  async addLine(
    actor: Actor,
    id: string,
    dto: AddLineDto,
  ): Promise<StockTakeView> {
    assertPermission(actor, Permission.STOCK_TAKE_COUNT);
    await this.dataSource.transaction(async (manager) => {
      await this.lockTake(manager, id, [StockTakeStatus.COUNTING]);
      const batch = await manager.findOne(Batch, {
        where: { id: dto.batchId },
        relations: { medicine: true },
      });
      if (!batch) {
        throw ValidationFailed.field('batchId', 'This batch does not exist.');
      }
      const lines = await manager.find(StockTakeLine, {
        where: { stockTake: { id } },
        relations: { batch: { medicine: true } },
      });
      if (lines.some((l) => l.batch.id === batch.id)) {
        throw new Conflict(
          'LINE_EXISTS',
          'This batch is already on the count sheet.',
          'batchId',
        );
      }
      if (!lines.some((l) => l.batch.medicine.id === batch.medicine.id)) {
        throw ValidationFailed.field(
          'batchId',
          'This batch is not of a medicine in this stock take.',
        );
      }
      await manager.save(
        manager.create(StockTakeLine, {
          stockTake: { id },
          batch: { id: batch.id },
          systemQuantity: batch.qtySellable,
          countedQuantity: null,
          reason: null,
        }),
      );
    });
    return this.view(this.dataSource.manager, id);
  }

  /** Steps 5–6: every line counted, every difference explained (FR-30). */
  async submit(actor: Actor, id: string): Promise<StockTakeView> {
    assertPermission(actor, Permission.STOCK_TAKE_COUNT);
    await this.dataSource.transaction(async (manager) => {
      await this.lockTake(manager, id, [StockTakeStatus.COUNTING]);
      const lines = await this.orderedLines(manager, id);
      const errors: FieldError[] = [];
      lines.forEach((line, index) => {
        const label = `${line.batch.medicine.name}, batch ${line.batch.batchNumber}`;
        if (line.countedQuantity === null) {
          errors.push({
            field: `lines.${index}.countedQuantity`,
            message: `${label}: enter the counted quantity.`,
          });
        } else if (
          line.countedQuantity !== line.systemQuantity &&
          !line.reason
        ) {
          errors.push({
            field: `lines.${index}.reason`,
            message: `${label}: give a reason for the difference.`,
          });
        }
      });
      if (errors.length > 0) {
        throw new ValidationFailed(
          errors,
          'Some lines are not ready to submit.',
        );
      }
      await manager.update(
        StockTake,
        { id },
        {
          status: StockTakeStatus.PENDING_APPROVAL,
          countedBy: { id: actor.id },
          submittedAt: this.clock.now(),
        },
      );
      // Kept even if the stock take is returned and someone else submits.
      await this.recordCounter(manager, id, actor.id);
    });
    return this.view(this.dataSource.manager, id);
  }

  /**
   * Steps 8–9: posts counted − system for every line with a difference, in
   * one ledger transaction, by someone other than the counter (BR08).
   */
  async approve(actor: Actor, id: string): Promise<StockTakeView> {
    assertPermission(actor, Permission.STOCK_TAKE_APPROVE);
    await this.ledger.run(async (tx) => {
      const manager = tx.manager;
      const take = await this.lockTake(manager, id, [
        StockTakeStatus.PENDING_APPROVAL,
      ]);
      const lines = await this.orderedLines(manager, id);
      // BR08, strict: whoever saved a count, even one overwritten since
      // (#215), or submitted cannot approve.
      const counters = new Set(
        (
          await manager.findBy(StockTakeCounter, { stockTakeId: id })
        ).map((c) => c.userId),
      );
      for (const l of lines) if (l.countedBy) counters.add(l.countedBy.id);
      if (take.countedBy) counters.add(take.countedBy.id);
      if (counters.has(actor.id)) {
        throw new BusinessRuleViolation(
          'BR08',
          'SAME_COUNTER',
          'A stock take must be approved by someone who did not count it.',
        );
      }

      const changed = lines
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => line.countedQuantity !== line.systemQuantity);
      if (changed.length > 0) {
        await tx.lockMedicines(changed.map(({ line }) => line.batch.medicine.id));
        await tx.lockBatches(changed.map(({ line }) => line.batch.id));
        for (const { line, index } of changed) {
          try {
            await tx.post(actor, {
              batchId: line.batch.id,
              type: MovementType.ADJUSTMENT,
              deltaSellable: line.countedQuantity! - line.systemQuantity,
              sourceDocumentType: SourceDocumentType.STOCK_TAKE_LINE,
              sourceDocumentId: line.id,
              reason: line.reason,
            });
          } catch (error) {
            if (error instanceof BusinessRuleViolation && error.rule === 'BR03') {
              const message = `${line.batch.medicine.name}, batch ${line.batch.batchNumber}: stock was issued after the count, so this difference would leave it below zero. Return the stock take and recount this line.`;
              throw new BusinessRuleViolation('BR03', error.code, message, [
                { field: `lines.${index}.countedQuantity`, message },
              ]);
            }
            throw error;
          }
        }
      }
      await manager.update(
        StockTake,
        { id },
        {
          status: StockTakeStatus.APPROVED,
          approvedBy: { id: actor.id },
          approvedAt: this.clock.now(),
        },
      );
    });
    return this.view(this.dataSource.manager, id);
  }

  /** A5: back to COUNTING with what to recount; the counts are kept. */
  async returnToCounting(
    actor: Actor,
    id: string,
    dto: ReturnStockTakeDto,
  ): Promise<StockTakeView> {
    assertPermission(actor, Permission.STOCK_TAKE_APPROVE);
    await this.dataSource.transaction(async (manager) => {
      const take = await this.lockTake(manager, id, [
        StockTakeStatus.PENDING_APPROVAL,
      ]);
      const entry = `[${this.clock.today()}, ${actor.fullName}] Returned for recount: ${dto.comment}`;
      await manager.update(
        StockTake,
        { id },
        {
          status: StockTakeStatus.COUNTING,
          note: take.note ? `${take.note}\n${entry}` : entry,
          countedBy: null,
          submittedAt: null,
        },
      );
    });
    return this.view(this.dataSource.manager, id);
  }

  /** A8: nothing is posted; the record is kept. */
  async cancel(actor: Actor, id: string): Promise<StockTakeView> {
    assertPermission(actor, Permission.STOCK_TAKE_APPROVE);
    await this.dataSource.transaction(async (manager) => {
      await this.lockTake(manager, id, [
        StockTakeStatus.COUNTING,
        StockTakeStatus.PENDING_APPROVAL,
      ]);
      await manager.update(
        StockTake,
        { id },
        { status: StockTakeStatus.CANCELLED },
      );
    });
    return this.view(this.dataSource.manager, id);
  }

  /** Locks the stock take row, then refuses the step unless its status allows it. */
  private async lockTake(
    manager: EntityManager,
    id: string,
    allowed: StockTakeStatus[],
  ): Promise<StockTake> {
    const take = await manager
      .createQueryBuilder(StockTake, 't')
      .leftJoinAndSelect('t.countedBy', 'countedBy')
      .where('t.id = :id', { id })
      .setLock('pessimistic_write', undefined, ['t'])
      .getOne();
    if (!take) throw new NotFound('Stock take', id);
    if (!allowed.includes(take.status)) {
      throw new Conflict(
        'STOCK_TAKE_STATUS',
        `This stock take is ${take.status.replace('_', ' ')}, so this step is not possible.`,
      );
    }
    return take;
  }

  /** Lines in sheet order: medicine name, expiry, batch number. */
  private orderedLines(
    manager: EntityManager,
    id: string,
  ): Promise<StockTakeLine[]> {
    return manager
      .createQueryBuilder(StockTakeLine, 'l')
      .innerJoinAndSelect('l.batch', 'batch')
      .innerJoinAndSelect('batch.medicine', 'medicine')
      .leftJoinAndSelect('l.countedBy', 'countedBy')
      .where('l.stock_take_id = :id', { id })
      .orderBy('medicine.name', 'ASC')
      .addOrderBy('batch.expiryDate', 'ASC')
      .addOrderBy('batch.batchNumber', 'ASC')
      .addOrderBy('l.id', 'ASC')
      .getMany();
  }

  private async recordCounter(
    manager: EntityManager,
    stockTakeId: string,
    userId: string,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(StockTakeCounter)
      .values({ stockTakeId, userId })
      .orIgnore()
      .execute();
  }

  private async view(
    manager: EntityManager,
    id: string,
  ): Promise<StockTakeView> {
    const take = await manager.findOne(StockTake, {
      where: { id },
      relations: { openedBy: true, countedBy: true, approvedBy: true },
    });
    if (!take) throw new NotFound('Stock take', id);
    const lines = await this.orderedLines(manager, id);
    const blind = take.status === StockTakeStatus.COUNTING;

    const adjustments =
      take.status === StockTakeStatus.APPROVED && lines.length > 0
        ? await manager.find(StockMovement, {
            where: {
              sourceDocumentType: SourceDocumentType.STOCK_TAKE_LINE,
              sourceDocumentId: In(lines.map((l) => l.id)),
            },
            relations: { batch: true },
            order: { occurredAt: 'ASC' },
          })
        : [];

    return {
      id: take.id,
      referenceNumber: take.referenceNumber,
      status: take.status,
      note: take.note,
      openedBy: userRef(take.openedBy),
      countedBy: take.countedBy ? userRef(take.countedBy) : null,
      submittedAt: take.submittedAt,
      approvedBy: take.approvedBy ? userRef(take.approvedBy) : null,
      approvedAt: take.approvedAt,
      createdAt: take.createdAt,
      lines: lines.map((line) => {
        const difference =
          blind || line.countedQuantity === null
            ? null
            : line.countedQuantity - line.systemQuantity;
        return {
          id: line.id,
          batch: {
            id: line.batch.id,
            batchNumber: line.batch.batchNumber,
            expiryDate: line.batch.expiryDate,
            status: line.batch.status,
            medicine: {
              id: line.batch.medicine.id,
              code: line.batch.medicine.code,
              name: line.batch.medicine.name,
            },
          },
          countedQuantity: line.countedQuantity,
          reason: line.reason,
          countedBy: line.countedBy ? userRef(line.countedBy) : null,
          systemQuantity: blind ? null : line.systemQuantity,
          difference,
          differenceValue:
            difference === null
              ? null
              : centsToString(BigInt(difference) * toCents(line.batch.unitCost)),
        };
      }),
      adjustments: adjustments.map((m) => ({
        id: m.id,
        lineId: m.sourceDocumentId,
        batchNumber: m.batch.batchNumber,
        deltaSellable: m.deltaSellable,
        occurredAt: m.occurredAt,
      })),
    };
  }

  /**
   * `ST-YYYYMMDD-NNNN`, running per business day. The advisory lock is held
   * to the end of the transaction, so two openings never take the same number.
   */
  private async nextReferenceNumber(manager: EntityManager): Promise<string> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      REFERENCE_LOCK,
    ]);
    const prefix = `ST-${this.clock.today().replaceAll('-', '')}-`;
    const last = await manager
      .createQueryBuilder(StockTake, 't')
      .select('t.referenceNumber', 'referenceNumber')
      .where('t.referenceNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('t.referenceNumber', 'DESC')
      .limit(1)
      .getRawOne<{ referenceNumber: string }>();
    const next = last
      ? Number(last.referenceNumber.slice(prefix.length)) + 1
      : 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
  }
}

function userRef(user: { id: string; fullName: string }): UserRef {
  return { id: user.id, fullName: user.fullName };
}

/** "800.00" → 80000n. Unit costs are numeric(12,2), so the string is exact. */
function toCents(amount: string): bigint {
  const [whole, fraction = ''] = amount.split('.');
  const sign = whole.startsWith('-') ? -1n : 1n;
  const cents =
    BigInt(whole.replace('-', '')) * 100n +
    BigInt((fraction + '00').slice(0, 2));
  return sign * cents;
}

function centsToString(cents: bigint): string {
  const sign = cents < 0n ? '-' : '';
  const abs = cents < 0n ? -cents : cents;
  return `${sign}${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`;
}
