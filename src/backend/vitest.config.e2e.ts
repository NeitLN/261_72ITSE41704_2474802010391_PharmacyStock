import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// The e2e tests run against their own database, never the development one.
// The connection comes from .env (or the CI environment); only the database
// name is replaced by DB_TEST_NAME.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env file: rely on the environment, as in CI.
}
const testDatabase = process.env.DB_TEST_NAME ?? 'pharmacy_stock_test';
process.env.DB_NAME = testDatabase;
process.env.AUTH_MODE = 'dev';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/e2e/global-setup.ts'],
    env: { DB_NAME: testDatabase, AUTH_MODE: 'dev' },
    // One shared database: run the files one after another.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
