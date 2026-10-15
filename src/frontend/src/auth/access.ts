/**
 * Which permissions open each screen (Proposal Table 2.4). A screen is shown
 * when the user holds any one of them. This only shapes the menu; the API
 * checks every request itself (FR-39).
 */
export const SCREEN_PERMISSIONS: Record<string, string[]> = {
  '/catalogue': ['stock.view', 'catalogue.manage'],
  '/suppliers': ['supplier.manage', 'goods_receipt.create'],
  '/dispensing': ['prescription.manage', 'dispense'],
  '/sales': ['sale.create', 'return.create'],
  '/reports': [
    'stock_take.count',
    'stock_take.approve',
    'alert.manage',
    'batch_status.manage',
    'report.view',
  ],
  '/administration': ['user.manage'],
};

export function canOpen(path: string, can: (permission: string) => boolean): boolean {
  return (SCREEN_PERMISSIONS[path] ?? []).some(can);
}
