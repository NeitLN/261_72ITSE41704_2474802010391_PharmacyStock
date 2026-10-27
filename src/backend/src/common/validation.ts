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

/**
 * Constraints that say the value is missing. When one fails, its message is
 * the one the user needs; "must be a string" on top of it is noise.
 */
const MISSING = ['isDefined', 'isNotEmpty', 'arrayMinSize', 'arrayNotEmpty'];

/**
 * Constraints about the kind of value. When one fails, a length or range
 * message on top of it ("must be at least 1" for `"ten"`) is misleading.
 */
const WRONG_TYPE = [
  'isString',
  'isInt',
  'isNumber',
  'isBoolean',
  'isUuid',
  'isArray',
  'isObject',
  'isEmail',
  'isEnum',
  'isIn',
  'isCalendarDate',
  'isIso8601',
  'isDateString',
  'matches',
];

/** `reorderLevel` → `Reorder level`, the way a field is named on screen. */
function labelOf(property: string): string {
  const words = property.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** class-validator's default texts, after the property name, as sentences (#185). */
const DEFAULT_TEXTS: Array<[RegExp, (label: string, n: string) => string]> = [
  [
    /^ must be shorter than or equal to (\d+) characters$/,
    (label, n) => `${label} can be at most ${n} characters.`,
  ],
  [
    /^ must be longer than or equal to (\d+) characters$/,
    (label, n) => `${label} must be at least ${n} characters.`,
  ],
  [
    /^ must not be greater than (-?[\d.]+)$/,
    (label, n) => `${label} can be at most ${n}.`,
  ],
  [
    /^ must not be less than (-?[\d.]+)$/,
    (label, n) => `${label} must be at least ${n}.`,
  ],
  [
    /^ must contain no more than (\d+) elements$/,
    (label, n) => `${label} can have at most ${n} entries.`,
  ],
  [
    /^ must contain at least (\d+) elements$/,
    (label, n) => `${label} needs at least ${n} entries.`,
  ],
];

/**
 * A default message names the field by its code name ("reorderLevel must
 * not be greater than 1000000"); NFR-04 wants the problem said in words.
 * Messages written for people pass through unchanged.
 */
function readable(message: string, property: string): string {
  if (!message.startsWith(`${property} `)) return message;
  const rest = message.slice(property.length);
  for (const [pattern, sentence] of DEFAULT_TEXTS) {
    const match = rest.match(pattern);
    if (match) return sentence(labelOf(property), match[1]);
  }
  const text = `${labelOf(property)}${rest}`;
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

/**
 * The one message shown under a field (#47), in this order: "required" if
 * the value is missing; else what is wrong with its kind; else the first
 * message written for people; else the first one. class-validator's own
 * defaults start with the property name and are rewritten as sentences.
 */
function messageFor(error: ValidationError): string | undefined {
  const message = pickMessage(error);
  return message === undefined ? undefined : readable(message, error.property);
}

function pickMessage(error: ValidationError): string | undefined {
  const constraints = error.constraints ?? {};
  // Constraint names differ in case between versions (isUUID, isISO8601).
  const named = (wanted: string) =>
    Object.keys(constraints).find(
      (k) => k.toLowerCase() === wanted.toLowerCase(),
    );
  const first = (list: string[]) =>
    list.map(named).find((k): k is string => k !== undefined);
  const chosen = first(MISSING) ?? first(WRONG_TYPE);
  if (chosen) return constraints[chosen];
  const messages = Object.values(constraints);
  return (
    messages.find((m) => !m.startsWith(`${error.property} `)) ?? messages[0]
  );
}

/**
 * Flattens class-validator errors into dotted field paths, e.g.
 * `lines.0.quantity`, with one message per field.
 */
export function toFieldErrors(
  errors: ValidationError[],
  parent = '',
): FieldError[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const message = messageFor(error);
    const own = message ? [{ field, message }] : [];
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
