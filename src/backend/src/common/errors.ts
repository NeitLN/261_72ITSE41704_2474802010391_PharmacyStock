/** One problem with one input field, shown next to that field in the UI (NFR-04). */
export interface FieldError {
  /** Dotted path of the field, e.g. `phone` or `lines.0.quantity`. */
  field: string;
  message: string;
}

/**
 * Base of every error the business layer raises on purpose.
 *
 * Services throw these instead of NestJS HTTP exceptions, so business code
 * does not depend on HTTP. Each subclass fixes its status code, and
 * `AllExceptionsFilter` turns any of them into the same response shape:
 * `{ statusCode, code, message, errors }`.
 */
export abstract class DomainError extends Error {
  abstract readonly status: number;

  protected constructor(
    readonly code: string,
    message: string,
    readonly errors: FieldError[] = [],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Input that is well-formed but not acceptable, reported per field. */
export class ValidationFailed extends DomainError {
  readonly status = 400;

  constructor(errors: FieldError[], message = 'Some fields are not valid.') {
    super('VALIDATION_FAILED', message, errors);
  }

  static field(field: string, message: string): ValidationFailed {
    return new ValidationFailed([{ field, message }], message);
  }
}

export class NotFound extends DomainError {
  readonly status = 404;

  constructor(what: string, id: string) {
    super('NOT_FOUND', `${what} ${id} was not found.`);
  }
}

/** The request clashes with data that already exists, e.g. a duplicate code. */
export class Conflict extends DomainError {
  readonly status = 409;

  constructor(code: string, message: string, field?: string) {
    super(code, message, field ? [{ field, message }] : []);
  }
}

export class Unauthenticated extends DomainError {
  readonly status = 401;

  constructor(message = 'Please sign in.') {
    super('UNAUTHENTICATED', message);
  }
}

/** The signed-in user's role lacks the permission (FR-39). */
export class PermissionDenied extends DomainError {
  readonly status = 403;

  constructor(permission: string) {
    super(
      'PERMISSION_DENIED',
      `Your role does not allow this action (${permission}).`,
    );
  }
}

/**
 * A business rule refused the request. `rule` names the rule (e.g. `BR03`)
 * so tests and logs can tell which one fired.
 */
export class BusinessRuleViolation extends DomainError {
  readonly status = 422;

  constructor(
    readonly rule: string,
    code: string,
    message: string,
    errors: FieldError[] = [],
  ) {
    super(code, message, errors);
  }
}
