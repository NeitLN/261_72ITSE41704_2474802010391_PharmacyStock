import { createHash } from 'node:crypto';
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
  ProcessedRequest,
  ReturnLine,
  Sale,
  SaleLine,
  SaleReturn,
  SaleStatus,
  SourceDocumentType,
  StockMovement,
} from '../entities/index.js';
import { fromXu, lineTotal, toXu } from '../sales/money.js';
import { Clock } from '../stock/clock.js';
import { StockLedger } from '../stock/stock-ledger.js';
import type { ReturnDto } from './dto/return.dto.js';

const COMMAND = 'return';

/** Key of the transaction-scoped advisory lock that serialises return numbers. */
const RETURN_NUMBER_LOCK = 'returns.return-number';

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

/** One returned line on the return slip. */
export interface ReturnLineView {
  saleLineId: string;
  medicine: { id: string; code: string; name: string };
  batch: { id: string; batchNumber: string; expiryDate: string };
  quantity: number;
  unitPrice: string;
  /** `unitPrice × quantity`, at the price paid (FR-28). */
  refund: string;
  /** PENDING_ASSESSMENT until a manager assesses the goods (UC11, DEC-04). */
  assessmentStatus: string;
}

/** The return slip (UC08 step 6). */
export interface ReturnView {
  id: string;
  referenceNumber: string;
  returnedAt: string;
  sale: { id: string; receiptNumber: string };
  reason: string;
  lines: ReturnLineView[];
  refundAmount: string;
}

/**
 * UC08 — process a return against an earlier sale.
 *
 * The cashier finds the sale by its receipt number and returns some of what
 * each line sold. A line never takes back more than it sold minus what was
 * already returned (FR-27). Each returned line posts one RETURN movement
 * through the ledger's `receiveReturn`, into the quarantine of the batch it
 * was sold from, whatever that batch's status or expiry (BR11, DEC-04); the
 * goods wait there for a manager's assessment (UC11). The refund is the price
 * paid (FR-28). The sale itself is never edited, only its returned
 * quantities and status. The request ID is stored with the return (FR-23).
 */
@Injectable()
export class ReturnsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ledger: StockLedger,
    private readonly clock: Clock,
  ) {}

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

    sale.lines.sort(receiptOrder);
    const moved = await linesWithMovement(
      manager,
      sale.lines.map((l) => l.id),
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
        medicine: medicineRef(line),
        batch: batchRef(line),
        quantitySold: line.quantity,
        quantityReturned: line.quantityReturned,
        returnable: line.quantity - line.quantityReturned,
        unitPrice: line.unitPrice,
        billed: !moved.has(line.id),
      })),
    };
  }

  async record(actor: Actor, dto: ReturnDto): Promise<ReturnView> {
    assertPermission(actor, Permission.RETURN_CREATE);
    checkDistinctLines(dto);
    const payloadHash = hashReturnPayload(dto);

    return this.ledger.run(async (tx) => {
      const manager = tx.manager;

      // An id sent in the body that does not exist is an error on its field
      // (#47). Sales are never deleted, so the answer holds under the locks.
      const sale = await manager.findOne(Sale, {
        where: { id: dto.saleId },
      });
      if (!sale) {
        throw new ValidationFailed([
          { field: 'saleId', message: 'This sale does not exist.' },
        ]);
      }

      // Lock order (sequence diagram 3): the sale's lines first, so two
      // cashiers returning against one line queue here; then the medicines.
      // Both come before the request ID is looked up, so a repeat of the
      // same request waits for the first one and then finds its return.
      const lines = await lockSaleLines(manager, sale.id);
      const byId = new Map(lines.map((l) => [l.id, l]));
      const foreign: FieldError[] = dto.lines
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => !byId.has(line.saleLineId.toLowerCase()))
        .map(({ index }) => ({
          field: `lines.${index}.saleLineId`,
          message: `This line is not on sale ${sale.receiptNumber}.`,
        }));
      if (foreign.length > 0) throw new ValidationFailed(foreign);
      const returned = dto.lines.map((line) => ({
        saleLine: byId.get(line.saleLineId.toLowerCase())!,
        quantity: line.quantity,
      }));
      await tx.lockMedicines(returned.map((r) => r.saleLine.batch.medicine.id));

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
        return done.result as ReturnView;
      }

      checkReturnable(returned);
      await tx.lockBatches(returned.map((r) => r.saleLine.batch.id));

      const saleReturn = await manager.save(
        manager.create(SaleReturn, {
          referenceNumber: await nextReturnNumber(manager, this.clock.today()),
          reason: dto.reason,
          refundAmount: fromXu(
            returned.reduce(
              (sum, r) =>
                sum + toXu(lineTotal(r.saleLine.unitPrice, r.quantity)),
              0n,
            ),
          ),
          sale: { id: sale.id },
          processedBy: { id: actor.id },
        }),
      );
      for (const { saleLine, quantity } of returned) {
        const line = await manager.save(
          manager.create(ReturnLine, {
            quantity,
            unitPrice: saleLine.unitPrice,
            saleReturn: { id: saleReturn.id },
            saleLine: { id: saleLine.id },
          }),
        );
        await tx.receiveReturn(actor, saleLine.batch.id, quantity, line.id);
        await manager.increment(
          SaleLine,
          { id: saleLine.id },
          'quantityReturned',
          quantity,
        );
        saleLine.quantityReturned += quantity;
      }
      await manager.update(
        Sale,
        { id: sale.id },
        {
          status: lines.every((l) => l.quantityReturned === l.quantity)
            ? SaleStatus.RETURNED
            : SaleStatus.PARTIALLY_RETURNED,
        },
      );

      const view = await this.view(manager, saleReturn.id);
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

  /** The return slip again, to show or print. */
  async get(actor: Actor, id: string): Promise<ReturnView> {
    assertPermission(actor, Permission.RETURN_CREATE);
    return this.view(this.dataSource.manager, id);
  }

  private async view(manager: EntityManager, id: string): Promise<ReturnView> {
    const saleReturn = await manager.findOne(SaleReturn, {
      where: { id },
      relations: {
        sale: true,
        lines: { saleLine: { batch: { medicine: true } } },
      },
    });
    if (!saleReturn) throw new NotFound('Return', id);
    saleReturn.lines.sort((a, b) => receiptOrder(a.saleLine, b.saleLine));
    return {
      id: saleReturn.id,
      referenceNumber: saleReturn.referenceNumber,
      returnedAt: saleReturn.returnedAt.toISOString(),
      sale: {
        id: saleReturn.sale.id,
        receiptNumber: saleReturn.sale.receiptNumber,
      },
      reason: saleReturn.reason,
      lines: saleReturn.lines.map((line) => ({
        saleLineId: line.saleLine.id,
        medicine: medicineRef(line.saleLine),
        batch: batchRef(line.saleLine),
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        refund: lineTotal(line.unitPrice, line.quantity),
        assessmentStatus: line.assessmentStatus,
      })),
      refundAmount: saleReturn.refundAmount,
    };
  }
}

/** FR-23: the same request must carry the same return; line order does not matter. */
export function hashReturnPayload(dto: ReturnDto): string {
  const lines = dto.lines
    .map((l) => [l.saleLineId.toLowerCase(), l.quantity])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return createHash('sha256')
    .update(JSON.stringify([dto.saleId.toLowerCase(), dto.reason, lines]))
    .digest('hex');
}

/** One sale line appears once in a return; its quantity says how many. */
function checkDistinctLines(dto: ReturnDto): void {
  const seen = new Set<string>();
  const errors: FieldError[] = [];
  dto.lines.forEach((line, index) => {
    const id = line.saleLineId.toLowerCase();
    if (seen.has(id)) {
      errors.push({
        field: `lines.${index}.saleLineId`,
        message: 'This line is already in the return; change its quantity instead.',
      });
    }
    seen.add(id);
  });
  if (errors.length > 0) throw new ValidationFailed(errors);
}

/** FR-27, TC-17: never more back than sold minus already returned. */
function checkReturnable(
  returned: Array<{ saleLine: SaleLine; quantity: number }>,
): void {
  const errors: FieldError[] = returned
    .map((r, index) => ({
      ...r,
      index,
      returnable: r.saleLine.quantity - r.saleLine.quantityReturned,
    }))
    .filter((r) => r.quantity > r.returnable)
    .map((r) => ({
      field: `lines.${r.index}.quantity`,
      message:
        r.returnable === 0
          ? 'Everything on this line has already been returned.'
          : `Only ${r.returnable} can be returned.`,
    }));
  if (errors.length > 0) {
    throw new BusinessRuleViolation(
      'FR-27',
      'RETURN_EXCEEDS_SOLD',
      'A line cannot take back more than it sold.',
      errors,
    );
  }
}

/**
 * Locks every line of the sale (`FOR UPDATE`, ascending id) and returns them
 * with their batch and medicine. Only the sale lines are locked here; the
 * medicines and batches follow in the ledger's order.
 */
async function lockSaleLines(
  manager: EntityManager,
  saleId: string,
): Promise<SaleLine[]> {
  const locked = await manager
    .createQueryBuilder(SaleLine, 'l')
    .select('l.id')
    .where('l.sale_id = :saleId', { saleId })
    .orderBy('l.id', 'ASC')
    .setLock('pessimistic_write', undefined, ['l'])
    .getMany();
  return manager.find(SaleLine, {
    where: { id: In(locked.map((l) => l.id)) },
    relations: { batch: { medicine: true } },
    order: { id: 'ASC' },
  });
}

/**
 * `RT-YYYYMMDD-NNNN`, running per business day, drawn like the receipt
 * number in UC07. The advisory lock is taken last, after every row lock, so
 * it cannot form a cycle with them; it is released at commit.
 */
async function nextReturnNumber(
  manager: EntityManager,
  today: string,
): Promise<string> {
  await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
    RETURN_NUMBER_LOCK,
  ]);
  const prefix = `RT-${today.replaceAll('-', '')}-`;
  const last = await manager
    .createQueryBuilder(SaleReturn, 'r')
    .select('r.referenceNumber', 'referenceNumber')
    .where('r.referenceNumber LIKE :prefix', { prefix: `${prefix}%` })
    .orderBy('r.referenceNumber', 'DESC')
    .limit(1)
    .getRawOne<{ referenceNumber: string }>();
  const next = last ? Number(last.referenceNumber.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

/** Sale lines that posted a movement; the others billed a hand-over (DEC-05). */
async function linesWithMovement(
  manager: EntityManager,
  saleLineIds: string[],
): Promise<Set<string>> {
  if (saleLineIds.length === 0) return new Set();
  const rows = await manager.find(StockMovement, {
    select: { sourceDocumentId: true },
    where: {
      sourceDocumentType: SourceDocumentType.SALE_LINE,
      sourceDocumentId: In(saleLineIds),
    },
  });
  return new Set(rows.map((m) => m.sourceDocumentId));
}

/** As on the receipt: by medicine, then FEFO within it. */
function receiptOrder(a: SaleLine, b: SaleLine): number {
  return (
    a.batch.medicine.code.localeCompare(b.batch.medicine.code) ||
    a.batch.expiryDate.localeCompare(b.batch.expiryDate)
  );
}

function medicineRef(line: SaleLine) {
  const { id, code, name } = line.batch.medicine;
  return { id, code, name };
}

function batchRef(line: SaleLine) {
  const { id, batchNumber, expiryDate } = line.batch;
  return { id, batchNumber, expiryDate };
}
