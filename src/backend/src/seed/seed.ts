import type { DataSource } from 'typeorm';
import { seedAccessControl } from './access-control.seed.js';

/**
 * Every seed step, in dependency order, in one transaction. Each step is
 * idempotent, so `npm run seed` can run again on a seeded database.
 */
export async function seed(dataSource: DataSource): Promise<void> {
  await dataSource.transaction(async (manager) => {
    await seedAccessControl(manager);
  });
}
