import { DataSource } from 'typeorm';
import { dataSourceOptions } from './data-source-options.js';

// Used by the TypeORM CLI (npm run migration:*), which runs on the compiled
// output in dist/. The CLI does not read .env by itself.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env file: rely on the environment, as in CI.
}

export default new DataSource(dataSourceOptions());
