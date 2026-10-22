import type { MigrationInterface } from 'typeorm';
import { InitialSchema1791815704381 } from './1791815704381-InitialSchema.js';
import { StockTakeLineCounter1792600000000 } from './1792600000000-StockTakeLineCounter.js';

/**
 * Every migration, oldest first. After `npm run migration:generate`, add the
 * new class here: the list is explicit so it works both from dist/ and from
 * the TypeScript sources in the e2e tests.
 */
export const MIGRATIONS: Array<new () => MigrationInterface> = [
  InitialSchema1791815704381,
  StockTakeLineCounter1792600000000,
];
