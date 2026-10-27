import type { DataSource } from 'typeorm';
import type { Actor } from '../auth/actor.js';
import { ROLE_PERMISSIONS, RoleCode } from '../auth/permissions.js';
import {
  AuditLog,
  Batch,
  BatchStatus,
  Customer,
  Medicine,
  MedicineCategory,
  MedicineClassification,
  MedicinePrice,
  Prescriber,
  Supplier,
  UnitOfMeasure,
  User,
} from '../entities/index.js';
import { GoodsReceiptsService } from '../receiving/goods-receipts.service.js';
import { AlertEvaluator } from '../stock/alert-evaluator.js';
import { addDays, type Clock, FixedClock } from '../stock/clock.js';
import {
  DEMO_CUSTOMERS,
  DEMO_MEDICINES,
  DEMO_PRESCRIBERS,
  DEMO_SUPPLIERS,
} from './demo-catalogue.js';
import {
  DatedLedger,
  REPORT_MEDICINES,
  reportPeriods,
  seedReportHistory,
} from './demo-history.seed.js';

/** Written last, so its presence means the whole demo data set is there. */
const DEMO_MARKER = 'seed.demo.completed';

export type DemoSeedStatus = 'written' | 'skipped' | 'existing-data';

/** Small deterministic generator, so every seeded database looks the same. */
export function random(seed: number) {
  let state = seed;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    int: (min: number, max: number) =>
      min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]) => items[Math.floor(next() * items.length)],
  };
}

const CLASSIFICATION = {
  o: MedicineClassification.OTC,
  p: MedicineClassification.PRESCRIPTION,
  c: MedicineClassification.CONTROLLED,
} as const;

/** Units sold one by one in small numbers. */
const BULKY_UNITS = new Set(['BOTTLE', 'TUBE', 'INHALER']);

/** Medicines seeded below their reorder level, so UC10 has something to show. */
const LOW_STOCK = new Set([
  'AUGM625',
  'CETI10',
  'OMEP20',
  'AMLO5',
  'MET500',
  'SALB-INH',
  'ORS',
  'DIAZ5',
]);

interface PlannedBatch {
  medicineId: string;
  code: string;
  batchNumber: string;
  expiryDate: string;
  receiptDate: string;
  quantity: number;
  unitCost: number;
}

/**
 * The demo data set of plan W05-A3: about 60 medicines with prices, 10
 * suppliers, 12 patients, 7 prescribers, and about 120 batches received
 * through UC03 itself, so every quantity is backed by stock movements.
 *
 * Dates are relative to the day the seed runs (plan §10 F6): about one batch
 * in eight has already expired, about one in six expires within the alert
 * window, the rest are long-dated. One batch is put on hold. Every movement
 * is dated when it happened (a receipt on its receipt date), and five OTC
 * medicines get sales, returns and assessments over the previous month and
 * this month, so the movement report has two periods to compare (#57).
 *
 * Runs only on a database without medicines. The catalogue and each receipt
 * commit separately, so the last step writes a marker row in `audit_logs`; a
 * database with medicines but no marker is reported as `existing-data`
 * (either data entered by hand or an interrupted demo seed to reset).
 */
export async function seedDemoData(
  dataSource: DataSource,
  clock: Clock,
): Promise<DemoSeedStatus> {
  if (
    await dataSource.getRepository(AuditLog).existsBy({ action: DEMO_MARKER })
  ) {
    return 'skipped';
  }
  if ((await dataSource.getRepository(Medicine).count()) > 0) {
    return 'existing-data';
  }
  const today = clock.today();
  const rnd = random(20261012);
  const { p1Start } = reportPeriods(today);
  // The seed's own clock, set to each event's time; its ledger dates the
  // movements by it.
  const seedClock = new FixedClock(clock.now());
  const ledger = new DatedLedger(dataSource, seedClock);
  const reportCodes = new Set<string>(REPORT_MEDICINES);

  const manager = await dataSource.getRepository(User).findOneOrFail({
    where: { username: 'manager' },
    relations: { role: true },
  });
  const actor: Actor = {
    id: manager.id,
    username: manager.username,
    fullName: manager.fullName,
    role: RoleCode.MANAGER,
    permissions: new Set(ROLE_PERMISSIONS[RoleCode.MANAGER]),
  };
  const cashierUser = await dataSource
    .getRepository(User)
    .findOneOrFail({ where: { username: 'cashier' } });
  const cashier: Actor = {
    id: cashierUser.id,
    username: cashierUser.username,
    fullName: cashierUser.fullName,
    role: RoleCode.CASHIER,
    permissions: new Set(ROLE_PERMISSIONS[RoleCode.CASHIER]),
  };

  const { suppliers, medicines } = await dataSource.transaction(async (tx) => {
    const suppliers = await tx.save(
      DEMO_SUPPLIERS.map((s) => tx.create(Supplier, s)),
    );
    await tx.save(
      DEMO_CUSTOMERS.map((c) =>
        tx.create(Customer, { ...c, phone: c.phone ?? undefined }),
      ),
    );
    await tx.save(DEMO_PRESCRIBERS.map((p) => tx.create(Prescriber, p)));

    const categories = new Map(
      (await tx.find(MedicineCategory)).map((c) => [c.code, c]),
    );
    const units = new Map(
      (await tx.find(UnitOfMeasure)).map((u) => [u.code, u]),
    );
    const medicines: { id: string; code: string; unit: string }[] = [];
    for (const d of DEMO_MEDICINES) {
      const medicine = await tx.save(
        tx.create(Medicine, {
          code: d.code,
          name: d.name,
          activeIngredient: d.ingredient,
          strength: d.strength,
          category: categories.get(d.category)!,
          baseUnit: units.get(d.unit)!,
          classification: CLASSIFICATION[d.class],
          classificationSource:
            d.class === 'o' ? 'Package label (demo data)' : null,
          classificationDate: d.class === 'o' ? addDays(today, -120) : null,
          reorderLevel: d.reorder,
          expiryAlertDays: 90,
        }),
      );
      await tx.save(
        tx.create(MedicinePrice, {
          medicine,
          unitPrice: String(d.price),
          // In force before the first sale of the previous month.
          effectiveFrom: addDays(p1Start, -30),
          setBy: { id: actor.id },
        }),
      );
      medicines.push({ id: medicine.id, code: d.code, unit: d.unit });
    }
    return { suppliers, medicines };
  });

  // Two batches per medicine, with expiry spread over the three groups.
  const planned: PlannedBatch[] = [];
  const price = new Map(DEMO_MEDICINES.map((d) => [d.code, d]));
  medicines.forEach((med, i) => {
    const info = price.get(med.code)!;
    for (let b = 0; b < 2; b++) {
      const slot = (i * 2 + b) % 8;
      let expiryDate: string;
      let receiptDate: string;
      if (slot === 0) {
        expiryDate = addDays(today, -rnd.int(3, 60)); // already expired
        receiptDate = addDays(expiryDate, -rnd.int(200, 400));
      } else if (slot === 1 || (slot === 5 && i % 3 === 0)) {
        expiryDate = addDays(today, rnd.int(5, 85)); // inside the alert window
        receiptDate = addDays(today, -rnd.int(120, 300));
      } else {
        expiryDate = addDays(today, rnd.int(180, 900)); // long-dated
        receiptDate = addDays(today, -rnd.int(1, 150));
      }
      // A medicine of the report history is in stock before its first sale.
      if (reportCodes.has(med.code) && receiptDate >= p1Start) {
        receiptDate = addDays(p1Start, -rnd.int(10, 60));
      }
      const bulky = BULKY_UNITS.has(med.unit);
      let quantity = bulky ? rnd.int(4, 30) : rnd.int(40, 400);
      if (LOW_STOCK.has(med.code)) {
        quantity = Math.max(1, Math.floor(info.reorder / 4) - b);
      }
      planned.push({
        medicineId: med.id,
        code: med.code,
        batchNumber: `${med.code.replace(/[^A-Z0-9]/g, '').slice(0, 5)}${expiryDate.slice(2, 4)}${expiryDate.slice(5, 7)}${b + 1}`,
        expiryDate,
        receiptDate,
        quantity,
        // Cost a little under the selling price.
        unitCost: Math.round(info.price * (0.6 + rnd.int(0, 20) / 100)),
      });
    }
  });

  // Group into receipts of about five lines, oldest first. A receipt is dated
  // on the earliest receipt date of its lines, which is still before every
  // line's expiry.
  planned.sort((a, b) => a.receiptDate.localeCompare(b.receiptDate));
  const receipts = new GoodsReceiptsService(dataSource, ledger, seedClock);
  let documentNumber = 1;
  for (let start = 0; start < planned.length; start += 5) {
    const lines = planned.slice(start, start + 5);
    // 08:00 in Vietnam on the receipt date, a minute apart on the same day.
    seedClock.set(
      new Date(
        new Date(`${lines[0].receiptDate}T08:00:00+07:00`).getTime() +
          documentNumber * 60_000,
      ),
    );
    await receipts.create(actor, {
      supplierId: rnd.pick(suppliers).id,
      documentNumber: `HD-${String(documentNumber++).padStart(5, '0')}`,
      receiptDate: lines[0].receiptDate,
      lines: lines.map((l) => ({
        medicineId: l.medicineId,
        batchNumber: l.batchNumber,
        expiryDate: l.expiryDate,
        quantity: l.quantity,
        unitCost: l.unitCost,
      })),
    });
  }

  // One long-dated batch on hold, so FEFO has a non-active batch to skip.
  const held = planned.find(
    (p) => p.code === 'IBU400' && p.expiryDate > addDays(today, 90),
  );
  if (held) {
    await dataSource.getRepository(Batch).update(
      { batchNumber: held.batchNumber },
      {
        status: BatchStatus.ON_HOLD,
        statusReason: 'Supplier quality notice (demo data)',
        statusChangedAt: clock.now(),
        statusChangedBy: { id: actor.id },
      },
    );
  }
  await seedReportHistory({
    dataSource,
    ledger,
    clock: seedClock,
    now: clock.now(),
    manager: actor,
    cashier,
    medicineIds: new Map(medicines.map((m) => [m.code, m.id])),
    rnd,
  });

  // UC10: raise the low-stock alerts of the finished data set once, so the
  // demo shows the medicines that start below their reorder level.
  const medicineIds = (
    await dataSource.getRepository(Medicine).find({ select: { id: true } })
  ).map((m) => m.id);
  await dataSource.transaction((manager) =>
    new AlertEvaluator(clock).evaluate(manager, medicineIds),
  );
  await dataSource.getRepository(AuditLog).save({
    action: DEMO_MARKER,
    entityName: 'seed',
    details: `Demo data set written for business date ${today}.`,
    performedBy: { id: actor.id },
  });
  return 'written';
}
