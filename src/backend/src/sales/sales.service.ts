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
  DispenseLine,
  Medicine,
  MedicineClassification,
  MovementType,
  Prescription,
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
import type { OtcLineDto, SaleDto } from './dto/sale.dto.js';
import { fromXu, lineTotal, toXu } from './money.js';

const COMMAND = 'sale';

/** Key of the transaction-scoped advisory lock that serialises receipt numbers. */
const RECEIPT_NUMBER_LOCK = 'sales.receipt-number';

interface MedicineRef {
  id: string;
  code: string;
  name: string;
}

interface BatchRef {
  id: string;
  batchNumber: string;
  expiryDate: string;
}

export interface SaleLineView {
  medicine: MedicineRef;
  batch: BatchRef;
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

/** A prescription whose hand-overs are waiting for payment (UC07 billing step 2). */
export interface BillablePrescriptionView {
  id: string;
  referenceNumber: string;
  customer: { id: string; code: string; fullName: string };
  lastDispensedAt: string;
  lines: Array<{
    dispenseLineId: string;
    medicine: MedicineRef;
    batch: BatchRef;
    quantity: number;
    dispensedAt: string;
  }>;
}

/** One cart line with the batches FEFO chose for it. */
interface PlannedLine {
  medicine: Medicine;
  unitPrice: string;
  lines: AllocatedLine<Batch>[];
}

/** The hand-over being billed: its unbilled dispense lines, locked. */
interface BilledPart {
  prescription: Prescription;
  lines: DispenseLine[];
}

/**
 * UC07 — record a sale: an over-the-counter sale, the billing of a
 * prescription handed over in UC06, or both on one receipt.
 *
 * Over-the-counter lines move stock at the confirmed payment and only then
 * (FR-45, DEC-05): FEFO chooses the batches (BR01, BR02) and each batch line
 * posts one SALE movement through the `StockLedger` (BR03, BR05). Only
 * medicines classified OTC can be sold this way (BR04, DEC-09).
 *
 * Billing records the money for dispense lines that are not billed yet: one
 * sale line per dispense line, same batch and quantity, and **no** movement,
 * because the stock left at the hand-over (DEC-05, FR-26). The dispense lines
 * are locked first, so two cashiers cannot bill them twice (A5, TC-52).
 *
 * Every line carries the price in force on the business date (decision 12).
 * The request ID is stored with the receipt in the same transaction (FR-23).
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
    const otcLines = dto.otcLines ?? [];
    if (otcLines.length === 0 && !dto.prescriptionId) {
      throw new ValidationFailed([
        {
          field: 'otcLines',
          message: 'Add a medicine or choose a prescription to bill.',
        },
      ]);
    }
    checkDistinctMedicines(otcLines);
    const payloadHash = hashSalePayload(dto);

    return this.ledger.run(async (tx) => {
      const manager = tx.manager;
      const today = this.clock.today();

      // An id sent in the body that does not exist is an error on its field,
      // as everywhere else (#47). Medicines and prescriptions are never
      // deleted, so the answer still holds under the locks that follow.
      await checkReferencesExist(manager, dto, otcLines);

      // Lock order (sequence diagram 2): the dispense lines being billed,
      // which two cashiers could both touch; then the medicines of the cart.
      // Both come before the request ID is looked up, so a repeat of the
      // same request waits for the first one and then finds its receipt.
      const unbilled = dto.prescriptionId
        ? await lockUnbilledLines(manager, dto.prescriptionId)
        : [];
      await tx.lockMedicines(otcLines.map((l) => l.medicineId));

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

      const billed = dto.prescriptionId
        ? await this.checkBillable(manager, dto, unbilled)
        : null;
      const medicines = await this.loadSellableMedicines(manager, otcLines);
      const prices = await this.pricesInForce(manager, otcLines, billed, today);
      const customer =
        billed?.prescription.customer ??
        (await this.loadCustomer(manager, dto.customerId));
      const planned = await this.plan(tx, otcLines, medicines, prices, today);

      const view = await this.store(
        actor,
        tx,
        billed,
        planned,
        prices,
        customer,
        today,
      );
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

  /** UC07 billing step 2: hand-overs not billed yet, the latest first. */
  async billable(actor: Actor): Promise<BillablePrescriptionView[]> {
    assertPermission(actor, Permission.SALE_CREATE);
    const lines = await this.dataSource.manager
      .createQueryBuilder(DispenseLine, 'd')
      .innerJoinAndSelect('d.prescription', 'p')
      .innerJoinAndSelect('p.customer', 'c')
      .innerJoinAndSelect('d.batch', 'b')
      .innerJoinAndSelect('b.medicine', 'm')
      .where('d.sale_id IS NULL')
      .orderBy('d.dispensedAt', 'ASC')
      .addOrderBy('m.code', 'ASC')
      .addOrderBy('b.expiryDate', 'ASC')
      .getMany();

    const byPrescription = new Map<string, BillablePrescriptionView>();
    for (const line of lines) {
      const p = line.prescription;
      const entry = byPrescription.get(p.id) ?? {
        id: p.id,
        referenceNumber: p.referenceNumber,
        customer: customerRef(p.customer),
        lastDispensedAt: line.dispensedAt.toISOString(),
        lines: [],
      };
      entry.lastDispensedAt = line.dispensedAt.toISOString();
      entry.lines.push({
        dispenseLineId: line.id,
        medicine: medicineRef(line.batch.medicine),
        batch: batchRef(line.batch),
        quantity: line.quantity,
        dispensedAt: line.dispensedAt.toISOString(),
      });
      byPrescription.set(p.id, entry);
    }
    return [...byPrescription.values()].sort((a, b) =>
      b.lastDispensedAt.localeCompare(a.lastDispensedAt),
    );
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
    const moved = await linesWithMovement(
      this.dataSource.manager,
      sale.lines.map((l) => l.id),
    );
    const lines = sale.lines.map((line) => ({
      medicine: line.batch.medicine,
      batch: line.batch,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
      billed: !moved.has(line.id),
    }));
    return view(sale, lines);
  }

  /**
   * A5, TC-52: there must be something left to bill. With no unbilled line,
   * the prescription was either billed already or never handed over.
   */
  private async checkBillable(
    manager: EntityManager,
    dto: SaleDto,
    unbilled: DispenseLine[],
  ): Promise<BilledPart> {
    const prescriptionId = dto.prescriptionId!;
    const prescription = await manager.findOne(Prescription, {
      where: { id: prescriptionId },
      relations: { customer: true },
    });
    if (!prescription) throw unknownPrescription();
    if (unbilled.length === 0) {
      const handedOver = await manager.countBy(DispenseLine, {
        prescription: { id: prescriptionId },
      });
      throw handedOver > 0
        ? new BusinessRuleViolation(
            'FR-26',
            'ALREADY_BILLED',
            `Prescription ${prescription.referenceNumber} is already billed.`,
          )
        : new BusinessRuleViolation(
            'FR-26',
            'NOTHING_TO_BILL',
            `Nothing of prescription ${prescription.referenceNumber} has been handed over yet.`,
          );
    }
    if (dto.customerId && dto.customerId !== prescription.customer.id) {
      throw new ValidationFailed([
        {
          field: 'customerId',
          message: 'A billed prescription is paid for its own patient.',
        },
      ]);
    }
    return { prescription, lines: unbilled };
  }

  /**
   * Every cart medicine must be active and classified OTC (BR04, DEC-09); a
   * prescription-only or controlled medicine goes through UC05/UC06.
   */
  private async loadSellableMedicines(
    manager: EntityManager,
    otcLines: OtcLineDto[],
  ): Promise<Map<string, Medicine>> {
    if (otcLines.length === 0) return new Map();
    const rows = await manager.findBy(Medicine, {
      id: In(otcLines.map((l) => l.medicineId)),
    });
    const byId = new Map(rows.map((m) => [m.id, m]));

    const notOtc: FieldError[] = [];
    const inactive: FieldError[] = [];
    otcLines.forEach((line, index) => {
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

  /**
   * Decision 12, BR09: each line is valued at the price in force on the sale
   * date, for the cart and for the billed hand-over alike.
   */
  private async pricesInForce(
    manager: EntityManager,
    otcLines: OtcLineDto[],
    billed: BilledPart | null,
    today: string,
  ): Promise<Map<string, string>> {
    const billedMedicines = new Map(
      (billed?.lines ?? []).map((l) => [l.batch.medicine.id, l.batch.medicine]),
    );
    const prices = await this.priceBook.pricesOn(
      manager,
      [...otcLines.map((l) => l.medicineId), ...billedMedicines.keys()],
      today,
    );
    const missing: FieldError[] = [
      ...[...billedMedicines.values()]
        .filter((m) => !prices.has(m.id))
        .map((m) => ({
          field: 'prescriptionId',
          message: `${m.name} has no price in force today.`,
        })),
      ...otcLines
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => !prices.has(line.medicineId))
        .map(({ index }) => ({
          field: `otcLines.${index}.medicineId`,
          message: 'This medicine has no price in force today.',
        })),
    ];
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
    if (!customer) {
      throw ValidationFailed.field(
        'customerId',
        'This customer does not exist.',
      );
    }
    return customer;
  }

  /**
   * Step 2 of the lock order and FEFO for every cart line (BR01, BR02).
   * Refuses the whole sale when any line is short, naming what can be sold
   * (BR03).
   */
  private async plan(
    tx: LedgerTransaction,
    otcLines: OtcLineDto[],
    medicines: Map<string, Medicine>,
    prices: Map<string, string>,
    today: string,
  ): Promise<PlannedLine[]> {
    const planned: PlannedLine[] = [];
    const shortages: FieldError[] = [];
    for (const [index, line] of otcLines.entries()) {
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

  /**
   * Writes the sale; one line per billed dispense line, linked and moving
   * nothing; one line and one SALE movement per cart batch; then the total.
   */
  private async store(
    actor: Actor,
    tx: LedgerTransaction,
    billed: BilledPart | null,
    planned: PlannedLine[],
    prices: Map<string, string>,
    customer: Customer | null,
    today: string,
  ): Promise<SaleView> {
    const manager = tx.manager;
    const sale = await manager.save(
      manager.create(Sale, {
        receiptNumber: await nextReceiptNumber(manager, today),
        customer: customer ?? undefined,
        soldBy: { id: actor.id },
        soldAt: this.clock.now(),
      }),
    );

    let total = 0n;
    const lines: SaleLineView[] = [];
    const addLine = async (
      medicine: MedicineRef,
      batch: BatchRef,
      quantity: number,
      unitPrice: string,
      billedLine: boolean,
    ): Promise<SaleLine> => {
      const amount = lineTotal(unitPrice, quantity);
      total += toXu(amount);
      lines.push({
        medicine,
        batch,
        quantity,
        unitPrice,
        lineTotal: amount,
        billed: billedLine,
      });
      return manager.save(
        manager.create(SaleLine, {
          quantity,
          unitPrice,
          lineTotal: amount,
          sale: { id: sale.id },
          batch: { id: batch.id },
        }),
      );
    };

    // DEC-05, FR-26: the stock left at the hand-over; billing posts nothing.
    for (const d of billed?.lines ?? []) {
      await addLine(
        d.batch.medicine,
        d.batch,
        d.quantity,
        prices.get(d.batch.medicine.id)!,
        true,
      );
    }
    if (billed) {
      await manager.update(
        DispenseLine,
        { id: In(billed.lines.map((d) => d.id)) },
        { sale: { id: sale.id } },
      );
    }

    for (const p of planned) {
      for (const allocated of p.lines) {
        const line = await addLine(
          p.medicine,
          allocated.batch,
          allocated.quantity,
          p.unitPrice,
          false,
        );
        await tx.post(actor, {
          batchId: allocated.batch.id,
          type: MovementType.SALE,
          deltaSellable: -allocated.quantity,
          sourceDocumentType: SourceDocumentType.SALE_LINE,
          sourceDocumentId: line.id,
        });
      }
    }

    sale.totalAmount = fromXu(total);
    await manager.update(Sale, { id: sale.id }, { totalAmount: sale.totalAmount });
    return view(sale, lines);
  }
}

/**
 * #47: an unknown medicine or prescription in the body is a 400 on its own
 * field, not a 404, so the cashier sees which line or choice to correct.
 */
async function checkReferencesExist(
  manager: EntityManager,
  dto: SaleDto,
  otcLines: OtcLineDto[],
): Promise<void> {
  const errors: FieldError[] = [];
  if (otcLines.length > 0) {
    const found = new Set(
      (
        await manager.findBy(Medicine, {
          id: In(otcLines.map((l) => l.medicineId)),
        })
      ).map((m) => m.id.toLowerCase()),
    );
    otcLines.forEach((line, index) => {
      if (!found.has(line.medicineId.toLowerCase())) {
        errors.push({
          field: `otcLines.${index}.medicineId`,
          message: 'This medicine does not exist.',
        });
      }
    });
  }
  if (
    dto.prescriptionId &&
    !(await manager.existsBy(Prescription, { id: dto.prescriptionId }))
  ) {
    errors.push(unknownPrescription().errors[0]);
  }
  if (errors.length > 0) throw new ValidationFailed(errors);
}

function unknownPrescription(): ValidationFailed {
  return ValidationFailed.field(
    'prescriptionId',
    'This prescription does not exist.',
  );
}

/**
 * The prescription's dispense lines that no sale has billed, locked. A second
 * cashier waits here; once the first commits, the lines no longer match
 * `sale_id IS NULL` and come back empty (A5).
 */
function lockUnbilledLines(
  manager: EntityManager,
  prescriptionId: string,
): Promise<DispenseLine[]> {
  return manager
    .createQueryBuilder(DispenseLine, 'd')
    .innerJoinAndSelect('d.batch', 'b')
    .innerJoinAndSelect('b.medicine', 'm')
    .where('d.prescription_id = :prescriptionId', { prescriptionId })
    .andWhere('d.sale_id IS NULL')
    .orderBy('m.code', 'ASC')
    .addOrderBy('b.expiryDate', 'ASC')
    .addOrderBy('d.id', 'ASC')
    .setLock('pessimistic_write', undefined, ['d'])
    .getMany();
}

/**
 * `RC-YYYYMMDD-NNNN`, running per business day. The advisory lock is taken
 * last, after every row lock, so it cannot form a cycle with them; it is
 * released at commit.
 */
async function nextReceiptNumber(
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

/** FR-23: the same request must carry the same content; order does not matter. */
export function hashSalePayload(dto: SaleDto): string {
  const lines = (dto.otcLines ?? [])
    .map((l) => [l.medicineId.toLowerCase(), l.quantity])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return createHash('sha256')
    .update(
      JSON.stringify([
        lines,
        dto.prescriptionId?.toLowerCase() ?? null,
        dto.customerId ?? null,
      ]),
    )
    .digest('hex');
}

/** One line per medicine: the cart adds quantities up before paying. */
function checkDistinctMedicines(otcLines: OtcLineDto[]): void {
  const seen = new Set<string>();
  const errors: FieldError[] = [];
  otcLines.forEach((line, index) => {
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

function medicineRef(m: MedicineRef): MedicineRef {
  return { id: m.id, code: m.code, name: m.name };
}

function batchRef(b: BatchRef): BatchRef {
  return { id: b.id, batchNumber: b.batchNumber, expiryDate: b.expiryDate };
}

function customerRef(c: Customer): { id: string; code: string; fullName: string } {
  return { id: c.id, code: c.code, fullName: c.fullName };
}

/** Receipt order: billed lines first, then by medicine, FEFO within it. */
function receiptOrder(a: SaleLineView, b: SaleLineView): number {
  return (
    (a.billed === b.billed ? 0 : a.billed ? -1 : 1) ||
    a.medicine.code.localeCompare(b.medicine.code) ||
    a.batch.expiryDate.localeCompare(b.batch.expiryDate)
  );
}

function view(sale: Sale, lines: SaleLineView[]): SaleView {
  return {
    id: sale.id,
    receiptNumber: sale.receiptNumber,
    soldAt: sale.soldAt.toISOString(),
    customer: sale.customer ? customerRef(sale.customer) : null,
    lines: [...lines].sort(receiptOrder).map((l) => ({
      medicine: medicineRef(l.medicine),
      batch: batchRef(l.batch),
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
      billed: l.billed,
    })),
    totalAmount: sale.totalAmount,
  };
}
