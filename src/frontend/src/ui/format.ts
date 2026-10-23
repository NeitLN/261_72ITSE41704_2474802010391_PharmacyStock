// VND has no minor unit in daily use, but unit costs may carry cents: show
// them only when present, so 1750.5 is not rounded to 1.751 ₫.
const vnd = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const count = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

/** Formats a numeric string from the API as VND without using floats for storage. */
export function formatVnd(amount: string | null): string {
  return amount === null ? '—' : vnd.format(Number(amount));
}

/** A whole number of base units with its unit, e.g. `8 tablet`, `1.200 capsule`. */
export function formatQty(quantity: number, unit: string): string {
  return `${count.format(quantity)} ${unit}`;
}
