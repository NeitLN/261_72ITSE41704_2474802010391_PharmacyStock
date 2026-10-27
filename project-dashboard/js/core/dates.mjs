// Dates are handled as day keys ("YYYY-MM-DD") in the project's time zone.
// Instants from GitHub are UTC; a day key is what a person in the project's
// time zone would call that day. Day-key arithmetic is done in UTC so that
// daylight-saving changes cannot shift a day.

const DAY_MS = 86_400_000;
const formatters = new Map();

function formatterFor(timeZone) {
  if (!formatters.has(timeZone)) {
    formatters.set(
      timeZone,
      new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }),
    );
  }
  return formatters.get(timeZone);
}

/** Day key of an ISO instant or date in `timeZone`. A bare date is returned unchanged. */
export function dayKey(value, timeZone = 'UTC') {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatterFor(timeZone).format(date);
}

function toUtc(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(key, days) {
  return fromUtc(toUtc(key) + days * DAY_MS);
}

/** Whole days from `a` to `b` (positive when `b` is later). */
export function diffDays(a, b) {
  return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}

/** Every day key from `from` to `to`, inclusive. Empty when `to` is before `from`. */
export function dayRange(from, to) {
  const days = [];
  for (let key = from; key <= to; key = addDays(key, 1)) days.push(key);
  return days;
}

export function minKey(...keys) {
  const present = keys.filter(Boolean);
  return present.length ? present.reduce((a, b) => (a < b ? a : b)) : null;
}

export function maxKey(...keys) {
  const present = keys.filter(Boolean);
  return present.length ? present.reduce((a, b) => (a > b ? a : b)) : null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "28 Oct 2026", or "28 Oct" when `withYear` is false. */
export function formatDay(key, withYear = true) {
  if (!key) return '—';
  const [y, m, d] = key.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ''}`;
}

/** "28 Oct 2026, 14:05 (Asia/Ho_Chi_Minh)" for an ISO instant. */
export function formatInstant(iso, timeZone) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const time = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  return `${formatDay(dayKey(date, timeZone))}, ${time} (${timeZone})`;
}
