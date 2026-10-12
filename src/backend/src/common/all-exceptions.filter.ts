import {
  type ArgumentsHost,
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

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        statusCode: status,
        code: `HTTP_${status}`,
        message: exception.message,
        errors: [],
      };
    }

    if (exception instanceof QueryFailedError) {
      const pgCode = (exception.driverError as { code?: string }).code;
      const known = pgCode ? PG_ERRORS[pgCode] : undefined;
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
