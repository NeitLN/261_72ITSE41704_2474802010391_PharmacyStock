import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager, QueryFailedError } from 'typeorm';
import type { Actor } from '../auth/actor.js';
import { BusinessRuleViolation, Conflict, NotFound } from '../common/errors.js';
import {
  Batch,
  BatchStatus,
  Medicine,
  type MovementType,
  type SourceDocumentType,
  StockMovement,
} from '../entities/index.js';
import {
  applyDeltas,
  negate,
  NO_DELTAS,
  type StockDeltas,
} from './stock-deltas.js';

/** What a caller asks the ledger to record. */
export interface MovementInput extends Partial<StockDeltas> {
  batchId: string;
  type: MovementType;
  sourceDocumentType: SourceDocumentType;
  sourceDocumentId: string;
  reason?: string | null;
}

export interface NewBatchInput {
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  unitCost: string;
  receivedAt: Date;
}

const DEADLOCK = '40P01';

function pgCode(error: unknown): string | undefined {
  return error instanceof QueryFailedError
    ? (error.driverError as { code?: string }).code
    : undefined;
}

/**
 * The only way stock changes (BR05, FR-12, Proposal §3.1).
 *
 * `run()` opens one READ COMMITTED transaction with a 5-second lock timeout
 * and hands the work a `LedgerTransaction`. Inside it, every command follows
 * the same lock order, which the transaction enforces:
 *
 * 1. `lockMedicines()` — the parent medicine rows, ascending id;
 * 2. `lockBatches()` / `lockEligibleBatches()` / `createBatch()` — the batches;
 * 3. `post()` — recompute from the locked rows, write one movement, update the
 *    cached quantities.
 *
 * A deadlock rolls the whole transaction back and runs it once more; a lock
 * timeout becomes "this item is busy" (AllExceptionsFilter). Any error inside
 * the work rolls back everything, so no partial document is ever saved
 * (FR-09, NFR-07).
 *
 * The ledger does not check permissions: the calling service has already
 * checked the actor's permission for its command.
 */
@Injectable()
export class StockLedger {
  constructor(private readonly dataSource: DataSource) {}

  async run<T>(work: (tx: LedgerTransaction) => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.dataSource.transaction(
          'READ COMMITTED',
          async (manager) => {
            await manager.query(`SET LOCAL lock_timeout = '5s'`);
            return work(new LedgerTransaction(manager));
          },
        );
      } catch (error) {
        if (attempt === 1 && pgCode(error) === DEADLOCK) continue;
        throw error;
      }
    }
  }
}

/** One stock command in progress. Created only by `StockLedger.run()`. */
export class LedgerTransaction {
  private readonly lockedMedicines = new Set<string>();
  private readonly lockedBatches = new Map<string, Batch>();
  /** Highest medicine id locked so far; later locks must be above it. */
  private highestMedicineId: string | null = null;
  /** Writes run one after another, so concurrent posts never share a stale quantity. */
  private writes: Promise<unknown> = Promise.resolve();

  constructor(readonly manager: EntityManager) {}

  /**
   * Step 1: lock the medicines whose batches this command touches. Pass them
   * all in one call: locks are taken in ascending id, and a later call may
   * only add ids above every id already locked, so two commands can never
   * wait on each other in opposite order.
   */
  async lockMedicines(medicineIds: string[]): Promise<void> {
    const ids = [...new Set(medicineIds.map((id) => id.toLowerCase()))]
      .filter((id) => !this.lockedMedicines.has(id))
      .sort();
    if (ids.length === 0) return;
    if (this.lockedBatches.size > 0) {
      throw new Error('Lock order: lock every medicine before any batch.');
    }
    if (this.highestMedicineId !== null && ids[0] < this.highestMedicineId) {
      throw new Error(
        'Lock order: medicines must be locked in ascending id; lock them all in one call.',
      );
    }
    const rows = await this.manager
      .createQueryBuilder(Medicine, 'm')
      .select('m.id')
      .where('m.id IN (:...ids)', { ids })
      .orderBy('m.id', 'ASC')
      .setLock('pessimistic_write')
      .getMany();
    if (rows.length !== ids.length) {
      const found = new Set(rows.map((m) => m.id));
      throw new NotFound(
        'Medicine',
        ids.find((id) => !found.has(id))!,
      );
    }
    ids.forEach((id) => this.lockedMedicines.add(id));
    this.highestMedicineId = ids[ids.length - 1];
  }

  /** Step 2: lock given batches (ascending id) and return them with fresh quantities. */
  async lockBatches(batchIds: string[]): Promise<Batch[]> {
    const ids = [...new Set(batchIds)];
    const missing = ids.filter((id) => !this.lockedBatches.has(id));
    if (missing.length > 0) {
      const rows = await this.manager
        .createQueryBuilder(Batch, 'b')
        .leftJoin('b.medicine', 'medicine')
        .addSelect('medicine.id')
        .where('b.id IN (:...ids)', { ids: missing })
        .orderBy('b.id', 'ASC')
        .setLock('pessimistic_write', undefined, ['b'])
        .getMany();
      if (rows.length !== missing.length) {
        const found = new Set(rows.map((b) => b.id));
        throw new NotFound(
          'Batch',
          missing.find((id) => !found.has(id))!,
        );
      }
      for (const batch of rows) {
        this.requireMedicineLocked(batch.medicine.id);
        this.lockedBatches.set(batch.id, batch);
      }
    }
    return ids.map((id) => this.lockedBatches.get(id)!);
  }

  /**
   * Step 2 for issuing: lock the batches of a medicine that may be issued on
   * `businessDate` — ACTIVE, expiring after that date (DEC-01), with sellable
   * stock — in FEFO order (DEC-07): expiry, first received, batch number, id.
   * Under READ COMMITTED this sees everything committed while step 1 waited.
   */
  async lockEligibleBatches(
    medicineId: string,
    businessDate: string,
  ): Promise<Batch[]> {
    this.requireMedicineLocked(medicineId);
    const rows = await this.manager
      .createQueryBuilder(Batch, 'b')
      .leftJoin('b.medicine', 'medicine')
      .addSelect('medicine.id')
      .where('medicine.id = :medicineId', { medicineId })
      .andWhere('b.status = :active', { active: BatchStatus.ACTIVE })
      .andWhere('b.expiryDate > :businessDate', { businessDate })
      .andWhere('b.qtySellable > 0')
      .orderBy('b.expiryDate', 'ASC')
      .addOrderBy('b.receivedAt', 'ASC')
      .addOrderBy('b.batchNumber', 'ASC')
      .addOrderBy('b.id', 'ASC')
      .setLock('pessimistic_write', undefined, ['b'])
      .getMany();
    for (const batch of rows) {
      this.lockedBatches.set(
        batch.id,
        this.lockedBatches.get(batch.id) ?? batch,
      );
    }
    return rows.map((b) => this.lockedBatches.get(b.id)!);
  }

  /**
   * Finds a batch of a locked medicine by its number, locking it, or null.
   * Used by goods receipts to top up an existing batch (decision 17).
   */
  async lockBatchByNumber(
    medicineId: string,
    batchNumber: string,
  ): Promise<Batch | null> {
    this.requireMedicineLocked(medicineId);
    const row = await this.manager
      .createQueryBuilder(Batch, 'b')
      .leftJoin('b.medicine', 'medicine')
      .addSelect('medicine.id')
      .where('medicine.id = :medicineId', { medicineId })
      .andWhere('b.batchNumber = :batchNumber', { batchNumber })
      .setLock('pessimistic_write', undefined, ['b'])
      .getOne();
    if (!row) return null;
    const known = this.lockedBatches.get(row.id) ?? row;
    this.lockedBatches.set(row.id, known);
    return known;
  }

  /** Creates an empty batch of a locked medicine; it counts as locked. */
  async createBatch(input: NewBatchInput): Promise<Batch> {
    this.requireMedicineLocked(input.medicineId);
    const batch = await this.manager.save(
      this.manager.create(Batch, {
        batchNumber: input.batchNumber,
        expiryDate: input.expiryDate,
        unitCost: input.unitCost,
        receivedAt: input.receivedAt,
        medicine: { id: input.medicineId },
        qtySellable: 0,
        qtyQuarantine: 0,
        qtyPendingDestruction: 0,
      }),
    );
    this.lockedBatches.set(batch.id, batch);
    return batch;
  }

  /**
   * Step 3: records one movement against a batch locked in this transaction
   * and updates its cached quantities. Refuses (BR03) a change that would
   * leave any stock state below zero; the database CHECKs back this up.
   */
  async post(actor: Actor, input: MovementInput): Promise<StockMovement> {
    const batch = this.lockedBatches.get(input.batchId);
    if (!batch) {
      throw new Error(
        `Batch ${input.batchId} must be locked in this transaction before posting.`,
      );
    }
    const deltas: StockDeltas = {
      deltaSellable: input.deltaSellable ?? NO_DELTAS.deltaSellable,
      deltaQuarantine: input.deltaQuarantine ?? NO_DELTAS.deltaQuarantine,
      deltaPendingDestruction:
        input.deltaPendingDestruction ?? NO_DELTAS.deltaPendingDestruction,
    };
    return this.write(actor, batch, {
      ...deltas,
      type: input.type,
      sourceDocumentType: input.sourceDocumentType,
      sourceDocumentId: input.sourceDocumentId,
      reason: input.reason ?? null,
      reversesMovement: null,
    });
  }

  /**
   * Posts the exact opposite of a movement, referencing it (BR05). A movement
   * is reversed at most once, and a reversal itself cannot be reversed. Locks
   * the medicine and the batch itself, so call it before locking anything
   * else in the same transaction.
   */
  async reverse(
    actor: Actor,
    movementId: string,
    reason: string,
  ): Promise<StockMovement> {
    if (!reason.trim()) {
      throw new BusinessRuleViolation(
        'BR05',
        'REASON_REQUIRED',
        'A correction needs a reason.',
        [{ field: 'reason', message: 'A correction needs a reason.' }],
      );
    }
    const original = await this.manager
      .createQueryBuilder(StockMovement, 'm')
      .leftJoinAndSelect('m.batch', 'batch')
      .leftJoinAndSelect('batch.medicine', 'medicine')
      .leftJoinAndSelect('m.reversesMovement', 'reverses')
      .where('m.id = :movementId', { movementId })
      .getOne();
    if (!original) throw new NotFound('Stock movement', movementId);
    if (original.reversesMovement) {
      throw new Conflict(
        'CANNOT_REVERSE_REVERSAL',
        'A correction cannot itself be reversed; post a new movement instead.',
      );
    }

    await this.lockMedicines([original.batch.medicine.id]);
    const [batch] = await this.lockBatches([original.batch.id]);

    // Checked after the locks, so two concurrent reversals cannot both pass;
    // the unique reverses_movement_id column is the last safety net.
    const already = await this.manager
      .createQueryBuilder(StockMovement, 'm')
      .where('m.reverses_movement_id = :movementId', { movementId })
      .getExists();
    if (already) {
      throw new Conflict(
        'ALREADY_REVERSED',
        'This movement has already been reversed.',
      );
    }

    return this.write(actor, batch, {
      ...negate(original),
      type: original.type,
      sourceDocumentType: original.sourceDocumentType,
      sourceDocumentId: original.sourceDocumentId,
      reason: reason.trim(),
      reversesMovement: { id: original.id } as StockMovement,
    });
  }

  private write(
    actor: Actor,
    batch: Batch,
    movement: Parameters<LedgerTransaction['writeNow']>[2],
  ): Promise<StockMovement> {
    const next = this.writes.then(() => this.writeNow(actor, batch, movement));
    this.writes = next.catch(() => undefined);
    return next;
  }

  private async writeNow(
    actor: Actor,
    batch: Batch,
    movement: StockDeltas &
      Pick<
        StockMovement,
        | 'type'
        | 'sourceDocumentType'
        | 'sourceDocumentId'
        | 'reason'
        | 'reversesMovement'
      >,
  ): Promise<StockMovement> {
    const next = applyDeltas(batch, movement, batch.batchNumber);
    const saved = await this.manager.save(
      this.manager.create(StockMovement, {
        ...movement,
        batch: { id: batch.id },
        performedBy: { id: actor.id },
      }),
    );
    await this.manager.update(Batch, { id: batch.id }, next);
    Object.assign(batch, next);
    return saved;
  }

  private requireMedicineLocked(medicineId: string): void {
    if (!this.lockedMedicines.has(medicineId.toLowerCase())) {
      throw new Error(
        `Lock order: lock medicine ${medicineId} before its batches.`,
      );
    }
  }
}
