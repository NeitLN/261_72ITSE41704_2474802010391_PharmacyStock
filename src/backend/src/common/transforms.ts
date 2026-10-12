import { Transform } from 'class-transformer';

/** Trims a string input; other values pass through for the validators to judge. */
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

/**
 * Trims an optional text field and turns an empty string into `null`, so the
 * UI can clear the field by sending "". `undefined` (field not sent) stays
 * `undefined`, meaning "leave unchanged" on an update.
 */
export const TrimToNull = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  });

/** Reads a query-string flag: only the text `true` is true. */
export const QueryBoolean = () =>
  Transform(
    ({ value }: { value: unknown }) => value === true || value === 'true',
  );

/** Escapes `%`, `_` and `\` so user text is matched literally by ILIKE. */
export function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
