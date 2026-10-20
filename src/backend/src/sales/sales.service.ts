import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager, In } from 'typeorm';
import { type Actor, assertPermission } from '../auth/actor.js';
import { Permission } from '../auth/permissions.js';
import { PriceBook } from '../catalogue/price-book.js';
import {
  BusinessRuleViolation,
  Conflict,
  type FieldError,
  NotFound,
  ValidationFailed,
} from '../common/errors.js';
import {
  type Batch,
  Customer,
  Medicine,
  MedicineClassification,
  MovementType,
  ProcessedRequest,
  Sale,
  SaleLine,
  SourceDocumentType,
  StockMovement,
} from '../entities/index.js';
import {
  type AllocatedLine,
  FefoAllocator,
} from '../issuing/fefo-allocator.js';
import { Clock } from '../stock/clock.js';
import { type LedgerTransaction, StockLedger } from '../stock/stock-ledger.js';
import type { SaleDto } from './dto/sale.dto.js';
import { fromXu, lineTotal, toXu } from './money.js';

const COMMAND = 'sale';

/** Key of the transaction-scoped advisory lock that serialises receipt numbers. */
const RECEIPT_NUMBER_LOCK = 'sales.receipt-number';

export interface SaleLineView {
  medicine: { id: string; code: string; name: string };
  batch: { id: string; batchNumber: string; expiryDate: string };
  quantity: number;
  /** Price in force on the sale date, copied onto the line (decision 12). */
  unitPrice: string;
  lineTotal: string;
  /** True when the line bills an earlier hand-over and moved no stock (DEC-05). */
  billed: boolean;
}

/** The receipt (UC07 step 6). Money is a `numeric(12,2)` string. */
export interface SaleView {
  id: string;
  receiptNumber: string;
  soldAt: string;
  customer: { id: string; code: string; fullName: string } | null;
  lines: SaleLineView[];
  totalAmount: string;
}

/** One cart line with the batches FEFO chose for it. */
interface PlannedLine {
  medicine: Medicine;
  unitPrice: string;
  lines: AllocatedLine<Batch>[];
}

/**
 * UC07 — record an over-the-counter sale.
 *
 * Stock leaves at the confirmed payment and only then (FR-45, DEC-05). One
 * `StockLedger` transaction locks, in the ledger's order, the medicines of
 * the cart and then their eligible batches; FEFO chooses the batches (BR01,
 * BR02); every batch line posts one SALE movement (BR03, BR05). Only
 * medicines classified OTC can be sold this way (BR04, DEC-09). The request
 * ID is stored with the receipt in the same transaction (FR-23).
 */
@Injectable()
export class SalesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ledger: StockLedger,
    private readonly priceBook: PriceBook,
    private readonly clock: Clock,
  ) {}

  async record(actor: Actor, dto: SaleDto): Promise<SaleView> {
    assertPermission(actor, Permission.SALE_CREATE);
    checkDistinctMedicines(dto);
    const payloadHash = hashSalePayload(dto);

    return this.ledger.run(async (tx) => {
      const manager = tx.manager;
      const today = this.clock.today();

      // Step 1 of the lock order, and also before the request ID is looked
      // up: a repeat of the same request waits for the first one here and
      // then finds its stored receipt. An unknown medicine is a 404.
      await tx.lockMedicines(dto.otcLines.map((l) => l.medicineId));

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
        return done.result as SaleView;
      }

      const medicines = await this.loadSellableMedicines(manager, dto);
      const prices = await this.pricesInForce(manager, dto, today);
      const customer = await this.loadCustomer(manager, dto.customerId);
      const planned = await this.plan(tx, dto, medicines, prices, today);

      const view = await this.store(actor, tx, planned, customer, today);
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

  /** The receipt again, to show or print (UC07 step 6). */
  async get(actor: Actor, id: string): Promise<SaleView> {
    assertPermission(actor, Permission.SALE_CREATE);
    const sale = await this.dataSource.manager.findOne(Sale, {
      where: { id },
      relations: {
        customer: true,
        lines: { batch: { medicine: true } },
      },
    });
    if (!sale) throw new NotFound('Sale', id);
    // As on the receipt at payment: by medicine, then FEFO within it.
    sale.lines.sort(
      (a, b) =>
        a.batch.medicine.code.localeCompare(b.batch.medicine.code) ||
        a.batch.expiryDate.localeCompare(b.batch.expiryDate),
    );
    const moved = await this.linesWithMovement(
      this.dataSource.manager,
      sale.lines.map((l) => l.id),
    );
    return view(
      sale,
      sale.lines.map((line) => ({
        medicine: line.batch.medicine,
        batch: line.batch,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        billed: !moved.has(line.id),
      })),
    );
  }

  /**
   * Every cart medicine must be active and classified OTC (BR04, DEC-09); a
   * prescription-only or controlled medicine goes through UC05/UC06.
   */
  private async loadSellableMedicines(
    manager: EntityManager,
    dto: SaleDto,
  ): Promise<Map<string, Medicine>> {
    const rows = await manager.findBy(Medicine, {
      id: In(dto.otcLines.map((l) => l.medicineId)),
    });
    const byId = new Map(rows.map((m) => [m.id, m]));

    const notOtc: FieldError[] = [];
    const inactive: FieldError[] = [];
    dto.otcLines.forEach((line, index) => {
      const medicine = byId.get(line.medicineId)!;
      if (medicine.classification !== MedicineClassification.OTC) {
        notOtc.push({
          field: `otcLines.${index}.medicineId`,
          message: `${medicine.name} needs a verified prescription; dispense it through a prescription.`,
        });
      } else if (!medicine.isActive) {
        inactive.push({
          field: `otcLines.${index}.medicineId`,
          message: `${medicine.name} is deactivated and cannot be sold.`,
        });
      }
    });
    if (notOtc.length > 0) {
      throw new BusinessRuleViolation(
        'BR04',
        'NOT_OVER_THE_COUNTER',
        'Only medicines classified OTC can be sold without a prescription.',
        notOtc,
      );
    }
    if (inactive.length > 0) {
      throw new BusinessRuleViolation(
        'FR-02',
        'MEDICINE_INACTIVE',
        'A medicine in this sale is deactivated.',
        inactive,
      );
    }
    return byId;
  }

  /** Decision 12, BR09: each line is valued at the price in force on the sale date. */
  private async pricesInForce(
    manager: EntityManager,
    dto: SaleDto,
    today: string,
  ): Promise<Map<string, string>> {
    const prices = await this.priceBook.pricesOn(
      manager,
      dto.otcLines.map((l) => l.medicineId),
      today,
    );
    const missing: FieldError[] = dto.otcLines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => !prices.has(line.medicineId))
      .map(({ index }) => ({
        field: `otcLines.${index}.medicineId`,
        message: 'This medicine has no price in force today.',
      }));
    if (missing.length > 0) {
      throw new BusinessRuleViolation(
        'FR-24',
        'NO_PRICE_IN_FORCE',
        'A medicine in this sale has no price in force today.',
        missing,
      );
    }
    return prices;
  }

  private async loadCustomer(
    manager: EntityManager,
    customerId: string | undefined,
  ): Promise<Customer | null> {
    if (!customerId) return null;
    const customer = await manager.findOneBy(Customer, { id: customerId });
    if (!customer) throw new NotFound('Customer', customerId);
    return customer;
  }

  /**
   * Step 2 of the lock order and FEFO for every line (BR01, BR02). Refuses
   * the whole sale when any line is short, naming what can be sold (BR03).
   */
  private async plan(
    tx: LedgerTransaction,
    dto: SaleDto,
    medicines: Map<string, Medicine>,
    prices: Map<string, string>,
    today: string,
  ): Promise<PlannedLine[]> {
    const planned: PlannedLine[] = [];
    const shortages: FieldError[] = [];
    for (const [index, line] of dto.otcLines.entries()) {
      const medicine = medicines.get(line.medicineId)!;
      const allocation = FefoAllocator.allocate({
        batches: await tx.lockEligibleBatches(medicine.id, today),
        quantity: line.quantity,
        businessDate: today,
        alertDays: medicine.expiryAlertDays,
      });
      if (!allocation.ok) {
        shortages.push({
          field: `otcLines.${index}.quantity`,
          message: `Only ${allocation.available} can be sold now.`,
        });
      }
      planned.push({
        medicine,
        unitPrice: prices.get(medicine.id)!,
        lines: allocation.lines,
      });
    }
    if (shortages.length > 0) {
      throw new BusinessRuleViolation(
        'BR03',
        'INSUFFICIENT_STOCK',
        'Not enough stock that can be sold; nothing was sold.',
        shortages,
      );
    }
    return planned;
  }

  /** Writes the sale, one line and one SALE movement per batch, and the total. */
  private async store(
    actor: Actor,
    tx: LedgerTransaction,
    planned: PlannedLine[],
    customer: Customer | null,
    today: string,
  ): Promise<SaleView> {
    const manager = tx.manager;
    const sale = await manager.save(
      manager.create(Sale, {
        receiptNumber: await this.nextReceiptNumber(manager, today),
        customer: customer ?? undefined,
        soldBy: { id: actor.id },
        soldAt: this.clock.now(),
      }),
    );

    let total = 0n;
    const lines: SaleLineView[] = [];
    for (const p of planned) {
      for (const allocated of p.lines) {
        const amount = lineTotal(p.unitPrice, allocated.quantity);
        total += toXu(amount);
        const line = await manager.save(
          manager.create(SaleLine, {
            quantity: allocated.quantity,
            unitPrice: p.unitPrice,
            lineTotal: amount,
            sale: { id: sale.id },
            batch: { id: allocated.batch.id },
          }),
        );
        await tx.post(actor, {
          batchId: allocated.batch.id,
          type: MovementType.SALE,
          deltaSellable: -allocated.quantity,
          sourceDocumentType: SourceDocumentType.SALE_LINE,
          sourceDocumentId: line.id,
        });
        lines.push({
          medicine: p.medicine,
          batch: allocated.batch,
          quantity: allocated.quantity,
          unitPrice: p.unitPrice,
          lineTotal: amount,
          billed: false,
        });
      }
    }
    sale.totalAmount = fromXu(total);
    await manager.update(Sale, { id: sale.id }, { totalAmount: sale.totalAmount });
    return view(sale, lines);
  }

  /**
   * `RC-YYYYMMDD-NNNN`, running per business day. The advisory lock is taken
   * last, after every medicine and batch lock, so it cannot form a cycle with
   * them; it is released at commit.
   */
  private async nextReceiptNumber(
    manager: EntityManager,
    today: string,
  ): Promise<string> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      RECEIPT_NUMBER_LOCK,
    ]);
    const prefix = `RC-${today.replaceAll('-', '')}-`;
    const last = await manager
      .createQueryBuilder(Sale, 's')
      .select('s.receiptNumber', 'receiptNumber')
      .where('s.receiptNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('s.receiptNumber', 'DESC')
      .limit(1)
      .getRawOne<{ receiptNumber: string }>();
    const next = last ? Number(last.receiptNumber.slice(prefix.length)) + 1 : 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
  }

  /** Sale lines that posted a movement; the others billed a hand-over (DEC-05). */
  private async linesWithMovement(
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
}

/** FR-23: the same request must carry the same cart; order does not matter. */
export function hashSalePayload(dto: SaleDto): string {
  const lines = dto.otcLines
    .map((l) => [l.medicineId.toLowerCase(), l.quantity])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return createHash('sha256')
    .update(JSON.stringify([lines, dto.customerId ?? null]))
    .digest('hex');
}

/** One line per medicine: the cart adds quantities up before paying. */
function checkDistinctMedicines(dto: SaleDto): void {
  const seen = new Set<string>();
  const errors: FieldError[] = [];
  dto.otcLines.forEach((line, index) => {
    const id = line.medicineId.toLowerCase();
    if (seen.has(id)) {
      errors.push({
        field: `otcLines.${index}.medicineId`,
        message: 'Each medicine can appear only once.',
      });
    }
    seen.add(id);
  });
  if (errors.length > 0) throw new ValidationFailed(errors);
}

function view(sale: Sale, lines: SaleLineView[]): SaleView {
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
    lines: lines.map((l) => ({
      medicine: { id: l.medicine.id, code: l.medicine.code, name: l.medicine.name },
      batch: {
        id: l.batch.id,
        batchNumber: l.batch.batchNumber,
        expiryDate: l.batch.expiryDate,
      },
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
      billed: l.billed,
    })),
    totalAmount: sale.totalAmount,
  };
}
