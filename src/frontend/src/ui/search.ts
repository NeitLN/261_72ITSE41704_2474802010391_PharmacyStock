/**
 * Text for matching: lower case, Vietnamese tone marks and đ removed, so
 * "duong" finds "Đường" and "paracetamol" finds "Paracétamol".
 */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/** A Select `filterOption` that matches the option's label without tone marks. */
export function matchesLabel(input: string, option?: { label?: unknown }): boolean {
  return fold(String(option?.label ?? '')).includes(fold(input.trim()));
}
