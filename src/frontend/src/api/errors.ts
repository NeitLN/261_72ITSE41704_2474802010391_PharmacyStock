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
 * Shows each field error under its form field (NFR-04) and returns the
 * message for anything that does not belong to a field, or null when every
 * error was placed on a field.
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
  const byField = new Map<string, string[]>();
  for (const fieldError of apiError.errors) {
    const root = fieldError.field.split('.')[0];
    if (!known.has(root)) continue;
    placed.push(fieldError);
    byField.set(fieldError.field, [
      ...(byField.get(fieldError.field) ?? []),
      fieldError.message,
    ]);
  }

  form.setFields(
    [...byField].map(([field, messages]) => ({
      name: field.split('.').map((part) => (/^\d+$/.test(part) ? Number(part) : part)),
      errors: messages,
    })),
  );

  if (placed.length > 0 && placed.length === apiError.errors.length) {
    return null;
  }
  return apiError.message;
}
