import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { AllExceptionsFilter } from './all-exceptions.filter.js';
import { BusinessRuleViolation, ValidationFailed } from './errors.js';
import { toFieldErrors } from './validation.js';

function pgError(code: string) {
  return new QueryFailedError(
    'INSERT ...',
    [],
    Object.assign(new Error('pg'), { code }),
  );
}

describe('AllExceptionsFilter (NFR-04)', () => {
  const filter = new AllExceptionsFilter();

  it('keeps the status, code and field errors of a domain error', () => {
    expect(
      filter.toBody(ValidationFailed.field('phone', 'Phone is required.')),
    ).toEqual({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'Phone is required.',
      errors: [{ field: 'phone', message: 'Phone is required.' }],
    });
    expect(
      filter.toBody(
        new BusinessRuleViolation('BR03', 'INSUFFICIENT_STOCK', 'Only 4 left.'),
      ),
    ).toMatchObject({ statusCode: 422, code: 'INSUFFICIENT_STOCK' });
  });

  it.each([
    ['ERR-07', '23505', 409, 'DUPLICATE'],
    ['ERR-09', '23514', 422, 'CONSTRAINT_VIOLATED'],
    ['ERR-10', '55P03', 409, 'BUSY'],
    ['ERR-10', '40P01', 409, 'BUSY'],
  ])('%s maps PostgreSQL error %s to %i %s', (_, pg, status, code) => {
    expect(filter.toBody(pgError(pg))).toMatchObject({
      statusCode: status,
      code,
    });
  });

  it('answers an unknown error with a generic 500 and no internals', () => {
    const logged = vi
      .spyOn(filter['logger'], 'error')
      .mockImplementation(() => {});
    const body = filter.toBody(
      new Error('relation "secret_table" does not exist'),
    );

    expect(body).toEqual({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: expect.not.stringContaining('secret_table'),
      errors: [],
    });
    expect(logged).toHaveBeenCalled();
  });

  it('passes framework HTTP errors through with their status', () => {
    expect(filter.toBody(new NotFoundException())).toMatchObject({
      statusCode: 404,
      code: 'HTTP_404',
    });
  });

  it('ERR-03 answers a body that is not JSON like any invalid input, without parser details (#47)', () => {
    // What the Express adapter makes of body-parser's SyntaxError.
    const parse = new BadRequestException(
      'Expected double-quoted property name in JSON at position 13',
    );
    expect(filter.toBody(parse)).toEqual({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'The request body is not valid JSON.',
      errors: [],
    });
    // A malformed address is not blamed on the body, even if it says JSON.
    for (const message of [
      'URI malformed',
      "Failed to decode param 'JSON%FF'",
    ]) {
      expect(filter.toBody(new BadRequestException(message))).toEqual({
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        message: 'The request could not be read.',
        errors: [],
      });
    }
  });

  it.each([
    [
      'a refused socket',
      Object.assign(new Error('connect'), { code: 'ECONNREFUSED' }),
    ],
    [
      'a dropped socket',
      Object.assign(new Error('read'), { code: 'ECONNRESET' }),
    ],
    ['a server shutdown', pgError('57P01')],
    ['a broken connection', pgError('08006')],
  ])('ERR-08 answers %s with 503 and no internals (#47)', (_, error) => {
    vi.spyOn(filter['logger'], 'error').mockImplementation(() => {});
    expect(filter.toBody(error)).toEqual({
      statusCode: 503,
      code: 'DATABASE_UNAVAILABLE',
      message:
        'The database cannot be reached right now. Please try again in a moment.',
      errors: [],
    });
  });
});

describe('toFieldErrors', () => {
  it('builds dotted paths for nested and array fields', () => {
    expect(
      toFieldErrors([
        {
          property: 'name',
          constraints: { isNotEmpty: 'Name is required.' },
          children: [],
        },
        {
          property: 'lines',
          children: [
            {
              property: '0',
              children: [
                {
                  property: 'quantity',
                  constraints: { min: 'Must be positive.' },
                  children: [],
                },
              ],
            },
          ],
        },
      ]),
    ).toEqual([
      { field: 'name', message: 'Name is required.' },
      { field: 'lines.0.quantity', message: 'Must be positive.' },
    ]);
  });

  it('ERR-01 keeps one message per field: "required" when the value is missing (#47)', () => {
    expect(
      toFieldErrors([
        {
          property: 'name',
          constraints: {
            maxLength: 'name must be shorter than or equal to 200 characters',
            isNotEmpty: 'Name is required.',
            isString: 'name must be a string',
          },
          children: [],
        },
      ]),
    ).toEqual([{ field: 'name', message: 'Name is required.' }]);
  });

  it('ERR-02 prefers the message written for people over a default one (#47)', () => {
    expect(
      toFieldErrors([
        {
          property: 'quantity',
          constraints: {
            max: 'quantity must not be greater than 1000000',
            isInt: 'Quantity must be a whole number of base units.',
          },
          children: [],
        },
        {
          property: 'note',
          constraints: { isString: 'note must be a string' },
          children: [],
        },
      ]),
    ).toEqual([
      {
        field: 'quantity',
        message: 'Quantity must be a whole number of base units.',
      },
      { field: 'note', message: 'Note must be a string.' },
    ]);
  });

  it('ERR-02 reports a wrong kind of value before a length or range message (#47)', () => {
    expect(
      toFieldErrors([
        {
          property: 'name',
          constraints: {
            maxLength: 'name must be shorter than or equal to 200 characters',
            isString: 'name must be a string',
          },
          children: [],
        },
        {
          property: 'quantity',
          constraints: {
            min: 'Quantity must be at least 1.',
            isInt: 'Quantity must be a whole number of base units.',
          },
          children: [],
        },
        {
          property: 'supplierId',
          constraints: { isUuid: 'Choose a supplier.' },
          children: [],
        },
      ]),
    ).toEqual([
      { field: 'name', message: 'Name must be a string.' },
      {
        field: 'quantity',
        message: 'Quantity must be a whole number of base units.',
      },
      { field: 'supplierId', message: 'Choose a supplier.' },
    ]);
  });

  it('ERR-08 rewrites class-validator defaults as sentences that name the field (#185)', () => {
    const field = (property: string, constraints: Record<string, string>) => ({
      property,
      constraints,
      children: [],
    });
    expect(
      toFieldErrors([
        field('name', {
          maxLength: 'name must be shorter than or equal to 200 characters',
        }),
        field('reorderLevel', {
          max: 'reorderLevel must not be greater than 1000000',
        }),
        field('lines', {
          arrayMaxSize: 'lines must contain no more than 100 elements',
        }),
        field('expiryAlertDays', {
          min: 'expiryAlertDays must not be less than 0',
        }),
        field('reason', {
          minLength: 'reason must be longer than or equal to 3 characters',
        }),
        field('quantity', { isInt: 'Quantity must be a whole number.' }),
      ]),
    ).toEqual([
      { field: 'name', message: 'Name can be at most 200 characters.' },
      {
        field: 'reorderLevel',
        message: 'Reorder level can be at most 1000000.',
      },
      { field: 'lines', message: 'Lines can have at most 100 entries.' },
      {
        field: 'expiryAlertDays',
        message: 'Expiry alert days must be at least 0.',
      },
      { field: 'reason', message: 'Reason must be at least 3 characters.' },
      { field: 'quantity', message: 'Quantity must be a whole number.' },
    ]);
  });
});
