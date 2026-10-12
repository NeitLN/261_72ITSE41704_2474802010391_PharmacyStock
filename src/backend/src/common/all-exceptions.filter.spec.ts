import { NotFoundException } from '@nestjs/common';
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
    ['23505', 409, 'DUPLICATE'],
    ['23514', 422, 'CONSTRAINT_VIOLATED'],
    ['55P03', 409, 'BUSY'],
    ['40P01', 409, 'BUSY'],
  ])('maps PostgreSQL error %s to %i %s', (pg, status, code) => {
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
});
