import { registerAs } from '@nestjs/config';

/**
 * Database settings read from environment variables.
 * See .env.example for the expected keys.
 */
export default registerAs('database', () => ({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'pharmacy_stock',
  // synchronize rewrites the schema on boot. Local development only.
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
}));
