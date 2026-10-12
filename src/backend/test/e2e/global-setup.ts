import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../../src/database/data-source-options.js';

/**
 * Runs once before the e2e files: creates the test database if needed, wipes
 * it and applies every migration, so the tests always see the schema the
 * migrations build (not one generated from the entities).
 */
export default async function setup(): Promise<void> {
  const options = dataSourceOptions();
  const name = String(options.database);
  if (!name.endsWith('_test')) {
    throw new Error(
      `Refusing to run e2e tests against "${name}": the name must end in _test.`,
    );
  }

  const admin = new DataSource({
    ...options,
    database: 'postgres',
    entities: [],
    migrations: [],
  });
  await admin.initialize();
  const found: unknown[] = await admin.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [name],
  );
  if (found.length === 0) {
    await admin.query(`CREATE DATABASE "${name}"`);
  }
  await admin.destroy();

  const dataSource = new DataSource(options);
  await dataSource.initialize();
  await dataSource.query('DROP SCHEMA public CASCADE');
  await dataSource.query('CREATE SCHEMA public');
  await dataSource.runMigrations({ transaction: 'each' });
  await dataSource.destroy();
}
