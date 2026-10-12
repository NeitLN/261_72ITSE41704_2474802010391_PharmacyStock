/** The three roles of Proposal Table 2.4. Codes match `roles.code` in the database. */
export enum RoleCode {
  MANAGER = 'MANAGER',
  PHARMACIST = 'PHARMACIST',
  CASHIER = 'CASHIER',
}

/** Every action a role can be granted. Codes match `permissions.code`. */
export enum Permission {
  CATALOGUE_MANAGE = 'catalogue.manage',
  SUPPLIER_MANAGE = 'supplier.manage',
  GOODS_RECEIPT_CREATE = 'goods_receipt.create',
  STOCK_VIEW = 'stock.view',
  PRESCRIPTION_MANAGE = 'prescription.manage',
  DISPENSE = 'dispense',
  SALE_CREATE = 'sale.create',
  RETURN_CREATE = 'return.create',
  STOCK_TAKE_COUNT = 'stock_take.count',
  STOCK_TAKE_APPROVE = 'stock_take.approve',
  ALERT_MANAGE = 'alert.manage',
  BATCH_STATUS_MANAGE = 'batch_status.manage',
  REPORT_VIEW = 'report.view',
  USER_MANAGE = 'user.manage',
}

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  [Permission.CATALOGUE_MANAGE]: 'Manage medicines and prices (UC01, UC13)',
  [Permission.SUPPLIER_MANAGE]: 'Manage suppliers (UC02)',
  [Permission.GOODS_RECEIPT_CREATE]: 'Record goods receipts (UC03)',
  [Permission.STOCK_VIEW]: 'Look up stock and batch history (UC04)',
  [Permission.PRESCRIPTION_MANAGE]:
    'Take in prescriptions, customers and prescribers (UC05, UC14)',
  [Permission.DISPENSE]: 'Dispense against a prescription (UC06)',
  [Permission.SALE_CREATE]: 'Record sales and bill dispensings (UC07)',
  [Permission.RETURN_CREATE]: 'Process returns (UC08)',
  [Permission.STOCK_TAKE_COUNT]: 'Count stock in a stock take (UC09)',
  [Permission.STOCK_TAKE_APPROVE]: 'Open and approve stock takes (UC09)',
  [Permission.ALERT_MANAGE]: 'Review and acknowledge alerts (UC10, UC11)',
  [Permission.BATCH_STATUS_MANAGE]:
    'Change batch status, assess quarantine, write off (UC11)',
  [Permission.REPORT_VIEW]: 'Produce the stock movement report (UC12)',
  [Permission.USER_MANAGE]: 'Manage users, roles and permissions (UC15)',
};

/**
 * Proposal Table 2.4 as data. The seed writes it into `roles`,
 * `permissions` and `role_permissions`; at run time permissions are read from
 * the database, so a manager can change them without a code change (UC15).
 */
export const ROLE_PERMISSIONS: Record<RoleCode, Permission[]> = {
  [RoleCode.MANAGER]: Object.values(Permission),
  [RoleCode.PHARMACIST]: [
    Permission.STOCK_VIEW,
    Permission.PRESCRIPTION_MANAGE,
    Permission.DISPENSE,
    Permission.STOCK_TAKE_COUNT,
  ],
  [RoleCode.CASHIER]: [
    Permission.STOCK_VIEW,
    Permission.SALE_CREATE,
    Permission.RETURN_CREATE,
  ],
};
