import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type { Actor } from '../auth/actor.js';
import { PriceBook } from '../catalogue/price-book.js';
import {
  BatchStatus,
  MedicineClassification,
  ReturnAssessmentStatus,
  ReturnLine,
  SaleReturn,
} from '../entities/index.js';
import { ReturnsService } from '../returns/returns.service.js';
import { SalesService } from '../sales/sales.service.js';
import { addDays, type Clock, type FixedClock } from '../stock/clock.js';
import { StockLedger } from '../stock/stock-ledger.js';

/**
 * The demo seed's ledger. Every movement is dated by the seed's clock, so the
 * history it writes through the use cases reads like weeks of real use; a use
 * case run by a person always gets the database's own time (#57).
 */
export class DatedLedger extends StockLedger {
  constructor(
    dataSource: DataSource,
    private readonly clock: Clock,
  ) {
    super(dataSource);
  }

  protected override movementTime(): Date {
    return this.clock.now();
  }
}

/** OTC medicines whose sales, returns and assessments back TC-23 (UC12). */
export const REPORT_MEDICINES = [
  'PARA500',
  'VITC500',
  'LORA10',
  'ACC200',
  'BROM8',
] as const;

/** The month before the business date's month, and the month so far. */
export function reportPeriods(today: string) {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const p2Start = `${today.slice(0, 7)}-01`;
  const prev = new Date(Date.UTC(year, month - 2, 1));
  const p1Start = prev.toISOString().slice(0, 10);
  return { p1Start, p1End: addDays(p2Start, -1), p2Start };
}

/** `HH:MM` on a business day in Asia/Ho_Chi_Minh, as an instant. */
const at = (date: string, hour: number, minute = 0) =>
  new Date(
    `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+07:00`,
  );

type Code = (typeof REPORT_MEDICINES)[number];

type Event =
  | {
      kind: 'sale';
      key: string;
      at: Date;
      lines: { code: Code; quantity: number }[];
    }
  | {
      kind: 'return';
      key: string;
      at: Date;
      sale: string;
      code: Code;
      quantity: number;
      reason: string;
    }
  | {
      kind: 'assess';
      at: Date;
      ret: string;
      outcome: 'release' | 'reject';
      note: string;
    };

export interface HistoryContext {
  dataSource: DataSource;
  ledger: StockLedger;
  /** The seed's clock; set to each event's time before it runs. */
  clock: FixedClock;
  /** The real time the seed runs at; nothing is dated after it. */
  now: Date;
  manager: Actor;
  cashier: Actor;
  medicineIds: Map<string, string>;
  rnd: { int: (min: number, max: number) => number };
}

/**
 * Sales over the counter in the previous month and in this month so far, a
 * return in each period (one crosses from a sale of the previous month), and
 * the manager's assessment of two returns: one released, one rejected. All of
 * it goes through UC07, UC08 and the ledger, dated by the seed's clock, so
 * UC12 has two periods to compare by hand (TC-23).
 */
export async function seedReportHistory(ctx: HistoryContext): Promise<void> {
  // The receipts left the clock on the last receipt date.
  ctx.clock.set(ctx.now);
  const { p1Start, p2Start } = reportPeriods(ctx.clock.today());
  const today = ctx.clock.today();
  const lastFullDay = Number(today.slice(8, 10)) - 1;
  const pickLines = (): { code: Code; quantity: number }[] => {
    const first = REPORT_MEDICINES[ctx.rnd.int(0, REPORT_MEDICINES.length - 1)];
    const lines = [{ code: first, quantity: ctx.rnd.int(2, 10) }];
    if (ctx.rnd.int(0, 1) === 1) {
      const second = REPORT_MEDICINES.find((c) => c !== first)!;
      lines.push({ code: second, quantity: ctx.rnd.int(2, 10) });
    }
    return lines;
  };

  const events: Event[] = [];
  // Previous month: six sales, about every four days.
  for (let i = 0; i < 6; i++) {
    const day = addDays(p1Start, 1 + i * 4 + ctx.rnd.int(0, 2));
    events.push({
      kind: 'sale',
      key: `p1-${i}`,
      at: at(day, 9 + ctx.rnd.int(0, 7), ctx.rnd.int(0, 59)),
      lines: pickLines(),
    });
  }
  // This month: four sales on the days already over (today at dawn on the 1st).
  for (let i = 0; i < 4; i++) {
    const day =
      lastFullDay >= 1
        ? addDays(p2Start, Math.floor((i * lastFullDay) / 4))
        : today;
    events.push({
      kind: 'sale',
      key: `p2-${i}`,
      at: at(day, 9 + i, ctx.rnd.int(0, 59)),
      lines: pickLines(),
    });
  }
  const saleAt = (key: string) =>
    events.find((e) => e.kind === 'sale' && e.key === key)!.at;
  const saleCode = (key: string) =>
    (
      events.find((e) => e.kind === 'sale' && e.key === key) as Extract<
        Event,
        { kind: 'sale' }
      >
    ).lines[0].code;
  const later = (instant: Date, hours: number) =>
    new Date(instant.getTime() + hours * 3_600_000);

  events.push(
    {
      kind: 'return',
      key: 'r1',
      at: later(saleAt('p1-0'), 48),
      sale: 'p1-0',
      code: saleCode('p1-0'),
      quantity: 2,
      reason: 'Bought the wrong strength',
    },
    {
      kind: 'assess',
      at: later(saleAt('p1-0'), 96),
      ret: 'r1',
      outcome: 'release',
      note: 'Box sealed, kept at room temperature',
    },
    {
      kind: 'return',
      key: 'r2',
      at: at(p2Start, 8, 30),
      sale: 'p1-3',
      code: saleCode('p1-3'),
      quantity: 1,
      reason: 'Doctor changed the treatment',
    },
    {
      kind: 'assess',
      at: at(p2Start, 8, 45),
      ret: 'r2',
      outcome: 'reject',
      note: 'Blister opened',
    },
    {
      kind: 'return',
      key: 'r3',
      at: later(saleAt('p2-0'), 1),
      sale: 'p2-0',
      code: saleCode('p2-0'),
      quantity: 2,
      reason: 'Duplicate purchase',
    },
  );
  // Never in the future: anything planned after the seed's real time moves
  // back, keeping the order (only possible on the 1st of a month).
  events.sort((a, b) => a.at.getTime() - b.at.getTime());
  events.forEach((e, i) => {
    const latest = new Date(ctx.now.getTime() - (events.length - i) * 60_000);
    if (e.at > latest) e.at = latest;
  });
  if (events.some((e) => e.at.toISOString().slice(0, 10) < p1Start)) {
    throw new Error('Report history must start in the previous month.');
  }

  const sales = new SalesService(
    ctx.dataSource,
    ctx.ledger,
    new PriceBook(),
    ctx.clock,
  );
  const returns = new ReturnsService(ctx.dataSource, ctx.ledger, ctx.clock);
  const soldReceipts = new Map<string, string>();
  const returnIds = new Map<string, string>();

  for (const event of events) {
    ctx.clock.set(event.at);
    if (event.kind === 'sale') {
      const sale = await sales.record(ctx.cashier, {
        requestId: randomUUID(),
        otcLines: event.lines.map((l) => ({
          medicineId: ctx.medicineIds.get(l.code)!,
          quantity: l.quantity,
        })),
      });
      soldReceipts.set(event.key, sale.receiptNumber);
    } else if (event.kind === 'return') {
      const sale = await returns.findSale(
        ctx.cashier,
        soldReceipts.get(event.sale)!,
      );
      const line = sale.lines.find(
        (l) => l.medicine.code === event.code && l.returnable >= event.quantity,
      )!;
      const saleReturn = await returns.record(ctx.cashier, {
        requestId: randomUUID(),
        saleId: sale.id,
        reason: event.reason,
        lines: [{ saleLineId: line.saleLineId, quantity: event.quantity }],
      });
      // The slip's own time is the database's; date it like its movement.
      await ctx.dataSource
        .getRepository(SaleReturn)
        .update(saleReturn.id, { returnedAt: event.at });
      returnIds.set(event.key, saleReturn.id);
    } else {
      await assess(ctx, returnIds.get(event.ret)!, event);
    }
  }
}

/**
 * The manager's assessment of a returned line (FR-46): released to sellable
 * stock when that is the plan and the batch is active, unexpired and not of
 * a controlled medicine (DEC-04); otherwise rejected to pending destruction.
 */
async function assess(
  ctx: HistoryContext,
  saleReturnId: string,
  event: Extract<Event, { kind: 'assess' }>,
): Promise<void> {
  const line = await ctx.dataSource.getRepository(ReturnLine).findOneOrFail({
    where: { saleReturn: { id: saleReturnId } },
    relations: { saleLine: { batch: { medicine: true } } },
  });
  const batch = line.saleLine.batch;
  const today = ctx.clock.today();
  const release =
    batch.status === BatchStatus.ACTIVE &&
    batch.expiryDate > today &&
    batch.medicine.classification !== MedicineClassification.CONTROLLED &&
    event.outcome === 'release';
  await ctx.ledger.run(async (tx) => {
    if (release) {
      await tx.release(ctx.manager, batch.id, line.quantity, line.id, today);
    } else {
      await tx.reject(ctx.manager, batch.id, line.quantity, line.id);
    }
    await tx.manager.update(ReturnLine, line.id, {
      assessmentStatus: release
        ? ReturnAssessmentStatus.RELEASED
        : ReturnAssessmentStatus.REJECTED,
      assessedBy: { id: ctx.manager.id },
      assessedAt: event.at,
      assessmentNote: event.note,
    });
  });
}
