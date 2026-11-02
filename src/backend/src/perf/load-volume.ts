import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import type { Actor } from '../auth/actor.js';
import { ROLE_PERMISSIONS, type RoleCode } from '../auth/permissions.js';
import { PriceBook } from '../catalogue/price-book.js';
import { dataSourceOptions } from '../database/data-source-options.js';
import {
  Medicine,
  MedicineCategory,
  MedicineClassification,
  MovementType,
  SourceDocumentType,
  UnitOfMeasure,
  User,
} from '../entities/index.js';
import { SalesService } from '../sales/sales.service.js';
import { seed } from '../seed/seed.js';
import { StockLedger } from '../stock/stock-ledger.js';

/**
 * TC-29 data set (NFR-01, NFR-02, NFR-13; #65): 1,000 medicines with a price,
 * 5,000 batches received over the last 30 days, and 5,000 one-line
 * over-the-counter sales, so the month holds 10,000 stock movements.
 *
 * Writes only to a database whose name ends in `_perf`, which it creates and
 * empties first, so it can never touch the working database. Everything goes
 * through StockLedger and SalesService, so the balances and the movement
 * history obey the same rules as real use.
 *
 *   DB_NAME=pharmacy_stock_perf npm run perf:load
 */
const MEDICINES = 1_000;
const BATCHES_PER_MEDICINE = 5;
const SALES = 5_000;
const RECEIPT_DOC = '00000000-0000-4000-8000-00000000c029';

// Like the TypeORM CLI, read .env for the connection; DB_NAME may come from the command line.
const fromCommandLine = process.env.DB_NAME;
try {
  process.loadEnvFile('.env');
} catch {
  // No .env file: rely on the environment, as in CI.
}
process.env.DB_NAME = fromCommandLine ?? 'pharmacy_stock_perf';
const options = dataSourceOptions();
const name = String(options.database);
if (!name.endsWith('_perf')) {
  throw new Error(`Refusing to load test volume into "${name}": the name must end in _perf.`);
}

async function freshDatabase(): Promise<void> {
  const admin = new DataSource({ ...options, database: 'postgres', entities: [], migrations: [] });
  await admin.initialize();
  const found: unknown[] = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
  if (found.length === 0) await admin.query(`CREATE DATABASE "${name}"`);
  await admin.destroy();
  const ds = new DataSource(options);
  await ds.initialize();
  await ds.query('DROP SCHEMA public CASCADE');
  await ds.query('CREATE SCHEMA public');
  await ds.runMigrations({ transaction: 'each' });
  await seed(ds, { demo: false });
  await ds.destroy();
}

async function actor(ds: DataSource, username: string): Promise<Actor> {
  const user = await ds.getRepository(User).findOneOrFail({ where: { username }, relations: { role: true } });
  const role = user.role.code as RoleCode;
  return { id: user.id, username: user.username, fullName: user.fullName, role, permissions: new Set(ROLE_PERMISSIONS[role]) };
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);
const progress = (label: string, done: number, total: number) => {
  if (done % 500 === 0 || done === total) console.log(`  ${label}: ${done}/${total}`);
};

async function main(): Promise<void> {
  const started = Date.now();
  console.log(`Preparing ${name} (migrations and reference data)…`);
  await freshDatabase();

  const { AppModule } = await import('../app.module.js');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  try {
    const ds = app.get(DataSource);
    const ledger = app.get(StockLedger);
    const prices = app.get(PriceBook);
    const sales = app.get(SalesService);
    const manager = await actor(ds, 'manager');
    const cashier = await actor(ds, 'cashier');
    const category = await ds.getRepository(MedicineCategory).findOneByOrFail({});
    const unit = await ds.getRepository(UnitOfMeasure).findOneByOrFail({ isBaseUnit: true });

    console.log('Medicines with prices…');
    const ids: string[] = [];
    for (let i = 1; i <= MEDICINES; i += 1) {
      const code = `PERF${String(i).padStart(4, '0')}`;
      const medicine = await ds.getRepository(Medicine).save({
        code,
        name: `Performance medicine ${i} ${i % 3 === 0 ? 'tablet' : i % 3 === 1 ? 'capsule' : 'syrup'}`,
        activeIngredient: `Ingredient ${i % 97}`,
        classification: MedicineClassification.OTC,
        classificationSource: `Registration PERF-${i}`,
        classificationDate: '2026-01-01',
        category,
        baseUnit: unit,
      });
      await prices.setPrice(ds.manager, manager, medicine.id, 1_000 + (i % 50) * 100, '2026-01-01');
      ids.push(medicine.id);
      progress('medicines', i, MEDICINES);
    }

    console.log('Batches received over the last 30 days…');
    for (let i = 0; i < ids.length; i += 1) {
      await ledger.run(async (tx) => {
        await tx.lockMedicines([ids[i]]);
        for (let b = 0; b < BATCHES_PER_MEDICINE; b += 1) {
          const batch = await tx.createBatch({
            medicineId: ids[i],
            batchNumber: `PB${i}-${b}`,
            expiryDate: `2028-0${(b % 9) + 1}-15`,
            unitCost: '500',
            receivedAt: daysAgo(30 - ((i + b) % 29)),
          });
          await tx.post(manager, {
            batchId: batch.id,
            type: MovementType.RECEIPT,
            deltaSellable: 100,
            sourceDocumentType: SourceDocumentType.GOODS_RECEIPT,
            sourceDocumentId: RECEIPT_DOC,
          });
        }
      });
      progress('medicines received', i + 1, ids.length);
    }

    console.log('Over-the-counter sales…');
    for (let s = 1; s <= SALES; s += 1) {
      await sales.record(cashier, {
        requestId: randomUUID(),
        otcLines: [{ medicineId: ids[(s * 7) % ids.length], quantity: 1 }],
      } as Parameters<SalesService['record']>[1]);
      progress('sales', s, SALES);
    }

    const [counts] = await ds.query(
      `SELECT (SELECT count(*) FROM medicines) AS medicines, (SELECT count(*) FROM batches) AS batches,
              (SELECT count(*) FROM stock_movements) AS movements`,
    );
    console.log(`Done in ${Math.round((Date.now() - started) / 1000)} s:`, counts);
  } finally {
    await app.close();
  }
}

await main();
