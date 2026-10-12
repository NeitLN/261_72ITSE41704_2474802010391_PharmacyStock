import type { INestApplication } from '@nestjs/common';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import { createValidationPipe } from './common/validation.js';

/**
 * Settings shared by main.ts and the e2e tests, so the tests exercise the
 * same prefix, validation and error format as the running API.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');

  // Reject any request body field that is not declared on a DTO, and reject
  // values that fail their class-validator rules (course requirement 7).
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });
}
