import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager, MoreThan } from 'typeorm';
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
  DispenseLine,
  MovementType,
  Prescription,
  PrescriptionItem,
  PrescriptionStatus,
  ProcessedRequest,
  SourceDocumentType,
} from '../entities/index.js';
import type { ExpiryWarning } from '../issuing/expiry-policy.js';
import {
  type AllocatedLine,
  type BatchCandidate,
  FefoAllocator,
} from '../issuing/fefo-allocator.js';
import { PrescriptionValidator } from '../prescriptions/prescription-validator.js';
import { Clock } from '../stock/clock.js';
import { type LedgerTransaction, StockLedger } from '../stock/stock-ledger.js';
import type {
  DispenseDto,
  DispenseItemDto,
  DispensePreviewDto,
} from './dto/dispense.dto.js';

const COMMAND = 'dispense';

interface MedicineRef {
  id: string;
  code: string;
  name: string;
}

interface BatchLineView {
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  warning: ExpiryWarning | null;
}

export interface DispensePreviewView {
  prescriptionId: string;
  items: Array<{
    prescriptionItemId: string;
    medicine: MedicineRef;
    requested: number;
    available: number;
    quantityOutstanding: number;
    batches: BatchLineView[];
    needsPartialSupplyNote: boolean;
  }>;
}

export interface DispenseResultView {
  requestId: string;
  prescriptionId: string;
  status: PrescriptionStatus;
  dispensedAt: string;
  items: Array<{
    prescriptionItemId: string;
    medicine: MedicineRef;
    quantityDispensed: number;
    quantityOutstanding: number;
    lines: Array<BatchLineView & { dispenseLineId: string }>;
  }>;
}

/** One requested item with what FEFO chose for it. */
interface Planned {
  index: number;
  request: DispenseItemDto;
  item: PrescriptionItem;
  lines: AllocatedLine<BatchCandidate>[];
  available: number;
}

/**
 * UC06 — dispense against a verified prescription.
 *
 * `preview` shows what FEFO would issue and changes nothing (DEC-05).
 * `dispense` is the confirmed hand-over and the only step that moves stock
 * (FR-45). It runs in one StockLedger transaction and locks, in this order:
 * the prescription, its items, the medicines (one call), the eligible
 * batches. Two pharmacists working on the same prescription therefore queue
 * on the prescription row, so the outstanding quantity read here is still
 * true when it is written (BR07, TC-54).
 */
@Injectable()
export class DispensingService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ledger: StockLedger,
    private readonly clock: Clock,
  ) {}

  async preview(
    actor: Actor,
    dto: DispensePreviewDto,
  ): Promise<DispensePreviewView> {
    assertPermission(actor, Permission.DISPENSE);
    this.checkDistinctItems(dto);
    const today = this.clock.today();
    const manager = this.dataSource.manager;
    const prescription = await manager.findOne(Prescription, {
      where: { id: dto.prescriptionId },
      relations: { prescriber: true },
    });
    if (!prescription) throw new NotFound('Prescription', dto.prescriptionId);
    this.checkPrescription(prescription, today);
    const items = await this.loadItems(manager, dto, false);

    const stock = new Map<string, BatchCandidate[]>();
    for (const medicineId of new Set(items.map((i) => i.medicine.id))) {
      stock.set(
        medicineId,
        await manager.find(Batch, {
          where: { medicine: { id: medicineId }, qtySellable: MoreThan(0) },
        }),
      );
    }
    const planned = this.plan(dto, items, stock, today);
    return {
      prescriptionId: prescription.id,
      items: planned.map((p) => ({
        prescriptionItemId: p.item.id,
        medicine: medicineRef(p.item),
        requested: p.request.quantity,
        available: p.available,
        quantityOutstanding: outstanding(p.item),
        batches: p.lines.map(batchLineView),
        needsPartialSupplyNote: p.request.quantity < outstanding(p.item),
      })),
    };
  }

  async dispense(actor: Actor, dto: DispenseDto): Promise<DispenseResultView> {
    assertPermission(actor, Permission.DISPENSE);
    this.checkDistinctItems(dto);
    const payloadHash = hashPayload(dto);

    return this.ledger.run(async (tx) => {
      const manager = tx.manager;
      const today = this.clock.today();
      const prescription = await this.lockPrescription(
        manager,
        dto.prescriptionId,
      );

      // FR-23. Checked after the prescription lock, so a repeat of the same
      // request waits for the first one and then finds its stored result.
      const done = await manager.findOneBy(ProcessedRequest, {
        requestId: dto.requestId,
      });
      if (done) {
        if (done.commandType !== COMMAND || done.payloadHash !== payloadHash) {
          throw new Conflict(
            'REQUEST_ID_REUSED',
            'This request ID was already used for a different request.',
            'requestId',
          );
        }
        return done.result as DispenseResultView;
      }

      this.checkPrescription(prescription, today);
      const items = await this.loadItems(manager, dto, true);
      this.checkPartialSupplyNotes(dto, items);

      await tx.lockMedicines(items.map((i) => i.medicine.id));
      const stock = new Map<string, BatchCandidate[]>();
      for (const medicineId of new Set(items.map((i) => i.medicine.id))) {
        stock.set(medicineId, await tx.lockEligibleBatches(medicineId, today));
      }
      const planned = this.plan(dto, items, stock, today);
      const shortages: FieldError[] = planned
        .filter((p) => p.lines.length === 0)
        .map((p) => ({
          field: `items.${p.index}.quantity`,
          message: `Only ${p.available} can be issued now.`,
        }));
      if (shortages.length > 0) {
        throw new BusinessRuleViolation(
          'BR03',
          'INSUFFICIENT_STOCK',
          'Not enough stock that can be issued; nothing was dispensed.',
          shortages,
        );
      }

      const result = await this.handOver(actor, tx, prescription, planned);
      const view: DispenseResultView = {
        requestId: dto.requestId,
        prescriptionId: prescription.id,
        status: result.status,
        dispensedAt: this.clock.now().toISOString(),
        items: result.items,
      };
      await manager.save(
        manager.create(ProcessedRequest, {
          requestId: dto.requestId,
          commandType: COMMAND,
          payloadHash,
          result: view,
          user: { id: actor.id },
        }),
      );
      return view;
    });
  }

  /** Writes the dispense lines and DISPENSE movements, then the new quantities and status. */
  private async handOver(
    actor: Actor,
    tx: LedgerTransaction,
    prescription: Prescription,
    planned: Planned[],
  ) {
    const manager = tx.manager;
    const items: DispenseResultView['items'] = [];
    for (const p of planned) {
      const lines: DispenseResultView['items'][number]['lines'] = [];
      for (const allocated of p.lines) {
        const line = await manager.save(
          manager.create(DispenseLine, {
            quantity: allocated.quantity,
            prescription: { id: prescription.id },
            prescriptionItem: { id: p.item.id },
            batch: { id: allocated.batch.id },
            dispensedBy: { id: actor.id },
            partialSupplyNote: p.request.partialSupplyNote ?? null,
          }),
        );
        await tx.post(actor, {
          batchId: allocated.batch.id,
          type: MovementType.DISPENSE,
          deltaSellable: -allocated.quantity,
          sourceDocumentType: SourceDocumentType.DISPENSE_LINE,
          sourceDocumentId: line.id,
        });
        lines.push({ dispenseLineId: line.id, ...batchLineView(allocated) });
      }
      p.item.quantityDispensed += p.request.quantity;
      await manager.update(
        PrescriptionItem,
        { id: p.item.id },
        { quantityDispensed: p.item.quantityDispensed },
      );
      items.push({
        prescriptionItemId: p.item.id,
        medicine: medicineRef(p.item),
        quantityDispensed: p.item.quantityDispensed,
        quantityOutstanding: outstanding(p.item),
        lines,
      });
    }

    const all = await manager.find(PrescriptionItem, {
      where: { prescription: { id: prescription.id } },
    });
    const status = all.every((i) => i.quantityDispensed >= i.quantityPrescribed)
      ? PrescriptionStatus.FULLY_DISPENSED
      : PrescriptionStatus.PARTIALLY_DISPENSED;
    await manager.update(Prescription, { id: prescription.id }, { status });
    return { status, items };
  }

  /**
   * FEFO for every requested item. Items of the same medicine draw from the
   * same batches, so each one sees what the earlier ones already took.
   */
  private plan(
    dto: DispensePreviewDto,
    items: PrescriptionItem[],
    stock: Map<string, BatchCandidate[]>,
    today: string,
  ): Planned[] {
    const left = new Map<string, number>();
    return dto.items.map((request, index) => {
      const item = items[index];
      const batches = (stock.get(item.medicine.id) ?? []).map((b) => ({
        ...b,
        qtySellable: left.get(b.id) ?? b.qtySellable,
      }));
      const allocation = FefoAllocator.allocate({
        batches,
        quantity: request.quantity,
        businessDate: today,
        alertDays: item.medicine.expiryAlertDays,
        daysOfUse: item.daysOfUse,
      });
      for (const line of allocation.lines) {
        left.set(line.batch.id, line.batch.qtySellable - line.quantity);
      }
      return {
        index,
        request,
        item,
        lines: allocation.lines,
        available: allocation.available,
      };
    });
  }

  /** BR04, BR10 (`PrescriptionValidator`); the prescriber must be loaded. */
  private checkPrescription(prescription: Prescription, today: string): void {
    PrescriptionValidator.assertDispensable(
      {
        status: prescription.status,
        validUntil: prescription.validUntil,
        prescriberActive: prescription.prescriber.isActive,
      },
      today,
    );
  }

  /**
   * The requested items, in request order, each checked against the
   * prescription (BR07, FR-02). With `lock`, the rows are locked so the
   * outstanding quantity cannot change before this transaction commits.
   */
  private async loadItems(
    manager: EntityManager,
    dto: DispensePreviewDto,
    lock: boolean,
  ): Promise<PrescriptionItem[]> {
    const qb = manager
      .createQueryBuilder(PrescriptionItem, 'i')
      .innerJoinAndSelect('i.medicine', 'medicine')
      .where('i.prescription_id = :id', { id: dto.prescriptionId })
      .orderBy('i.id', 'ASC');
    if (lock) qb.setLock('pessimistic_write', undefined, ['i']);
    const byId = new Map((await qb.getMany()).map((i) => [i.id, i]));

    const errors: FieldError[] = [];
    const items = dto.items.map((request, index) => {
      const item = byId.get(request.prescriptionItemId);
      if (!item) {
        errors.push({
          field: `items.${index}.prescriptionItemId`,
          message: 'This item is not on the prescription.',
        });
      }
      return item!;
    });
    if (errors.length > 0) throw new ValidationFailed(errors);

    PrescriptionValidator.assertWithinPrescribed(
      items,
      dto.items.map((request) => request.quantity),
    );
    const inactive: FieldError[] = [];
    items.forEach((item, index) => {
      if (!item.medicine.isActive) {
        inactive.push({
          field: `items.${index}.prescriptionItemId`,
          message: 'This medicine is deactivated and cannot be dispensed.',
        });
      }
    });
    if (inactive.length > 0) {
      throw new BusinessRuleViolation(
        'FR-02',
        'MEDICINE_INACTIVE',
        'A medicine on this hand-over is deactivated.',
        inactive,
      );
    }
    return items;
  }

  /** DEC-02: handing over less than is outstanding needs the pharmacist's note. */
  private checkPartialSupplyNotes(
    dto: DispensePreviewDto,
    items: PrescriptionItem[],
  ): void {
    const errors: FieldError[] = [];
    dto.items.forEach((request, index) => {
      if (
        request.quantity < outstanding(items[index]) &&
        !request.partialSupplyNote
      ) {
        errors.push({
          field: `items.${index}.partialSupplyNote`,
          message:
            'Part of this item stays outstanding: confirm the treatment was assessed and discussed with the customer.',
        });
      }
    });
    if (errors.length > 0) throw new ValidationFailed(errors);
  }

  private checkDistinctItems(dto: DispensePreviewDto): void {
    const seen = new Set<string>();
    const errors: FieldError[] = [];
    dto.items.forEach((item, index) => {
      if (seen.has(item.prescriptionItemId)) {
        errors.push({
          field: `items.${index}.prescriptionItemId`,
          message: 'Each prescription item can appear only once.',
        });
      }
      seen.add(item.prescriptionItemId);
    });
    if (errors.length > 0) throw new ValidationFailed(errors);
  }

  private async lockPrescription(
    manager: EntityManager,
    id: string,
  ): Promise<Prescription> {
    const prescription = await manager
      .createQueryBuilder(Prescription, 'p')
      .innerJoinAndSelect('p.prescriber', 'prescriber')
      .where('p.id = :id', { id })
      .setLock('pessimistic_write', undefined, ['p'])
      .getOne();
    if (!prescription) throw new NotFound('Prescription', id);
    return prescription;
  }
}

const outstanding = PrescriptionValidator.outstanding;

function medicineRef(item: PrescriptionItem): MedicineRef {
  return {
    id: item.medicine.id,
    code: item.medicine.code,
    name: item.medicine.name,
  };
}

function batchLineView(line: AllocatedLine<BatchCandidate>): BatchLineView {
  return {
    batchId: line.batch.id,
    batchNumber: line.batch.batchNumber,
    expiryDate: line.batch.expiryDate,
    quantity: line.quantity,
    warning: line.warning,
  };
}

/** SHA-256 of the request without its ID, items in a fixed order (FR-23). */
export function hashPayload(dto: DispenseDto): string {
  const items = [...dto.items]
    .map((i) => [i.prescriptionItemId, i.quantity, i.partialSupplyNote ?? null])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return createHash('sha256')
    .update(JSON.stringify([dto.prescriptionId, items]))
    .digest('hex');
}
