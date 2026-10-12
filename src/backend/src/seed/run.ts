import dataSource from '../database/data-source.js';
import { seed } from './seed.js';

// Entry point of `npm run seed`. Runs pending migrations first, so a fresh
// database needs only this one command after `docker compose up -d`.
// SEED_DEMO=false writes only the reference data.
await dataSource.initialize();
try {
  await dataSource.runMigrations({ transaction: 'each' });
  const { demoWritten } = await seed(dataSource, {
    demo: process.env.SEED_DEMO !== 'false',
  });
  console.log(
    demoWritten
      ? 'Reference and demo data written.'
      : 'Reference data written (demo data skipped: medicines already exist or SEED_DEMO=false).',
  );
} finally {
  await dataSource.destroy();
}
