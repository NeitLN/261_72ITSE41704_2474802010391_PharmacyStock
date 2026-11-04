/** One cell in quotes; a text cell that starts like a formula gets `'` so a spreadsheet cannot run it (FR-43). */
function cell(value: string | number | null): string {
  let text = value === null ? '' : String(value);
  // Numbers cannot carry a formula, so only text is escaped this way; a
  // negative number keeps its sign instead of turning into text.
  if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * CSV for a report (FR-43): every cell quoted, `\r\n` between rows, and a BOM
 * first so Excel reads Vietnamese names in UTF-8.
 */
export function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(cell).join(','));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

/** Hands the CSV to the browser as a download named `name`. */
export function downloadCsv(name: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
