import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { type Actor, assertPermission } from '../auth/actor.js';
import { Permission } from '../auth/permissions.js';
import { NotFound } from '../common/errors.js';
import { Batch, type BatchStatus } from '../entities/index.js';
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
