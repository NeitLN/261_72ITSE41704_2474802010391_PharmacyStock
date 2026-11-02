import type { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions.js';
import {
  AuditLog,
  Batch,
  Customer,
  DestructionRecord,
  DispenseLine,
  GoodsReceipt,
  GoodsReceiptLine,
  Medicine,
  MedicineCategory,
  MedicinePrice,
  Permission,
  Prescriber,
  Prescription,
  PrescriptionItem,
  ProcessedRequest,
  ReturnLine,
  Role,
  Sale,
  SaleLine,
  SaleReturn,
  StockAlert,
  StockMovement,
  StockTake,
  StockTakeCounter,
  StockTakeLine,
  StockTakeMedicine,
  Supplier,
  UnitOfMeasure,
  User,
} from '../entities/index.js';
import { MIGRATIONS } from '../migrations/index.js';

export const ENTITIES = [
  Medicine,
  MedicineCategory,
  MedicinePrice,
  UnitOfMeasure,
  Batch,
  Supplier,
  GoodsReceipt,
  GoodsReceiptLine,
  Customer,
  Prescriber,
  Prescription,
  PrescriptionItem,
  DispenseLine,
  Sale,
  SaleLine,
  SaleReturn,
  ReturnLine,
  StockMovement,
  StockTake,
  StockTakeLine,
  StockTakeMedicine,
  StockTakeCounter,
  StockAlert,
  DestructionRecord,
  User,
  Role,
  Permission,
  AuditLog,
  ProcessedRequest,
];

/**
 * Connection settings shared by the application, the TypeORM CLI and the e2e
 * tests, read from environment variables (see .env.example).
 *
 * The schema is built only by migrations; `synchronize` is never used.
 * Migrations are listed explicitly in src/migrations/index.ts so the same list
 * works from compiled JavaScript and from the TypeScript sources under Vitest.
 */
export function dataSourceOptions(
  env: NodeJS.ProcessEnv = process.env,
): PostgresDataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST ?? 'localhost',
    port: parseInt(env.DB_PORT ?? '5433', 10),
    username: env.DB_USERNAME ?? 'pharmacy_app',
    password: env.DB_PASSWORD ?? '',
    database: env.DB_NAME ?? 'pharmacy_stock',
    entities: ENTITIES,
    migrations: MIGRATIONS,
    migrationsTableName: 'migrations',
    // gen_random_uuid() is built into PostgreSQL 13+, so no extension is needed.
    uuidExtension: 'pgcrypto',
    synchronize: false,
    logging: env.DB_LOGGING === 'true',
  };
}
