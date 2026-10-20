/**
 * Money as whole xu (1/100 đồng) in a `bigint`, never a binary float (TC-52).
 * Prices arrive from PostgreSQL `numeric(12,2)` as strings such as "2200.00".
 */
export function toXu(amount: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amount);
  if (!match) throw new RangeError(`Not a money amount: "${amount}"`);
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
}

/** Back to the `numeric(12,2)` string form: 220050n → "2200.50". */
export function fromXu(xu: bigint): string {
  const whole = xu / 100n;
  const cents = xu % 100n;
  return `${whole}.${cents.toString().padStart(2, '0')}`;
}

/** `unitPrice × quantity`, exactly. */
export function lineTotal(unitPrice: string, quantity: number): string {
  return fromXu(toXu(unitPrice) * BigInt(quantity));
}
