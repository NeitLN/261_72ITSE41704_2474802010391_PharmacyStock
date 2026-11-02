// TC-30 (NFR-09; #65): a fingerprint of every batch balance and of the whole
// movement history, so a database restored from `pg_dump` can be compared with
// the original by two lines of output.
//
//   DB_NAME=pharmacy_stock npm run balances
//   DB_NAME=pharmacy_stock_restore npm run balances
//
// Identical lines mean identical balances and history.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../dist/database/data-source-options.js';

const here = dirname(fileURLToPath(import.meta.url));
const fromCommandLine = process.env.DB_NAME;
try {
  process.loadEnvFile(resolve(here, '../.env'));
} catch {
  // No .env file: rely on the environment.
}
if (fromCommandLine) process.env.DB_NAME = fromCommandLine;

const db = new DataSource({ ...dataSourceOptions(), entities: [], migrations: [] });
await db.initialize();
try {
  const [row] = await db.query(`
    SELECT
      (SELECT count(*) FROM batches)::int AS batches,
      (SELECT md5(coalesce(string_agg(id || ':' || "qtySellable" || ':' || "qtyQuarantine" || ':' || "qtyPendingDestruction", ',' ORDER BY id), '')) FROM batches) AS balances,
      (SELECT count(*) FROM stock_movements)::int AS movements,
      (SELECT md5(coalesce(string_agg(id::text, ',' ORDER BY id), '')) FROM stock_movements) AS history`);
  console.log(
    `${process.env.DB_NAME ?? 'pharmacy_stock'}: ${row.batches} batches, balances ${row.balances}; ${row.movements} movements, history ${row.history}`,
  );
} finally {
  await db.destroy();
}
