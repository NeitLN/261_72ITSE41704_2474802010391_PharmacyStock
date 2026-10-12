import dataSource from '../database/data-source.js';
import { seed } from './seed.js';

// Entry point of `npm run seed`. Runs pending migrations first, so a fresh
// database needs only this one command after `docker compose up -d`.
// SEED_DEMO=false writes only the reference data.
await dataSource.initialize();
try {
  await dataSource.runMigrations({ transaction: 'each' });
  const { demo } = await seed(dataSource, {
    demo: process.env.SEED_DEMO !== 'false',
  });
  const messages = {
    written: 'Reference and demo data written.',
    skipped: 'Reference data written; the demo data set is already there.',
    'existing-data':
      'Reference data written. Demo data NOT written: medicines exist but no completed demo seed is recorded. If this database holds only an interrupted demo seed, reset it (docker compose down -v) and run the seed again.',
    'not-requested': 'Reference data written (SEED_DEMO=false).',
  } as const;
  console.log(messages[demo]);
} finally {
  await dataSource.destroy();
}
