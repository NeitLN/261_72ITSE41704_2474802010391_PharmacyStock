import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { toFieldErrors } from '../../common/validation.js';
import { ReturnDto } from './return.dto.js';

const REQUEST = '9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f';
const SALE = '3a4b5c6d-7e8f-4a0b-9c1d-2e3f4a5b6c7d';
const SALE_LINE = '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e';

const valid = {
  requestId: REQUEST,
  saleId: SALE,
  reason: '  Damaged box  ',
  lines: [{ saleLineId: SALE_LINE, quantity: 2 }],
};

/** Validates a body merged over the complete one, the way the pipe does. */
async function errorsOf(overrides: object) {
  const dto = plainToInstance(ReturnDto, { ...valid, ...overrides });
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { dto, errors: toFieldErrors(errors) };
}

/** One returned line with a field replaced. */
const lineWith = (overrides: object) => ({
  lines: [{ ...valid.lines[0], ...overrides }],
});

describe('ReturnDto validation (FR-27, FR-23)', () => {
  it('UC08-U1 accepts a complete return and trims the reason', async () => {
    const { dto, errors } = await errorsOf({});
    expect(errors).toEqual([]);
    expect(dto.reason).toBe('Damaged box');
    expect(dto.lines[0].quantity).toBe(2);
  });

  it('UC08-U2 requires a reason', async () => {
    const { errors } = await errorsOf({ reason: undefined });
    expect(errors).toEqual([
      { field: 'reason', message: 'Say why the goods are returned.' },
    ]);
  });

  it('UC08-U3 refuses an empty reason', async () => {
    const { errors } = await errorsOf({ reason: '' });
    expect(errors).toEqual([
      { field: 'reason', message: 'Say why the goods are returned.' },
    ]);
  });

  it('UC08-U4 refuses a reason of spaces only', async () => {
    const { errors } = await errorsOf({ reason: '   ' });
    expect(errors).toEqual([
      { field: 'reason', message: 'Say why the goods are returned.' },
    ]);
  });

  it('UC08-U5 refuses a quantity of zero', async () => {
    const { errors } = await errorsOf(lineWith({ quantity: 0 }));
    expect(errors).toEqual([
      { field: 'lines.0.quantity', message: 'Quantity must be at least 1.' },
    ]);
  });

  it('UC08-U6 refuses a negative quantity', async () => {
    const { errors } = await errorsOf(lineWith({ quantity: -1 }));
    expect(errors).toEqual([
      { field: 'lines.0.quantity', message: 'Quantity must be at least 1.' },
    ]);
  });

  it('UC08-U7 refuses a fractional quantity', async () => {
    const { errors } = await errorsOf(lineWith({ quantity: 2.5 }));
    expect(errors).toEqual([
      {
        field: 'lines.0.quantity',
        message: 'Quantity must be a whole number of base units.',
      },
    ]);
  });

  it('UC08-U8 requires at least one line', async () => {
    const { errors } = await errorsOf({ lines: [] });
    expect(errors).toEqual([
      { field: 'lines', message: 'Add at least one line to return.' },
    ]);
  });

  it('UC08-U9 refuses a sale line that is not a UUID', async () => {
    const { errors } = await errorsOf(lineWith({ saleLineId: 'line-1' }));
    expect(errors).toEqual([
      { field: 'lines.0.saleLineId', message: 'Choose a line of the sale.' },
    ]);
  });

  it('UC08-U10 refuses a sale that is not a UUID', async () => {
    const { errors } = await errorsOf({ saleId: 'sale-1' });
    expect(errors).toEqual([
      { field: 'saleId', message: 'Choose the sale to return against.' },
    ]);
  });

  it('UC08-U11 refuses a request ID that is not a UUID', async () => {
    const { errors } = await errorsOf({ requestId: 'request-1' });
    expect(errors).toEqual([
      { field: 'requestId', message: 'Request ID must be a UUID.' },
    ]);
  });

  it('UC08-U12 refuses a reason shorter than 3 characters', async () => {
    const { errors } = await errorsOf({ reason: ' ok ' });
    expect(errors).toEqual([
      { field: 'reason', message: 'Give a reason of at least 3 characters.' },
    ]);
  });
});
