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
