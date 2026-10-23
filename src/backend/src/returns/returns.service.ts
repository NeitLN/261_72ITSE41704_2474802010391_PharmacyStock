import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { type Actor, assertPermission } from '../auth/actor.js';
import { Permission } from '../auth/permissions.js';
import { NotFound } from '../common/errors.js';
import {
  Sale,
  SourceDocumentType,
  StockMovement,
} from '../entities/index.js';

/** One sale line and what can still come back (UC08 step 2). */
export interface ReturnableLineView {
  saleLineId: string;
  medicine: { id: string; code: string; name: string };
  batch: { id: string; batchNumber: string; expiryDate: string };
  quantitySold: number;
  quantityReturned: number;
  /** Sold minus already returned; 0 means nothing is left to return. */
  returnable: number;
  /** The price paid, copied from the sale line; the refund uses it (FR-28). */
  unitPrice: string;
  /** True when the line billed an earlier hand-over and moved no stock (DEC-05). */
  billed: boolean;
}

/** `GET /api/returns/sales/:receiptNumber`. Money is a `numeric(12,2)` string. */
export interface ReturnableSaleView {
  id: string;
  receiptNumber: string;
  soldAt: string;
  customer: { id: string; code: string; fullName: string } | null;
  lines: ReturnableLineView[];
}

/**
 * UC08 — process a return against an earlier sale.
 *
 * This part finds the sale by its receipt number and says, per line, how
 * many units can still come back (FR-27). Recording the return, which posts
 * a RETURN movement into the quarantine of the sold batch (BR11, DEC-04),
 * uses the ledger's `receiveReturn` command (#55).
 */
@Injectable()
export class ReturnsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findSale(
    actor: Actor,
    receiptNumber: string,
  ): Promise<ReturnableSaleView> {
    assertPermission(actor, Permission.RETURN_CREATE);
    const manager = this.dataSource.manager;
    const sale = await manager.findOne(Sale, {
      where: { receiptNumber: receiptNumber.trim().toUpperCase() },
      relations: { customer: true, lines: { batch: { medicine: true } } },
    });
    if (!sale) throw new NotFound('Sale', receiptNumber);

    // As on the receipt: by medicine, then FEFO within it.
    sale.lines.sort(
      (a, b) =>
        a.batch.medicine.code.localeCompare(b.batch.medicine.code) ||
        a.batch.expiryDate.localeCompare(b.batch.expiryDate),
    );
    const moved =
      sale.lines.length === 0
        ? new Set<string>()
        : new Set(
            (
              await manager.find(StockMovement, {
                select: { sourceDocumentId: true },
                where: {
                  sourceDocumentType: SourceDocumentType.SALE_LINE,
                  sourceDocumentId: In(sale.lines.map((l) => l.id)),
                },
              })
            ).map((m) => m.sourceDocumentId),
          );

    return {
      id: sale.id,
      receiptNumber: sale.receiptNumber,
      soldAt: sale.soldAt.toISOString(),
      customer: sale.customer
        ? {
            id: sale.customer.id,
            code: sale.customer.code,
            fullName: sale.customer.fullName,
          }
        : null,
      lines: sale.lines.map((line) => ({
        saleLineId: line.id,
        medicine: {
          id: line.batch.medicine.id,
          code: line.batch.medicine.code,
          name: line.batch.medicine.name,
        },
        batch: {
          id: line.batch.id,
          batchNumber: line.batch.batchNumber,
          expiryDate: line.batch.expiryDate,
        },
        quantitySold: line.quantity,
        quantityReturned: line.quantityReturned,
        returnable: line.quantity - line.quantityReturned,
        unitPrice: line.unitPrice,
        billed: !moved.has(line.id),
      })),
    };
  }
}
