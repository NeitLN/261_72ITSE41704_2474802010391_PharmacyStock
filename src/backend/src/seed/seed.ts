import type { DataSource } from 'typeorm';
import { SystemClock, type Clock } from '../stock/clock.js';
import { seedAccessControl } from './access-control.seed.js';
import { seedCatalogueReference } from './catalogue-reference.seed.js';
import { type DemoSeedStatus, seedDemoData } from './demo-data.seed.js';

export interface SeedOptions {
  /** Also write the demo data set (medicines, suppliers, batches). */
  demo?: boolean;
  clock?: Clock;
}

/**
 * Reference data first (roles, permissions, sample accounts, categories,
 * units), in one transaction; each step is idempotent. Then, if asked, the
 * demo data set, which is written only into a database without medicines.
 * The e2e tests call this without `demo`, so they start from reference data.
 */
export async function seed(
  dataSource: DataSource,
  options: SeedOptions = {},
): Promise<{ demoWritten: boolean; demo: DemoSeedStatus | 'not-requested' }> {
  await dataSource.transaction(async (manager) => {
    await seedAccessControl(manager);
    await seedCatalogueReference(manager);
  });
  const demo = options.demo
    ? await seedDemoData(dataSource, options.clock ?? new SystemClock())
    : 'not-requested';
  return { demoWritten: demo === 'written', demo };
}
