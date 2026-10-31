import type { MigrationInterface } from 'typeorm';
import { InitialSchema1791815704381 } from './1791815704381-InitialSchema.js';
import { MovementTimeAtWrite1792504000000 } from './1792504000000-MovementTimeAtWrite.js';
import { StockTakeLineCounter1792600000000 } from './1792600000000-StockTakeLineCounter.js';
import { StockTakeMedicines1793000000000 } from './1793000000000-StockTakeMedicines.js';
import { StockTakeCounters1793100000000 } from './1793100000000-StockTakeCounters.js';
import { DestructionRecords1793200000000 } from './1793200000000-DestructionRecords.js';

/**
 * Every migration, oldest first. After `npm run migration:generate`, add the
 * new class here: the list is explicit so it works both from dist/ and from
 * the TypeScript sources in the e2e tests.
 */
export const MIGRATIONS: Array<new () => MigrationInterface> = [
  InitialSchema1791815704381,
  MovementTimeAtWrite1792504000000,
  StockTakeLineCounter1792600000000,
  StockTakeMedicines1793000000000,
  StockTakeCounters1793100000000,
  DestructionRecords1793200000000,
];
