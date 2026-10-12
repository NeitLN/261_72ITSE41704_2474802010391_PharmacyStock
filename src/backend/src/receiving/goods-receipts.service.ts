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
import {
  BatchStatus,
  GoodsReceipt,
  GoodsReceiptLine,
  Medicine,
  MovementType,
  SourceDocumentType,
  Supplier,
} from '../entities/index.js';
import { Clock } from '../stock/clock.js';
import { StockLedger } from '../stock/stock-ledger.js';
import type {
  CreateGoodsReceiptDto,
  ListGoodsReceiptsQuery,
} from './dto/goods-receipt.dto.js';

/** A receipt as the API returns it. Money is a numeric string, e.g. "1500.00". */
export interface GoodsReceiptView {
  id: string;
  documentNumber: string;
  receiptDate: string;
  note: string | null;
  totalCost: string;
  supplier: { id: string; name: string };
  receivedBy: { id: string; fullName: string };
  createdAt: Date;
  lines: Array<{
    lineNumber: number;
    medicine: { id: string; code: string; name: string };
    batch: {
      id: string;
      batchNumber: string;
      expiryDate: string;
      qtySellable: number;
    };
    quantity: number;
    unitCost: string;
  }>;
}

export interface GoodsReceiptSummary {
  id: string;
  documentNumber: string;
  receiptDate: string;
  totalCost: string;
  supplier: { id: string; name: string };
  lineCount: number;
  createdAt: Date;
}

/** VND with two decimals held as whole cents, so totals never use floats. */
function toCents(amount: number): bigint {
  return BigInt(Math.round(amount * 100));
}

function centsToString(cents: bigint): string {
  const sign = cents < 0n ? '-' : '';
  const abs = cents < 0n ? -cents : cents;
  return `${sign}${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`;
}

/**
 * UC03 Record a goods receipt (FR-06 to FR-09, BR05).
 *
 * The receipt, its lines, any new batches and one RECEIPT movement per line
 * are written in one StockLedger transaction: if any line fails, nothing is
 * saved (FR-09, TC-25).
 */
@Injectable()
export class GoodsReceiptsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ledger: StockLedger,
    private readonly clock: Clock,
  ) {}

  async create(
    actor: Actor,
    dto: CreateGoodsReceiptDto,
  ): Promise<GoodsReceiptView> {
    assertPermission(actor, Permission.GOODS_RECEIPT_CREATE);
    this.checkDates(dto);

    let receiptId: string;
    try {
      receiptId = await this.ledger.run(async (tx) => {
        const manager = tx.manager;
        const supplier = await manager.findOneBy(Supplier, {
          id: dto.supplierId,
        });
        if (!supplier || !supplier.isActive) {
          throw ValidationFailed.field(
            'supplierId',
            supplier ? 'This supplier is deactivated.' : 'Choose a supplier.',
          );
        }
        await this.assertDocumentFree(manager, supplier.id, dto.documentNumber);

        // Step 1 of the lock protocol: every medicine on the receipt.
        // Checked before locking for clear per-line errors, and again after,
        // so a medicine deactivated meanwhile is still refused.
        const medicineIds = dto.lines.map((l) => l.medicineId);
        await this.checkMedicines(manager, dto);
        await tx.lockMedicines(medicineIds);
        await this.checkMedicines(manager, dto);

        const totalCents = dto.lines.reduce(
          (sum, l) => sum + BigInt(l.quantity) * toCents(l.unitCost),
          0n,
        );
        const receipt = await manager.save(
          manager.create(GoodsReceipt, {
            supplier,
            documentNumber: dto.documentNumber,
            receiptDate: dto.receiptDate,
            note: dto.note ?? null,
            totalCost: centsToString(totalCents),
            receivedBy: { id: actor.id },
          }),
        );

        const receivedAt = this.clock.now();
        for (const [index, line] of dto.lines.entries()) {
          const unitCost = centsToString(toCents(line.unitCost));
          let batch = await tx.lockBatchByNumber(
            line.medicineId,
            line.batchNumber,
          );
          if (batch) {
            // Decision 17: the same batch number again tops it up only if the
            // expiry matches and the batch may still hold sellable stock.
            if (batch.expiryDate !== line.expiryDate) {
              throw ValidationFailed.field(
                `lines.${index}.expiryDate`,
                `Batch ${line.batchNumber} is already recorded with expiry ${batch.expiryDate}.`,
              );
            }
            if (batch.status !== BatchStatus.ACTIVE) {
              throw ValidationFailed.field(
                `lines.${index}.batchNumber`,
                `Batch ${line.batchNumber} is ${batch.status.replace('_', ' ')}; it cannot be received.`,
              );
            }
          } else {
            batch = await tx.createBatch({
              medicineId: line.medicineId,
              batchNumber: line.batchNumber,
              expiryDate: line.expiryDate,
              unitCost,
              receivedAt,
            });
          }

          await manager.save(
            manager.create(GoodsReceiptLine, {
              goodsReceipt: receipt,
              lineNumber: index + 1,
              medicine: { id: line.medicineId },
              batch,
              quantity: line.quantity,
              unitCost,
            }),
          );
          await tx.post(actor, {
            batchId: batch.id,
            type: MovementType.RECEIPT,
            deltaSellable: line.quantity,
            sourceDocumentType: SourceDocumentType.GOODS_RECEIPT,
            sourceDocumentId: receipt.id,
          });
        }
        return receipt.id;
      });
    } catch (error) {
      throw this.translateDuplicate(error);
    }
    return this.view(this.dataSource.manager, receiptId);
  }

  async list(
    actor: Actor,
    query: ListGoodsReceiptsQuery,
  ): Promise<GoodsReceiptSummary[]> {
    assertPermission(actor, Permission.GOODS_RECEIPT_CREATE);
    const qb = this.dataSource
      .getRepository(GoodsReceipt)
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.supplier', 'supplier')
      .orderBy('r.receiptDate', 'DESC')
      .addOrderBy('r.createdAt', 'DESC');
    if (query.supplierId) {
      qb.andWhere('supplier.id = :supplierId', {
        supplierId: query.supplierId,
      });
    }
    const receipts = await qb.getMany();
    const counts: { goods_receipt_id: string; count: string }[] =
      receipts.length === 0
        ? []
        : await this.dataSource.query(
            `SELECT goods_receipt_id, COUNT(*) AS count FROM goods_receipt_lines
              WHERE goods_receipt_id = ANY($1) GROUP BY goods_receipt_id`,
            [receipts.map((r) => r.id)],
          );
    const lineCount = new Map(
      counts.map((c) => [c.goods_receipt_id, Number(c.count)]),
    );
    return receipts.map((r) => ({
      id: r.id,
      documentNumber: r.documentNumber,
      receiptDate: r.receiptDate,
      totalCost: r.totalCost,
      supplier: { id: r.supplier.id, name: r.supplier.name },
      lineCount: lineCount.get(r.id) ?? 0,
      createdAt: r.createdAt,
    }));
  }

  async get(actor: Actor, id: string): Promise<GoodsReceiptView> {
    assertPermission(actor, Permission.GOODS_RECEIPT_CREATE);
    return this.view(this.dataSource.manager, id);
  }

  /** FR-07, TC-49: expiry after the receipt date; the receipt date not in the future. */
  private checkDates(dto: CreateGoodsReceiptDto): void {
    const errors: FieldError[] = [];
    if (dto.receiptDate > this.clock.today()) {
      errors.push({
        field: 'receiptDate',
        message: 'Receipt date cannot be in the future.',
      });
    }
    const seen = new Map<string, number>();
    dto.lines.forEach((line, index) => {
      if (line.expiryDate <= dto.receiptDate) {
        errors.push({
          field: `lines.${index}.expiryDate`,
          message: 'Expiry date must be after the receipt date.',
        });
      }
      const key = `${line.medicineId}|${line.batchNumber}`;
      const first = seen.get(key);
      if (first !== undefined) {
        errors.push({
          field: `lines.${index}.batchNumber`,
          message: `This batch is already on line ${first + 1}.`,
        });
      } else {
        seen.set(key, index);
      }
    });
    if (errors.length > 0) throw new ValidationFailed(errors);
  }

  /** FR-07, TC-46: every medicine exists and is active. */
  private async checkMedicines(
    manager: EntityManager,
    dto: CreateGoodsReceiptDto,
  ): Promise<void> {
    const ids = [...new Set(dto.lines.map((l) => l.medicineId))];
    const medicines = await manager.findBy(
      Medicine,
      ids.map((id) => ({ id })),
    );
    const byId = new Map(medicines.map((m) => [m.id, m]));
    const errors: FieldError[] = [];
    dto.lines.forEach((line, index) => {
      const medicine = byId.get(line.medicineId);
      if (!medicine) {
        errors.push({
          field: `lines.${index}.medicineId`,
          message: 'Choose a medicine.',
        });
      } else if (!medicine.isActive) {
        errors.push({
          field: `lines.${index}.medicineId`,
          message: `${medicine.name} is deactivated and cannot be received.`,
        });
      }
    });
    if (errors.length > 0) throw new ValidationFailed(errors);
  }

  /** FR-08, TC-03: one document number per supplier. */
  private async assertDocumentFree(
    manager: EntityManager,
    supplierId: string,
    documentNumber: string,
  ): Promise<void> {
    const taken = await manager.existsBy(GoodsReceipt, {
      supplier: { id: supplierId },
      documentNumber,
    });
    if (taken) throw this.duplicateDocument(documentNumber);
  }

  private duplicateDocument(documentNumber: string): Conflict {
    return new Conflict(
      'DUPLICATE_DOCUMENT',
      `Document ${documentNumber} is already recorded for this supplier.`,
      'documentNumber',
    );
  }

  /** Two clerks saving the same document at once: the unique index answers. */
  private translateDuplicate(error: unknown): unknown {
    const code =
      error instanceof QueryFailedError
        ? (error.driverError as { code?: string; constraint?: string })
        : undefined;
    if (
      code?.code === '23505' &&
      code.constraint === 'uq_goods_receipt_supplier_document'
    ) {
      return new Conflict(
        'DUPLICATE_DOCUMENT',
        'This document number is already recorded for this supplier.',
        'documentNumber',
      );
    }
    return error;
  }

  private async view(
    manager: EntityManager,
    id: string,
  ): Promise<GoodsReceiptView> {
    const receipt = await manager.findOne(GoodsReceipt, {
      where: { id },
      relations: {
        supplier: true,
        receivedBy: true,
        lines: { medicine: true, batch: true },
      },
      order: { lines: { lineNumber: 'ASC' } },
    });
    if (!receipt) throw new NotFound('Goods receipt', id);
    return {
      id: receipt.id,
      documentNumber: receipt.documentNumber,
      receiptDate: receipt.receiptDate,
      note: receipt.note,
      totalCost: receipt.totalCost,
      supplier: { id: receipt.supplier.id, name: receipt.supplier.name },
      receivedBy: {
        id: receipt.receivedBy.id,
        fullName: receipt.receivedBy.fullName,
      },
      createdAt: receipt.createdAt,
      lines: receipt.lines.map((l) => ({
        lineNumber: l.lineNumber,
        medicine: {
          id: l.medicine.id,
          code: l.medicine.code,
          name: l.medicine.name,
        },
        batch: {
          id: l.batch.id,
          batchNumber: l.batch.batchNumber,
          expiryDate: l.batch.expiryDate,
          qtySellable: l.batch.qtySellable,
        },
        quantity: l.quantity,
        unitCost: l.unitCost,
      })),
    };
  }
}
