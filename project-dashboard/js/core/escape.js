// Text from GitHub (issue titles, labels, bodies) is untrusted. Every value
// that goes into HTML passes through escapeHtml; every CSV cell through csvCell.

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/** Only http(s) and relative URLs are allowed in links. */
export function safeUrl(value) {
  if (!value) return '#';
  const url = String(value).trim();
  if (/^https?:\/\//i.test(url) || /^(\.{0,2}\/|#)/.test(url)) return url;
  return '#';
}

/**
 * One quoted CSV cell. A value starting with = + - @ (or a tab or carriage
 * return) gets a leading apostrophe so a spreadsheet does not run it as a formula.
 */
export function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}
