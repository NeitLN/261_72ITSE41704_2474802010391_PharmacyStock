import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, MoreThan } from 'typeorm';
import { type Actor, assertPermission } from '../auth/actor.js';
import { Permission } from '../auth/permissions.js';
import { NotFound, ValidationFailed } from '../common/errors.js';
import {
  Batch,
  type BatchStatus,
  DestructionMethod,
  DestructionRecord,
} from '../entities/index.js';
import { Clock } from '../stock/clock.js';
import { StockLedger } from '../stock/stock-ledger.js';

export interface BatchView {
  id: string;
  batchNumber: string;
  expiryDate: string;
  status: BatchStatus;
  statusReason: string | null;
  statusChangedBy: { id: string; fullName: string } | null;
  statusChangedAt: Date | null;
  qtySellable: number;
  qtyQuarantine: number;
  qtyPendingDestruction: number;
  medicine: { id: string; code: string; name: string };
}

export interface DestructionInput {
  quantity: number;
  destroyedOn: string;
  method: DestructionMethod;
  methodNote?: string | null;
  witness: string;
  note?: string | null;
}

export interface DestructionView {
  id: string;
  batch: { id: string; batchNumber: string };
  quantity: number;
  destroyedOn: string;
  method: DestructionMethod;
  methodNote: string | null;
  witness: string;
  note: string | null;
  recordedBy: { id: string; fullName: string };
  recordedAt: Date;
  movement: { id: string; deltaPendingDestruction: number };
}

const METHOD_LABEL: Record<DestructionMethod, string> = {
  [DestructionMethod.SUPPLIER_RETURN]: 'returned to the supplier',
  [DestructionMethod.LICENSED_CONTRACTOR]: 'destroyed by a licensed contractor',
  [DestructionMethod.OTHER]: 'other',
};

/**
 * UC11 write-off (FR-36) and batch status (FR-48). The rules are the
 * ledger's (#55): `writeOff` takes the whole sellable quantity of a batch
 * that is expired or not ACTIVE to pending destruction; `setBatchStatus`
 * needs a reason and keeps REJECTED final. Both lock the medicine first, so
 * `StockLedger.run` re-evaluates its low-stock and expiry alerts before the
 * commit (UC10, UC11). Nothing is recorded as destroyed here.
 */
@Injectable()
export class BatchesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ledger: StockLedger,
    private readonly clock: Clock,
  ) {}

  async writeOff(
    actor: Actor,
    batchId: string,
    reason: string,
  ): Promise<{
    batch: BatchView;
    movement: { id: string; deltaSellable: number; deltaPendingDestruction: number };
  }> {
    assertPermission(actor, Permission.BATCH_STATUS_MANAGE);
    await this.ensureExists(batchId);
    const movement = await this.ledger.run((tx) =>
      tx.writeOff(actor, batchId, reason, this.clock.today()),
    );
    return {
      batch: await this.view(batchId),
      movement: {
        id: movement.id,
        deltaSellable: movement.deltaSellable,
        deltaPendingDestruction: movement.deltaPendingDestruction,
      },
    };
  }

  async setStatus(
    actor: Actor,
    batchId: string,
    status: BatchStatus,
    reason: string,
  ): Promise<BatchView> {
    assertPermission(actor, Permission.BATCH_STATUS_MANAGE);
    await this.ensureExists(batchId);
    await this.ledger.run((tx) => tx.setBatchStatus(actor, batchId, status, reason));
    return this.view(batchId);
  }

  /** Batches holding stock that is pending destruction (FR-47). */
  async pendingDestruction(actor: Actor): Promise<BatchView[]> {
    assertPermission(actor, Permission.BATCH_STATUS_MANAGE);
    const batches = await this.dataSource.manager.find(Batch, {
      select: { id: true },
      where: { qtyPendingDestruction: MoreThan(0) },
      order: { expiryDate: 'ASC', batchNumber: 'ASC' },
    });
    return Promise.all(batches.map((b) => this.view(b.id)));
  }

  /**
   * Records that pending stock was destroyed (FR-47, DEC-04): one DESTROY
   * movement through the ledger and its record, in one transaction. Until
   * this is done the stock stays *pending destruction*.
   */
  async recordDestruction(
    actor: Actor,
    batchId: string,
    input: DestructionInput,
  ): Promise<DestructionView> {
    assertPermission(actor, Permission.BATCH_STATUS_MANAGE);
    if (input.destroyedOn > this.clock.today()) {
      throw ValidationFailed.field(
        'destroyedOn',
        'The date of destruction cannot be in the future.',
      );
    }
    const methodNote = input.methodNote?.trim() || null;
    if (input.method === DestructionMethod.OTHER && !methodNote) {
      throw ValidationFailed.field('methodNote', 'Say how it was destroyed.');
    }
    await this.ensureExists(batchId);
    const witness = input.witness.trim();
    const id = await this.ledger.run(async (tx) => {
      const how = methodNote
        ? `${METHOD_LABEL[input.method]}: ${methodNote}`
        : METHOD_LABEL[input.method];
      const movement = await tx.destroy(
        actor,
        batchId,
        input.quantity,
        `Destroyed on ${input.destroyedOn}, ${how}; witness ${witness}`,
      );
      const record = await tx.manager.save(
        tx.manager.create(DestructionRecord, {
          batch: { id: batchId },
          quantity: input.quantity,
          destroyedOn: input.destroyedOn,
          method: input.method,
          methodNote,
          witness,
          note: input.note?.trim() || null,
          movement: { id: movement.id },
          recordedBy: { id: actor.id },
        }),
      );
      return record.id;
    });
    return (await this.records({ id }))[0];
  }

  /** A batch's destruction records, newest first. */
  async destructions(actor: Actor, batchId: string): Promise<DestructionView[]> {
    assertPermission(actor, Permission.BATCH_STATUS_MANAGE);
    await this.ensureExists(batchId);
    return this.records({ batch: { id: batchId } });
  }

  private async records(
    where: { id: string } | { batch: { id: string } },
  ): Promise<DestructionView[]> {
    const records = await this.dataSource.manager.find(DestructionRecord, {
      where,
      relations: { batch: true, recordedBy: true, movement: true },
      order: { recordedAt: 'DESC' },
    });
    return records.map((r) => ({
      id: r.id,
      batch: { id: r.batch.id, batchNumber: r.batch.batchNumber },
      quantity: r.quantity,
      destroyedOn: r.destroyedOn,
      method: r.method,
      methodNote: r.methodNote,
      witness: r.witness,
      note: r.note,
      recordedBy: { id: r.recordedBy.id, fullName: r.recordedBy.fullName },
      recordedAt: r.recordedAt,
      movement: {
        id: r.movement.id,
        deltaPendingDestruction: r.movement.deltaPendingDestruction,
      },
    }));
  }

  /** 404 for an unknown batch in the path, before any lock is taken. */
  private async ensureExists(batchId: string): Promise<void> {
    if (!(await this.dataSource.manager.existsBy(Batch, { id: batchId }))) {
      throw new NotFound('Batch', batchId);
    }
  }

  private async view(batchId: string): Promise<BatchView> {
    const b = await this.dataSource.manager.findOneOrFail(Batch, {
      where: { id: batchId },
      relations: { medicine: true, statusChangedBy: true },
    });
    return {
      id: b.id,
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate,
      status: b.status,
      statusReason: b.statusReason,
      statusChangedBy: b.statusChangedBy
        ? { id: b.statusChangedBy.id, fullName: b.statusChangedBy.fullName }
        : null,
      statusChangedAt: b.statusChangedAt,
      qtySellable: b.qtySellable,
      qtyQuarantine: b.qtyQuarantine,
      qtyPendingDestruction: b.qtyPendingDestruction,
      medicine: { id: b.medicine.id, code: b.medicine.code, name: b.medicine.name },
    };
  }
}
