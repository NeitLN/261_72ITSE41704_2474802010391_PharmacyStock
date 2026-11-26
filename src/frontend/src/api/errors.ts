import type { FormInstance } from 'antd';
import { isAxiosError } from 'axios';

/** One problem with one field, as the API reports it. */
export interface FieldError {
  field: string;
  message: string;
}

/** The body of every error response from the API. */
export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  errors: FieldError[];
}

/** Normalises anything thrown by an API call into an `ApiError`. */
export function toApiError(error: unknown): ApiError {
  if (isAxiosError(error)) {
    const body = error.response?.data as Partial<ApiError> | undefined;
    if (body && typeof body.code === 'string') {
      return {
        statusCode: body.statusCode ?? error.response?.status ?? 0,
        code: body.code,
        message: body.message ?? 'The request failed.',
        errors: body.errors ?? [],
      };
    }
    if (!error.response) {
      return {
        statusCode: 0,
        code: 'NETWORK',
        message: 'Cannot reach the server. Is the backend running?',
        errors: [],
      };
    }
  }
  return {
    statusCode: 0,
    code: 'UNKNOWN',
    message: 'Something went wrong. Please try again.',
    errors: [],
  };
}

/**
 * True when the request may or may not have been saved: the server was not
 * reached, the answer was lost, or the server failed (5xx). A screen that
 * sends a request ID must then offer only a retry with the same ID (FR-23),
 * because a new ID could save the same thing twice.
 */
export function outcomeUnknown(apiError: ApiError): boolean {
  return apiError.code === 'NETWORK' || apiError.code === 'UNKNOWN' || apiError.statusCode >= 500;
}

/**
 * Shows each field error under its form field (NFR-04), scrolls to the first
 * one, and returns a message for whatever could not be placed, or null when
 * every error was placed on a field. An error for a field that is not on the
 * screen is added to the returned message, so it is never lost.
 *
 * Paths such as `lines.0.quantity` map to Ant Design name paths
 * `['lines', 0, 'quantity']`, so it also works for Form.List.
 */
export function showApiError(form: FormInstance, error: unknown): string | null {
  const apiError = toApiError(error);
  const known = new Set(
    Object.keys(form.getFieldsValue() as Record<string, unknown>),
  );

  const placed: FieldError[] = [];
  const unplaced: FieldError[] = [];
  const byField = new Map<string, string[]>();
  for (const fieldError of apiError.errors) {
    const root = fieldError.field.split('.')[0];
    if (!known.has(root)) {
      unplaced.push(fieldError);
      continue;
    }
    placed.push(fieldError);
    byField.set(fieldError.field, [
      ...(byField.get(fieldError.field) ?? []),
      fieldError.message,
    ]);
  }

  const fields = [...byField].map(([field, messages]) => ({
    name: toNamePath(field),
    errors: messages,
  }));
  form.setFields(fields);
  // A long form's error can be off screen (NFR-04): bring the first one into view.
  if (fields.length > 0) form.scrollToField(fields[0].name, { focus: true });

  if (placed.length > 0 && unplaced.length === 0) {
    return null;
  }
  if (unplaced.length === 0) return apiError.message;
  return [apiError.message, ...unplaced.map((e) => e.message)]
    .filter((m, i, all) => all.indexOf(m) === i)
    .join(' ');
}

const toNamePath = (field: string) =>
  field.split('.').map((part) => (/^\d+$/.test(part) ? Number(part) : part));
