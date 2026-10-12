import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { DEV_USER_HEADER } from '../../src/auth/dev-auth.guard.js';
import { seed } from '../../src/seed/seed.js';
import { Clock, type FixedClock } from '../../src/stock/clock.js';

export interface TestApp {
  app: INestApplication;
  dataSource: DataSource;
  /** A supertest agent on the running app. */
  http: () => ReturnType<typeof request>;
}

/**
 * Boots the whole application with the same settings as main.ts. Pass a
 * FixedClock to control "today" in date rules.
 */
export async function createTestApp(
  options: { clock?: FixedClock } = {},
): Promise<TestApp> {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  if (options.clock) builder.overrideProvider(Clock).useValue(options.clock);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return {
    app,
    dataSource: app.get(DataSource),
    http: () => request(app.getHttpServer()),
  };
}

/**
 * Empties every table and writes the seed again, so each test starts from the
 * same data. TRUNCATE is not blocked by the append-only trigger, which only
 * guards UPDATE and DELETE.
 */
export async function resetDatabase(dataSource: DataSource): Promise<void> {
  const tables = dataSource.entityMetadatas
    .map((meta) => `"${meta.tableName}"`)
    .join(', ');
  await dataSource.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
  await seed(dataSource);
}

/** Header that makes a request act as one of the seeded sample users. */
export function as(username: 'manager' | 'pharmacist' | 'cashier') {
  return { [DEV_USER_HEADER]: username };
}
