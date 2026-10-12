import dataSource from '../database/data-source.js';
import { seed } from './seed.js';

// Entry point of `npm run seed`. Runs pending migrations first, so a fresh
// database needs only this one command after `docker compose up -d`.
await dataSource.initialize();
try {
  await dataSource.runMigrations({ transaction: 'each' });
  await seed(dataSource);
  console.log('Seed data written.');
} finally {
  await dataSource.destroy();
}
