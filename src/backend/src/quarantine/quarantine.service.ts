import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { type Actor, assertPermission } from '../auth/actor.js';
import { Permission } from '../auth/permissions.js';
import { Conflict, NotFound, ValidationFailed } from '../common/errors.js';
import {
  BatchStatus,
  MedicineClassification,
  ReturnAssessmentStatus,
  ReturnLine,
} from '../entities/index.js';
import { ExpiryPolicy } from '../issuing/expiry-policy.js';
import { Clock } from '../stock/clock.js';
import { StockLedger } from '../stock/stock-ledger.js';

/** Why a line cannot be released; it can still be rejected. */
export type ReleaseBlock = 'controlled' | 'expired' | 'batch_not_active';

export interface QuarantineLineView {
  returnLineId: string;
  saleReturn: {
    id: string;
    referenceNumber: string;
    returnedAt: Date;
    reason: string;
  };
  medicine: {
    id: string;
    code: string;
    name: string;
    classification: MedicineClassification;
  };
  batch: { id: string; batchNumber: string; expiryDate: string; status: BatchStatus };
  quantity: number;
  releaseBlockedBy: ReleaseBlock | null;
}

export interface AssessInput {
  outcome: 'release' | 'reject';
  packagingIntact: boolean;
  storageCredible: boolean;
  note: string;
}

export interface AssessedLineView {
  returnLineId: string;
  assessmentStatus: ReturnAssessmentStatus;
  assessedBy: { id: string; fullName: string };
  assessedAt: Date;
  assessmentNote: string;
  movement: {
    id: string;
    type: string;
    deltaSellable: number;
    deltaQuarantine: number;
    deltaPendingDestruction: number;
  };
}

/**
 * UC11 assessment of returned goods in quarantine (FR-46, BR11, DEC-04).
 * A release goes back to sellable stock only when the medicine is not
 * controlled, the batch is ACTIVE and not expired, and the manager confirms
 * the packaging and the storage; a reject goes to pending destruction. The
 * stock rules are the ledger's (`release`, `reject`, #55); this service adds
 * the manager's confirmations and records the outcome on the return line in
 * the same transaction.
 */
@Injectable()
export class QuarantineService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ledger: StockLedger,
    private readonly clock: Clock,
  ) {}

  /** Return lines waiting for assessment, oldest return first. */
  async list(actor: Actor): Promise<QuarantineLineView[]> {
    assertPermission(actor, Permission.BATCH_STATUS_MANAGE);
    const today = this.clock.today();
    const lines = await this.dataSource.getRepository(ReturnLine).find({
      where: { assessmentStatus: ReturnAssessmentStatus.PENDING_ASSESSMENT },
      relations: { saleReturn: true, saleLine: { batch: { medicine: true } } },
      order: { saleReturn: { returnedAt: 'ASC' }, id: 'ASC' },
    });
    return lines.map((line) => {
      const { batch } = line.saleLine;
      const { medicine } = batch;
      return {
        returnLineId: line.id,
        saleReturn: {
          id: line.saleReturn.id,
          referenceNumber: line.saleReturn.referenceNumber,
          returnedAt: line.saleReturn.returnedAt,
          reason: line.saleReturn.reason,
        },
        medicine: {
          id: medicine.id,
          code: medicine.code,
          name: medicine.name,
          classification: medicine.classification,
        },
        batch: {
          id: batch.id,
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate,
          status: batch.status,
        },
        quantity: line.quantity,
        releaseBlockedBy:
          medicine.classification === MedicineClassification.CONTROLLED
            ? 'controlled'
            : !ExpiryPolicy.isIssuable(batch.expiryDate, today)
              ? 'expired'
              : batch.status !== BatchStatus.ACTIVE
                ? 'batch_not_active'
                : null,
      };
    });
  }

  /** Release to sellable stock or reject to pending destruction (FR-46). */
  async assess(
    actor: Actor,
    returnLineId: string,
    input: AssessInput,
  ): Promise<AssessedLineView> {
    assertPermission(actor, Permission.BATCH_STATUS_MANAGE);
    if (input.outcome === 'release') {
      // The two checks only a person can make (DEC-04).
      if (!input.packagingIntact) {
        throw ValidationFailed.field(
          'packagingIntact',
          'Release only goods whose packaging is intact. Reject them otherwise.',
        );
      }
      if (!input.storageCredible) {
        throw ValidationFailed.field(
          'storageCredible',
          'Release only goods that were plausibly stored correctly. Reject them otherwise.',
        );
      }
    }
    const today = this.clock.today();
    return this.ledger.run(async (tx) => {
      const { manager } = tx;
      // The line first, so two managers assessing it at once queue here and
      // the second finds it already assessed (409). The ledger then locks
      // the medicine, then the batch.
      const locked = await manager.query<Array<{ id: string }>>(
        'SELECT id FROM return_lines WHERE id = $1 FOR UPDATE',
        [returnLineId],
      );
      if (locked.length === 0) throw new NotFound('Return line', returnLineId);
      const line = await manager.findOneOrFail(ReturnLine, {
        where: { id: returnLineId },
        relations: { saleLine: { batch: true } },
      });
      if (line.assessmentStatus !== ReturnAssessmentStatus.PENDING_ASSESSMENT) {
        throw new Conflict(
          'ALREADY_ASSESSED',
          `This return line was already ${line.assessmentStatus}.`,
        );
      }
      const batchId = line.saleLine.batch.id;
      const movement =
        input.outcome === 'release'
          ? await tx.release(actor, batchId, line.quantity, line.id, today)
          : await tx.reject(actor, batchId, line.quantity, line.id);
      const assessedAt = this.clock.now();
      const assessmentStatus =
        input.outcome === 'release'
          ? ReturnAssessmentStatus.RELEASED
          : ReturnAssessmentStatus.REJECTED;
      await manager.update(ReturnLine, line.id, {
        assessmentStatus,
        assessedBy: { id: actor.id },
        assessedAt,
        assessmentNote: input.note,
      });
      return {
        returnLineId: line.id,
        assessmentStatus,
        assessedBy: { id: actor.id, fullName: actor.fullName },
        assessedAt,
        assessmentNote: input.note,
        movement: {
          id: movement.id,
          type: movement.type,
          deltaSellable: movement.deltaSellable,
          deltaQuarantine: movement.deltaQuarantine,
          deltaPendingDestruction: movement.deltaPendingDestruction,
        },
      };
    });
  }
}
