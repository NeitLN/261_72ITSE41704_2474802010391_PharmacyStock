/**
 * What a whole-money field shows (#244).
 *
 * Grouping thousands with dots while the user types made `1.000` + `0` read
 * as `1.0000`, which is not a grouped number, so the dot became a decimal
 * point and 100000 was saved as 10. While the field has focus it now shows the
 * digits as typed; dots are added only when the field is left. Any dot in the
 * field while editing is therefore one the user typed, and stays a decimal
 * point that the whole-number rule refuses (#183).
 */

interface FormatInfo {
  userTyping: boolean;
  input: string;
}

export const groupThousands = (value: number | string | undefined): string =>
  `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export function formatMoneyInput(
  value: number | string | undefined,
  info: FormatInfo,
  editing: boolean,
): string {
  if (!editing) return groupThousands(value);
  if (info.userTyping) return info.input;
  return `${value ?? ''}`;
}
