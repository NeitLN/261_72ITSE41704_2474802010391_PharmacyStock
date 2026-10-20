import {
  type ArgumentsHost,
  BadRequestException,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { DomainError, type FieldError } from './errors.js';

/** The JSON body of every error response. */
export interface ErrorBody {
  statusCode: number;
  code: string;
  message: string;
  errors: FieldError[];
}

/**
 * PostgreSQL error codes the API answers with a clear message instead of a
 * 500. The constraints are safety nets behind the service checks, so reaching
 * one of them usually means two requests raced.
 */
const PG_ERRORS: Record<
  string,
  { status: number; code: string; message: string }
> = {
  '23505': {
    status: 409,
    code: 'DUPLICATE',
    message: 'This record already exists.',
  },
  '23503': {
    status: 409,
    code: 'REFERENCED',
    message:
      'The record is referenced by other data or refers to missing data.',
  },
  '23514': {
    status: 422,
    code: 'CONSTRAINT_VIOLATED',
    message: 'The change would break a stock or document rule and was refused.',
  },
  '22P02': {
    status: 400,
    code: 'VALIDATION_FAILED',
    message: 'A value has the wrong format.',
  },
  '55P03': {
    status: 409,
    code: 'BUSY',
    message: 'This item is busy, please try again.',
  },
  '40P01': {
    status: 409,
    code: 'BUSY',
    message: 'This item is busy, please try again.',
  },
};

/**
 * Codes of a database that cannot be reached: the pg driver's socket errors
 * and PostgreSQL's connection-exception and shutdown classes (08, 57P0x).
 */
const DATABASE_DOWN = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  '08000',
  '08001',
  '08003',
  '08006',
  '57P01',
  '57P02',
  '57P03',
]);

/** The error code of a driver error, wherever TypeORM put it. */
function errorCode(exception: unknown): string | undefined {
  if (exception instanceof QueryFailedError) {
    return (exception.driverError as { code?: string }).code;
  }
  return (exception as { code?: unknown } | null)?.code as string | undefined;
}

/**
 * Turns every error into `{ statusCode, code, message, errors }` and never
 * sends a stack trace (NFR-04). Unknown errors are logged and answered with a
 * generic 500.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const body = this.toBody(exception);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(body.statusCode)
      .json(body);
  }

  toBody(exception: unknown): ErrorBody {
    if (exception instanceof DomainError) {
      return {
        statusCode: exception.status,
        code: exception.code,
        message: exception.message,
        errors: exception.errors,
      };
    }

    // Input is checked by the validation pipe, which throws ValidationFailed,
    // so a plain BadRequestException can only come from the Express adapter:
    // a body that is not JSON or a malformed address. Same code as any
    // invalid input, without the parser's wording (positions, tokens).
    if (exception instanceof BadRequestException) {
      return {
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        message: /JSON/i.test(exception.message)
          ? 'The request body is not valid JSON.'
          : 'The request could not be read.',
        errors: [],
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        statusCode: status,
        code: `HTTP_${status}`,
        message: exception.message,
        errors: [],
      };
    }

    const code = errorCode(exception);
    if (code && DATABASE_DOWN.has(code)) {
      this.logger.error(`Database unreachable (${code})`);
      return {
        statusCode: 503,
        code: 'DATABASE_UNAVAILABLE',
        message:
          'The database cannot be reached right now. Please try again in a moment.',
        errors: [],
      };
    }

    if (exception instanceof QueryFailedError) {
      const known = code ? PG_ERRORS[code] : undefined;
      if (known) {
        return {
          statusCode: known.status,
          code: known.code,
          message: known.message,
          errors: [],
        };
      }
    }

    this.logger.error(exception instanceof Error ? exception.stack : exception);
    return {
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on the server. Please try again.',
      errors: [],
    };
  }
}
