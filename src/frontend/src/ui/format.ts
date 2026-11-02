// VND has no minor unit in daily use, but unit costs may carry cents: show
// them only when present, so 1750.5 is not rounded to 1.751 ₫.
const vnd = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const count = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

// en-CA gives the year-first order; formatToParts keeps the pieces apart so the
// result does not depend on the browser's locale separators.
const dateTime = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** A moment as `2026-11-02 09:08` in pharmacy time (ui-design §5), or `—` when absent. */
export function formatDateTime(iso: string | null | undefined): string {
  if (iso === null || iso === undefined) return '—';
  const parts = dateTime.formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}`;
}

/** Formats a numeric string from the API as VND without using floats for storage. */
export function formatVnd(amount: string | null): string {
  return amount === null ? '—' : vnd.format(Number(amount));
}

/** A whole number of base units with its unit, e.g. `8 tablet`, `1.200 capsule`. */
export function formatQty(quantity: number, unit: string): string {
  return `${count.format(quantity)} ${unit}`;
}
