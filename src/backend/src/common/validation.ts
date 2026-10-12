import {
  registerDecorator,
  ValidateIf,
  type ValidationOptions,
} from 'class-validator';
import {
  Param,
  ParseUUIDPipe,
  ValidationPipe,
  type ValidationError,
} from '@nestjs/common';
import { type FieldError, ValidationFailed } from './errors.js';

/** Flattens class-validator errors into dotted field paths, e.g. `lines.0.quantity`. */
export function toFieldErrors(
  errors: ValidationError[],
  parent = '',
): FieldError[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({
      field,
      message,
    }));
    return [...own, ...toFieldErrors(error.children ?? [], field)];
  });
}

/**
 * The global validation pipe. Unknown body fields are refused, and every
 * failure comes back as `ValidationFailed` with one entry per field.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => new ValidationFailed(toFieldErrors(errors)),
  });
}

/**
 * For a required field on an update: skip the checks only when the field is
 * left out. Unlike `@IsOptional()`, an explicit `null` is still validated, so
 * `{ name: null }` is a field error instead of a NOT NULL failure.
 */
export const IfSent = () =>
  ValidateIf((_object: unknown, value: unknown) => value !== undefined);

/**
 * A calendar date written exactly as `YYYY-MM-DD`. Stricter than
 * `@IsISO8601()`, which also accepts `2026` or `2026-10` (PostgreSQL then
 * fails with a 500) and full timestamps (which break date comparisons).
 */
export function IsCalendarDate(options?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isCalendarDate',
      target: object.constructor,
      propertyName: String(propertyName),
      options: {
        message: `${String(propertyName)} must be a date written as YYYY-MM-DD.`,
        ...options,
      },
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return false;
          }
          const date = new Date(`${value}T00:00:00Z`);
          return (
            !Number.isNaN(date.getTime()) &&
            date.toISOString().slice(0, 10) === value
          );
        },
      },
    });
  };
}

/** `@UuidParam()` reads `:id` and refuses anything that is not a UUID. */
export function UuidParam(name = 'id'): ParameterDecorator {
  return Param(
    name,
    new ParseUUIDPipe({
      exceptionFactory: () =>
        ValidationFailed.field(name, `${name} must be a valid UUID.`),
    }),
  );
}
