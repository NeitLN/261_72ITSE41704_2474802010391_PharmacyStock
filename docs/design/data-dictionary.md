# Data dictionary

> Generated from the TypeORM entities by `npm run diagrams` in `src/backend`.
> Do not edit by hand; change the entity and run it again.

Every table and column, with its type, nullability, default and keys; enumerations list their values; table constraints (multi-column unique, indexes, checks) follow each table. What the tables mean is in [`domain-model.md`](domain-model.md).

## Catalogue

### `medicines` — Medicine

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `code` | varchar | no |  | unique |  |
| `name` | varchar | no |  |  |  |
| `activeIngredient` | varchar | yes |  |  |  |
| `strength` | varchar | yes |  |  |  |
| `classification` | enum | no | `prescription` |  | `otc`, `prescription`, `controlled` |
| `classificationSource` | varchar | yes |  |  |  |
| `classificationDate` | date | yes |  |  |  |
| `reorderLevel` | integer | no | `0` |  |  |
| `lowStockMonitored` | boolean | no | `true` |  |  |
| `expiryAlertDays` | integer | no | `90` |  |  |
| `isActive` | boolean | no | `true` |  |  |
| `category_id` | uuid | no |  | FK → `medicine_categories` |  |
| `base_unit_id` | uuid | no |  | FK → `units_of_measure` |  |

- Check `ck_medicines_expiry_alert_days`: `"expiryAlertDays" >= 0`
- Check `ck_medicines_reorder_level`: `"reorderLevel" >= 0`

### `medicine_categories` — MedicineCategory

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `code` | varchar | no |  | unique |  |
| `name` | varchar | no |  |  |  |
| `description` | varchar | yes |  |  |  |

### `units_of_measure` — UnitOfMeasure

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `code` | varchar | no |  | unique |  |
| `name` | varchar | no |  |  |  |
| `conversionToBase` | integer | no | `1` |  |  |
| `isBaseUnit` | boolean | no | `false` |  |  |

### `medicine_prices` — MedicinePrice

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `unitPrice` | numeric(12,2) | no |  |  |  |
| `effectiveFrom` | date | no |  |  |  |
| `createdAt` | timestamptz | no | `now()` |  |  |
| `medicine_id` | uuid | no |  | FK → `medicines` |  |
| `set_by_id` | uuid | no |  | FK → `users` |  |

- Unique `uq_medicine_price_effective_from`: (`medicine_id`, `effectiveFrom`)
- Check `ck_medicine_prices_positive`: `"unitPrice" > 0`

## Purchasing

### `suppliers` — Supplier

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `name` | varchar | no |  |  |  |
| `phone` | varchar | no |  |  |  |
| `address` | varchar | yes |  |  |  |
| `contactPerson` | varchar | yes |  |  |  |
| `email` | varchar | yes |  |  |  |
| `isActive` | boolean | no | `true` |  |  |
| `createdAt` | timestamptz | no | `now()` |  |  |

### `goods_receipts` — GoodsReceipt

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `documentNumber` | varchar | no |  |  |  |
| `receiptDate` | date | no |  |  |  |
| `totalCost` | numeric(14,2) | no | `0` |  |  |
| `note` | varchar | yes |  |  |  |
| `createdAt` | timestamptz | no | `now()` |  |  |
| `supplier_id` | uuid | no |  | FK → `suppliers` |  |
| `received_by_id` | uuid | no |  | FK → `users` |  |

- Unique `uq_goods_receipt_supplier_document`: (`supplier_id`, `documentNumber`)

### `goods_receipt_lines` — GoodsReceiptLine

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `lineNumber` | integer | no |  |  |  |
| `quantity` | integer | no |  |  |  |
| `unitCost` | numeric(12,2) | no |  |  |  |
| `goods_receipt_id` | uuid | no |  | FK → `goods_receipts` |  |
| `medicine_id` | uuid | no |  | FK → `medicines` |  |
| `batch_id` | uuid | no |  | FK → `batches` |  |

- Check `ck_goods_receipt_lines_unit_cost`: `"unitCost" >= 0`
- Check `ck_goods_receipt_lines_quantity`: `"quantity" > 0`

## Stock and control

### `batches` — Batch

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `batchNumber` | varchar | no |  |  |  |
| `expiryDate` | date | no |  |  |  |
| `qtySellable` | integer | no | `0` |  |  |
| `qtyQuarantine` | integer | no | `0` |  |  |
| `qtyPendingDestruction` | integer | no | `0` |  |  |
| `status` | enum | no | `active` |  | `active`, `on_hold`, `recalled`, `rejected` |
| `statusReason` | varchar | yes |  |  |  |
| `statusChangedAt` | timestamptz | yes |  |  |  |
| `unitCost` | numeric(12,2) | no |  |  |  |
| `receivedAt` | timestamptz | no |  |  |  |
| `createdAt` | timestamptz | no | `now()` |  |  |
| `status_changed_by_id` | uuid | yes |  | FK → `users` |  |
| `medicine_id` | uuid | no |  | FK → `medicines` |  |

- Unique `uq_batch_medicine_number`: (`medicine_id`, `batchNumber`)
- Check `ck_batches_qty_pending_destruction`: `"qtyPendingDestruction" >= 0`
- Check `ck_batches_qty_quarantine`: `"qtyQuarantine" >= 0`
- Check `ck_batches_qty_sellable`: `"qtySellable" >= 0`

### `stock_movements` — StockMovement

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `type` | enum | no |  |  | `receipt`, `dispense`, `sale`, `return`, `release`, `reject`, `write_off`, `destroy`, `adjustment` |
| `deltaSellable` | integer | no | `0` |  |  |
| `deltaQuarantine` | integer | no | `0` |  |  |
| `deltaPendingDestruction` | integer | no | `0` |  |  |
| `reason` | varchar | yes |  |  |  |
| `sourceDocumentType` | enum | no |  |  | `goods_receipt`, `dispense_line`, `sale_line`, `return_line`, `stock_take_line`, `batch` |
| `sourceDocumentId` | uuid | no |  |  |  |
| `occurredAt` | timestamptz | no | `now()` |  |  |
| `reverses_movement_id` | uuid | yes |  | FK → `stock_movements`, unique |  |
| `batch_id` | uuid | no |  | FK → `batches` |  |
| `performed_by_id` | uuid | no |  | FK → `users` |  |

- Index `ix_stock_movements_batch_occurred`: (`batch_id`, `occurredAt`)
- Check `ck_stock_movements_not_empty`: `"deltaSellable" <> 0 OR "deltaQuarantine" <> 0 OR "deltaPendingDestruction" <> 0`
- Check `ck_stock_movements_sign_by_type`: `"reverses_movement_id" IS NOT NULL OR ("type" = 'receipt' AND "deltaSellable" > 0 AND "deltaQuarantine" = 0 AND "deltaPendingDestruction" = 0) OR ("type" IN ('dispense', 'sale') AND "deltaSellable" < 0 AND "deltaQuarantine" = 0 AND "deltaPendingDestruction" = 0) OR ("type" = 'return' AND "deltaSellable" = 0 AND "deltaQuarantine" > 0 AND "deltaPendingDestruction" = 0) OR ("type" = 'release' AND "deltaQuarantine" < 0 AND "deltaSellable" = -"deltaQuarantine" AND "deltaPendingDestruction" = 0) OR ("type" = 'reject' AND "deltaQuarantine" < 0 AND "deltaPendingDestruction" = -"deltaQuarantine" AND "deltaSellable" = 0) OR ("type" = 'write_off' AND "deltaSellable" < 0 AND "deltaPendingDestruction" = -"deltaSellable" AND "deltaQuarantine" = 0) OR ("type" = 'destroy' AND "deltaSellable" = 0 AND "deltaQuarantine" = 0 AND "deltaPendingDestruction" < 0) OR ("type" = 'adjustment' AND "deltaSellable" <> 0 AND "deltaQuarantine" = 0 AND "deltaPendingDestruction" = 0)`

### `stock_takes` — StockTake

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `referenceNumber` | varchar | no |  | unique |  |
| `status` | enum | no | `counting` |  | `counting`, `pending_approval`, `approved`, `cancelled` |
| `note` | varchar | yes |  |  |  |
| `submittedAt` | timestamptz | yes |  |  |  |
| `approvedAt` | timestamptz | yes |  |  |  |
| `createdAt` | timestamptz | no | `now()` |  |  |
| `opened_by_id` | uuid | no |  | FK → `users` |  |
| `counted_by_id` | uuid | yes |  | FK → `users` |  |
| `approved_by_id` | uuid | yes |  | FK → `users` |  |

### `stock_take_lines` — StockTakeLine

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `systemQuantity` | integer | no |  |  |  |
| `countedQuantity` | integer | yes |  |  |  |
| `reason` | varchar | yes |  |  |  |
| `stock_take_id` | uuid | no |  | FK → `stock_takes` |  |
| `batch_id` | uuid | no |  | FK → `batches` |  |

- Check `ck_stock_take_lines_counted_qty`: `"countedQuantity" IS NULL OR "countedQuantity" >= 0`
- Check `ck_stock_take_lines_system_qty`: `"systemQuantity" >= 0`

### `stock_alerts` — StockAlert

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `type` | enum | no |  |  | `low_stock`, `out_of_stock`, `expiring_soon`, `expired` |
| `status` | enum | no | `open` |  | `open`, `acknowledged`, `resolved` |
| `message` | varchar | no |  |  |  |
| `acknowledgedAt` | timestamptz | yes |  |  |  |
| `resolvedAt` | timestamptz | yes |  |  |  |
| `raisedAt` | timestamptz | no | `now()` |  |  |
| `medicine_id` | uuid | no |  | FK → `medicines` |  |
| `batch_id` | uuid | yes |  | FK → `batches` |  |
| `acknowledged_by_id` | uuid | yes |  | FK → `users` |  |

- Unique index `uq_stock_alerts_open_expiry`: (`batch_id`) where `"type" IN ('expiring_soon', 'expired') AND "status" <> 'resolved'`
- Unique index `uq_stock_alerts_open_level`: (`medicine_id`) where `"type" IN ('low_stock', 'out_of_stock') AND "status" <> 'resolved'`
- Check `ck_stock_alerts_batch_by_type`: `("type" IN ('expiring_soon', 'expired') AND "batch_id" IS NOT NULL) OR ("type" IN ('low_stock', 'out_of_stock') AND "batch_id" IS NULL)`

## Prescriptions and dispensing

### `customers` — Customer

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `code` | varchar | no |  | unique |  |
| `fullName` | varchar | no |  |  |  |
| `phone` | varchar | yes |  |  |  |
| `dateOfBirth` | date | yes |  |  |  |
| `address` | varchar | yes |  |  |  |
| `createdAt` | timestamptz | no | `now()` |  |  |

### `prescribers` — Prescriber

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `licenceNumber` | varchar | no |  | unique |  |
| `fullName` | varchar | no |  |  |  |
| `clinicName` | varchar | yes |  |  |  |
| `isActive` | boolean | no | `true` |  |  |

### `prescriptions` — Prescription

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `referenceNumber` | varchar | no |  | unique |  |
| `issuedDate` | date | no |  |  |  |
| `validUntil` | date | no |  |  |  |
| `status` | enum | no | `received` |  | `received`, `verified`, `partially_dispensed`, `fully_dispensed`, `cancelled` |
| `patientAgeYears` | integer | yes |  |  |  |
| `patientAgeMonths` | integer | yes |  |  |  |
| `patientWeightKg` | numeric(5,2) | yes |  |  |  |
| `accompanyingAdult` | varchar | yes |  |  |  |
| `verifiedAt` | timestamptz | yes |  |  |  |
| `verificationNote` | varchar | yes |  |  |  |
| `createdAt` | timestamptz | no | `now()` |  |  |
| `verified_by_id` | uuid | yes |  | FK → `users` |  |
| `customer_id` | uuid | no |  | FK → `customers` |  |
| `prescriber_id` | uuid | no |  | FK → `prescribers` |  |

- Check `ck_prescriptions_valid_until`: `"validUntil" >= "issuedDate"`

### `prescription_items` — PrescriptionItem

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `quantityPrescribed` | integer | no |  |  |  |
| `quantityDispensed` | integer | no | `0` |  |  |
| `strength` | varchar | no |  |  |  |
| `dose` | varchar | no |  |  |  |
| `route` | varchar | no |  |  |  |
| `daysOfUse` | integer | no |  |  |  |
| `prescription_id` | uuid | no |  | FK → `prescriptions` |  |
| `medicine_id` | uuid | no |  | FK → `medicines` |  |

- Check `ck_prescription_items_dispensed`: `"quantityDispensed" >= 0 AND "quantityDispensed" <= "quantityPrescribed"`
- Check `ck_prescription_items_quantity`: `"quantityPrescribed" > 0`

### `dispense_lines` — DispenseLine

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `quantity` | integer | no |  |  |  |
| `partialSupplyNote` | varchar | yes |  |  |  |
| `dispensedAt` | timestamptz | no | `now()` |  |  |
| `prescription_id` | uuid | no |  | FK → `prescriptions` |  |
| `prescription_item_id` | uuid | no |  | FK → `prescription_items` |  |
| `batch_id` | uuid | no |  | FK → `batches` |  |
| `sale_id` | uuid | yes |  | FK → `sales` |  |
| `dispensed_by_id` | uuid | no |  | FK → `users` |  |

- Check `ck_dispense_lines_quantity`: `"quantity" > 0`

## Sales and returns

### `sales` — Sale

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `receiptNumber` | varchar | no |  | unique |  |
| `totalAmount` | numeric(12,2) | no | `0` |  |  |
| `status` | enum | no | `completed` |  | `completed`, `partially_returned`, `returned` |
| `soldAt` | timestamptz | no | `now()` |  |  |
| `customer_id` | uuid | yes |  | FK → `customers` |  |
| `sold_by_id` | uuid | no |  | FK → `users` |  |

### `sale_lines` — SaleLine

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `quantity` | integer | no |  |  |  |
| `quantityReturned` | integer | no | `0` |  |  |
| `unitPrice` | numeric(12,2) | no |  |  |  |
| `lineTotal` | numeric(12,2) | no |  |  |  |
| `sale_id` | uuid | no |  | FK → `sales` |  |
| `batch_id` | uuid | no |  | FK → `batches` |  |

- Check `ck_sale_lines_returned`: `"quantityReturned" >= 0 AND "quantityReturned" <= "quantity"`
- Check `ck_sale_lines_quantity`: `"quantity" > 0`

### `sale_returns` — SaleReturn

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `referenceNumber` | varchar | no |  | unique |  |
| `reason` | varchar | no |  |  |  |
| `refundAmount` | numeric(12,2) | no | `0` |  |  |
| `returnedAt` | timestamptz | no | `now()` |  |  |
| `sale_id` | uuid | no |  | FK → `sales` |  |
| `processed_by_id` | uuid | no |  | FK → `users` |  |

### `return_lines` — ReturnLine

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `quantity` | integer | no |  |  |  |
| `unitPrice` | numeric(12,2) | no |  |  |  |
| `assessmentStatus` | enum | no | `pending_assessment` |  | `pending_assessment`, `released`, `rejected` |
| `assessedAt` | timestamptz | yes |  |  |  |
| `assessmentNote` | varchar | yes |  |  |  |
| `assessed_by_id` | uuid | yes |  | FK → `users` |  |
| `sale_return_id` | uuid | no |  | FK → `sale_returns` |  |
| `sale_line_id` | uuid | no |  | FK → `sale_lines` |  |

- Check `ck_return_lines_quantity`: `"quantity" > 0`

## Access and infrastructure

### `users` — User

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `username` | varchar | no |  | unique |  |
| `passwordHash` | varchar | no |  |  |  |
| `fullName` | varchar | no |  |  |  |
| `email` | varchar | yes |  |  |  |
| `isActive` | boolean | no | `true` |  |  |
| `lastLoginAt` | timestamptz | yes |  |  |  |
| `createdAt` | timestamptz | no | `now()` |  |  |
| `role_id` | uuid | no |  | FK → `roles` |  |

### `roles` — Role

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `code` | varchar | no |  | unique |  |
| `name` | varchar | no |  |  |  |
| `description` | varchar | yes |  |  |  |

### `permissions` — Permission

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `code` | varchar | no |  | unique |  |
| `description` | varchar | no |  |  |  |

### `role_permissions` — role_permissions

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `rolesId` | uuid | no |  | PK, FK → `roles` |  |
| `permissionsId` | uuid | no |  | PK, FK → `permissions` |  |

- Index `IDX_0cb93c5877d37e954e2aa59e52`: (`rolesId`)
- Index `IDX_d422dabc78ff74a8dab6583da0`: (`permissionsId`)

### `audit_logs` — AuditLog

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |  |
| `action` | varchar | no |  |  |  |
| `entityName` | varchar | no |  |  |  |
| `entityId` | varchar | yes |  |  |  |
| `details` | text | yes |  |  |  |
| `occurredAt` | timestamptz | no | `now()` |  |  |
| `performed_by_id` | uuid | yes |  | FK → `users` |  |

### `processed_requests` — ProcessedRequest

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `requestId` | uuid | no |  | PK |  |
| `commandType` | varchar | no |  |  |  |
| `payloadHash` | character | no |  |  |  |
| `result` | jsonb | no |  |  |  |
| `createdAt` | timestamptz | no | `now()` |  |  |
| `user_id` | uuid | no |  | FK → `users` |  |

## Links the database does not enforce

- StockMovement.sourceDocumentType + sourceDocumentId point to the receipt, dispense line, sale line, return line or stock-take line that caused the movement. They are not a foreign key: one column pair serves five tables.
- Two triggers written by hand in the initial migration guard `stock_movements`: `stock_movements_append_only` refuses UPDATE and DELETE (BR05), and `stock_movements_check_reversal` checks that a reversal is the exact negation of the movement it reverses.
