import { Injectable, Optional } from '@nestjs/common';
import { DataSource, type EntityManager, QueryFailedError } from 'typeorm';
import type { Actor } from '../auth/actor.js';
import {
  BusinessRuleViolation,
  Conflict,
  NotFound,
  ValidationFailed,
} from '../common/errors.js';
import {
  Batch,
  BatchStatus,
  Medicine,
  MedicineClassification,
  MovementType,
  SourceDocumentType,
  StockMovement,
  type User,
} from '../entities/index.js';
import {
  applyDeltas,
  negate,
  NO_DELTAS,
  type StockDeltas,
} from './stock-deltas.js';
import { AlertEvaluator } from './alert-evaluator.js';

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

/** How a batch status reads in a message. */
const STATUS_LABEL: Record<BatchStatus, string> = {
  [BatchStatus.ACTIVE]: 'active',
  [BatchStatus.ON_HOLD]: 'on hold',
  [BatchStatus.RECALLED]: 'recalled',
  [BatchStatus.REJECTED]: 'rejected',
};

/** The trimmed reason, or a 400 on `reason` when there is none. */
function requireReason(reason: string, message: string): string {
  const trimmed = reason.trim();
  if (!trimmed) throw new ValidationFailed([{ field: 'reason', message }]);
  return trimmed;
}

/** The calling service validates quantities; this guards the ledger itself. */
function requirePositive(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Quantity must be a positive whole number of base units.');
  }
}

/** Expired on `businessDate`: it may no longer be issued (DEC-01, BR02). */
function isExpired(batch: Batch, businessDate: string): boolean {
  return batch.expiryDate <= businessDate;
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
 *
 * After the work and before the commit, the low-stock alerts of every
 * medicine the command locked are evaluated (UC10, FR-33). Those rows are
 * still locked, so concurrent commands cannot raise two alerts for one
 * medicine, and no use case has to remember the call.
 */
@Injectable()
export class StockLedger {
  constructor(
    private readonly dataSource: DataSource,
    /** Absent only where the ledger is built by hand (the demo seed). */
    @Optional() private readonly alerts?: AlertEvaluator,
  ) {}

  async run<T>(work: (tx: LedgerTransaction) => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.dataSource.transaction(
          'READ COMMITTED',
          async (manager) => {
            await manager.query(`SET LOCAL lock_timeout = '5s'`);
            const tx = new LedgerTransaction(manager);
            const result = await work(tx);
            await this.alerts?.evaluate(manager, tx.lockedMedicineIds);
            return result;
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

  /** The medicines this command has locked (step 1), lower-case. */
  get lockedMedicineIds(): string[] {
    return [...this.lockedMedicines];
  }

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
    const ids = [...new Set(batchIds.map((id) => id.toLowerCase()))];
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
        // Keep the first copy: an overlapping call may have cached it already.
        this.lockedBatches.set(
          batch.id,
          this.lockedBatches.get(batch.id) ?? batch,
        );
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

  /**
   * Changes a batch's status with a reason (FR-48, DEC-07). ACTIVE, ON_HOLD
   * and RECALLED change into each other freely; REJECTED is final. No stock
   * moves: a batch that is not ACTIVE simply stops being eligible for FEFO,
   * sales and the sellable total. Locks the medicine and the batch itself.
   */
  async setBatchStatus(
    actor: Actor,
    batchId: string,
    status: BatchStatus,
    reason: string,
  ): Promise<Batch> {
    const why = requireReason(reason, 'Say why the status changes.');
    const batch = await this.lockBatchOf(batchId);
    return this.serialized(() => this.changeStatus(actor, batch, status, why));
  }

  private async changeStatus(
    actor: Actor,
    batch: Batch,
    status: BatchStatus,
    why: string,
  ): Promise<Batch> {
    if (batch.status === BatchStatus.REJECTED) {
      throw new BusinessRuleViolation(
        'DEC-07',
        'BATCH_REJECTED_FINAL',
        `Batch ${batch.batchNumber} is rejected; a rejected batch keeps that status.`,
      );
    }
    if (batch.status === status) {
      throw new BusinessRuleViolation(
        'DEC-07',
        'BATCH_STATUS_UNCHANGED',
        `Batch ${batch.batchNumber} is already ${STATUS_LABEL[status]}.`,
        [{ field: 'status', message: 'Choose a different status.' }],
      );
    }
    await this.manager.update(
      Batch,
      { id: batch.id },
      {
        status,
        statusReason: why,
        statusChangedBy: { id: actor.id },
        statusChangedAt: () => 'clock_timestamp()',
      },
    );
    const { statusChangedAt } = await this.manager.findOneOrFail(Batch, {
      select: { id: true, statusChangedAt: true },
      where: { id: batch.id },
    });
    Object.assign(batch, {
      status,
      statusReason: why,
      statusChangedBy: { id: actor.id } as User,
      statusChangedAt,
    });
    return batch;
  }

  /**
   * A returned item goes into the quarantine of the batch it was sold from,
   * whatever that batch's status or expiry (BR11, DEC-04). How much a sale
   * line can take back is the calling use case's check (UC08).
   */
  async receiveReturn(
    actor: Actor,
    batchId: string,
    quantity: number,
    returnLineId: string,
  ): Promise<StockMovement> {
    requirePositive(quantity);
    const batch = await this.lockBatchOf(batchId);
    return this.write(actor, batch, {
      deltaSellable: 0,
      deltaQuarantine: quantity,
      deltaPendingDestruction: 0,
      type: MovementType.RETURN,
      sourceDocumentType: SourceDocumentType.RETURN_LINE,
      sourceDocumentId: returnLineId,
      reason: null,
      reversesMovement: null,
    });
  }

  /**
   * Moves the whole sellable quantity of a batch that is expired on
   * `businessDate` or not ACTIVE to pending destruction (FR-36). Damaged
   * stock of an active, unexpired batch is a stock-take adjustment instead.
   */
  async writeOff(
    actor: Actor,
    batchId: string,
    reason: string,
    businessDate: string,
  ): Promise<StockMovement> {
    const why = requireReason(reason, 'Say why the batch is written off.');
    const batch = await this.lockBatchOf(batchId);
    return this.serialized(() =>
      this.writeOffNow(actor, batch, why, businessDate),
    );
  }

  private writeOffNow(
    actor: Actor,
    batch: Batch,
    why: string,
    businessDate: string,
  ): Promise<StockMovement> {
    if (
      batch.status === BatchStatus.ACTIVE &&
      !isExpired(batch, businessDate)
    ) {
      throw new BusinessRuleViolation(
        'FR-36',
        'BATCH_STILL_SELLABLE',
        `Batch ${batch.batchNumber} is active and expires on ${batch.expiryDate}; only an expired batch or one that is not active can be written off.`,
      );
    }
    if (batch.qtySellable === 0) {
      throw new BusinessRuleViolation(
        'FR-36',
        'NOTHING_TO_WRITE_OFF',
        `Batch ${batch.batchNumber} has nothing left to write off.`,
      );
    }
    return this.writeNow(actor, batch, {
      deltaSellable: -batch.qtySellable,
      deltaQuarantine: 0,
      deltaPendingDestruction: batch.qtySellable,
      type: MovementType.WRITE_OFF,
      sourceDocumentType: SourceDocumentType.BATCH,
      sourceDocumentId: batch.id,
      reason: why,
      reversesMovement: null,
    });
  }

  /**
   * Returns quarantined units to sellable stock after an assessment
   * (FR-46). Allowed only for an ACTIVE batch that is not expired on
   * `businessDate`, of a medicine that is not controlled (DEC-04).
   */
  async release(
    actor: Actor,
    batchId: string,
    quantity: number,
    returnLineId: string,
    businessDate: string,
  ): Promise<StockMovement> {
    requirePositive(quantity);
    const batch = await this.lockBatchOf(batchId);
    const medicine = await this.manager.findOneOrFail(Medicine, {
      select: { id: true, classification: true },
      where: { id: batch.medicine.id },
    });
    return this.serialized(() => {
      const refusal =
        medicine.classification === MedicineClassification.CONTROLLED
          ? 'a controlled medicine that was returned never goes back on the shelf'
          : isExpired(batch, businessDate)
            ? `batch ${batch.batchNumber} expired on ${batch.expiryDate}`
            : batch.status !== BatchStatus.ACTIVE
              ? `batch ${batch.batchNumber} is ${STATUS_LABEL[batch.status]}`
              : null;
      if (refusal) {
        throw new BusinessRuleViolation(
          'BR11',
          'CANNOT_RELEASE',
          `Cannot release to sellable stock: ${refusal}. Reject it instead.`,
        );
      }
      return this.writeNow(actor, batch, {
        deltaSellable: quantity,
        deltaQuarantine: -quantity,
        deltaPendingDestruction: 0,
        type: MovementType.RELEASE,
        sourceDocumentType: SourceDocumentType.RETURN_LINE,
        sourceDocumentId: returnLineId,
        reason: null,
        reversesMovement: null,
      });
    });
  }

  /** Moves quarantined units to pending destruction after an assessment (FR-46). */
  async reject(
    actor: Actor,
    batchId: string,
    quantity: number,
    returnLineId: string,
  ): Promise<StockMovement> {
    requirePositive(quantity);
    const batch = await this.lockBatchOf(batchId);
    return this.write(actor, batch, {
      deltaSellable: 0,
      deltaQuarantine: -quantity,
      deltaPendingDestruction: quantity,
      type: MovementType.REJECT,
      sourceDocumentType: SourceDocumentType.RETURN_LINE,
      sourceDocumentId: returnLineId,
      reason: null,
      reversesMovement: null,
    });
  }

  /**
   * Records that units pending destruction were destroyed (FR-47). The reason
   * says how and who witnessed it. Until then the stock stays pending.
   */
  async destroy(
    actor: Actor,
    batchId: string,
    quantity: number,
    reason: string,
  ): Promise<StockMovement> {
    const why = requireReason(
      reason,
      'Say how the stock was destroyed and who witnessed it.',
    );
    requirePositive(quantity);
    const batch = await this.lockBatchOf(batchId);
    return this.write(actor, batch, {
      deltaSellable: 0,
      deltaQuarantine: 0,
      deltaPendingDestruction: -quantity,
      type: MovementType.DESTROY,
      sourceDocumentType: SourceDocumentType.BATCH,
      sourceDocumentId: batch.id,
      reason: why,
      reversesMovement: null,
    });
  }

  /**
   * Locks one batch for a batch command, locking its medicine first unless
   * this transaction already holds it (the same order as `reverse`).
   */
  private async lockBatchOf(batchId: string): Promise<Batch> {
    const held = this.lockedBatches.get(batchId.toLowerCase());
    if (held) return held;
    const row = await this.manager
      .createQueryBuilder(Batch, 'b')
      .leftJoin('b.medicine', 'medicine')
      .addSelect('medicine.id')
      .where('b.id = :batchId', { batchId })
      .getOne();
    if (!row) throw new NotFound('Batch', batchId);
    await this.lockMedicines([row.medicine.id]);
    const [batch] = await this.lockBatches([row.id]);
    return batch;
  }

  private write(
    actor: Actor,
    batch: Batch,
    movement: Parameters<LedgerTransaction['writeNow']>[2],
  ): Promise<StockMovement> {
    return this.serialized(() => this.writeNow(actor, batch, movement));
  }

  /**
   * Runs `work` after every earlier write of this transaction, so a check
   * and the write that depends on it always see the same batch state.
   */
  private serialized<T>(work: () => Promise<T>): Promise<T> {
    const next = this.writes.then(work);
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
