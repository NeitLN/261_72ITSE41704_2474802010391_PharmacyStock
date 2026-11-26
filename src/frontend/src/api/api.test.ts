import type { FormInstance } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import { type ApiError, outcomeUnknown, showApiError } from './errors';
import { lineEstimateXu } from './sales';

const apiError = (over: Partial<ApiError>): ApiError => ({
  statusCode: 422,
  code: 'VALIDATION_FAILED',
  message: 'Some fields are not valid.',
  errors: [],
  ...over,
});

/** An axios-like error carrying `body`, as `toApiError` reads it. */
const thrown = (body: ApiError) => ({ isAxiosError: true, response: { status: body.statusCode, data: body } });

function fakeForm(values: Record<string, unknown>) {
  return {
    getFieldsValue: () => values,
    setFields: vi.fn(),
    scrollToField: vi.fn(),
  } as unknown as FormInstance & { setFields: ReturnType<typeof vi.fn>; scrollToField: ReturnType<typeof vi.fn> };
}

describe('lineEstimateXu (cart estimate)', () => {
  it('multiplies in whole xu', () => {
    expect(lineEstimateXu('1750.50', 3)).toBe(525150n);
  });

  it('counts a quantity that is not a whole positive number as 0 instead of throwing', () => {
    expect(lineEstimateXu('2200.00', 2.5)).toBe(0n);
    expect(lineEstimateXu('2200.00', null)).toBe(0n);
    expect(lineEstimateXu('2200.00', 0)).toBe(0n);
    expect(lineEstimateXu('2200.00', -1)).toBe(0n);
  });
});

describe('outcomeUnknown (FR-23)', () => {
  it('is true when the request may have been saved', () => {
    expect(outcomeUnknown(apiError({ statusCode: 0, code: 'NETWORK' }))).toBe(true);
    expect(outcomeUnknown(apiError({ statusCode: 500, code: 'INTERNAL' }))).toBe(true);
  });

  it('is false when the server refused the request', () => {
    expect(outcomeUnknown(apiError({ statusCode: 422 }))).toBe(false);
    expect(outcomeUnknown(apiError({ statusCode: 409, code: 'CONFLICT' }))).toBe(false);
  });
});

describe('showApiError (NFR-04)', () => {
  it('puts a list error under its field and scrolls to it', () => {
    const form = fakeForm({ lines: [{}] });
    const left = showApiError(
      form,
      thrown(apiError({ errors: [{ field: 'lines.0.quantity', message: 'Too many.' }] })),
    );
    expect(left).toBeNull();
    expect(form.setFields).toHaveBeenCalledWith([{ name: ['lines', 0, 'quantity'], errors: ['Too many.'] }]);
    expect(form.scrollToField).toHaveBeenCalledWith(['lines', 0, 'quantity'], { focus: true });
  });

  it('keeps the message of a field that is not on the screen', () => {
    const form = fakeForm({ fullName: '' });
    const left = showApiError(
      form,
      thrown(apiError({ errors: [{ field: 'methodNote', message: 'Say how it was destroyed.' }] })),
    );
    expect(left).toBe('Some fields are not valid. Say how it was destroyed.');
    expect(form.scrollToField).not.toHaveBeenCalled();
  });
});
