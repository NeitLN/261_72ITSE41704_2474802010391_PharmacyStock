# Entity–relationship diagram

> Generated from the TypeORM entities by `npm run diagrams` in `src/backend`.
> Do not edit by hand; change the entity and run it again.

28 tables in six subsystems. Crow's feet read as usual: `||--o{` is one parent to zero or more children; `|o` marks an optional parent (nullable foreign key). A table from another subsystem appears as a stub with its key only.

### Catalogue

```mermaid
erDiagram
    medicines {
        uuid id PK
        varchar code UK
        varchar name
        varchar activeIngredient
        varchar strength
        enum classification
        varchar classificationSource
        date classificationDate
        integer reorderLevel
        boolean lowStockMonitored
        integer expiryAlertDays
        boolean isActive
        uuid category_id FK
        uuid base_unit_id FK
    }
    medicine_categories {
        uuid id PK
        varchar code UK
        varchar name
        varchar description
    }
    units_of_measure {
        uuid id PK
        varchar code UK
        varchar name
        integer conversionToBase
        boolean isBaseUnit
    }
    medicine_prices {
        uuid id PK
        numeric unitPrice
        date effectiveFrom
        timestamptz createdAt
        uuid medicine_id FK
        uuid set_by_id FK
    }
    units_of_measure ||--o{ medicines : "base_unit_id"
    medicine_categories ||--o{ medicines : "category_id"
    medicines ||--o{ medicine_prices : "medicine_id"
    users ||--o{ medicine_prices : "set_by_id"
    users {
        uuid id PK
    }
```

### Purchasing

```mermaid
erDiagram
    suppliers {
        uuid id PK
        varchar name
        varchar phone
        varchar address
        varchar contactPerson
        varchar email
        boolean isActive
        timestamptz createdAt
    }
    goods_receipts {
        uuid id PK
        varchar documentNumber
        date receiptDate
        numeric totalCost
        varchar note
        timestamptz createdAt
        uuid supplier_id FK
        uuid received_by_id FK
    }
    goods_receipt_lines {
        uuid id PK
        integer lineNumber
        integer quantity
        numeric unitCost
        uuid goods_receipt_id FK
        uuid medicine_id FK
        uuid batch_id FK
    }
    users ||--o{ goods_receipts : "received_by_id"
    suppliers ||--o{ goods_receipts : "supplier_id"
    batches ||--o{ goods_receipt_lines : "batch_id"
    goods_receipts ||--o{ goods_receipt_lines : "goods_receipt_id"
    medicines ||--o{ goods_receipt_lines : "medicine_id"
    batches {
        uuid id PK
    }
    medicines {
        uuid id PK
    }
    users {
        uuid id PK
    }
```

### Stock and control

```mermaid
erDiagram
    batches {
        uuid id PK
        varchar batchNumber
        date expiryDate
        integer qtySellable
        integer qtyQuarantine
        integer qtyPendingDestruction
        enum status
        varchar statusReason
        timestamptz statusChangedAt
        numeric unitCost
        timestamptz receivedAt
        timestamptz createdAt
        uuid status_changed_by_id FK
        uuid medicine_id FK
    }
    stock_movements {
        uuid id PK
        enum type
        integer deltaSellable
        integer deltaQuarantine
        integer deltaPendingDestruction
        varchar reason
        enum sourceDocumentType
        uuid sourceDocumentId
        timestamptz occurredAt
        uuid reverses_movement_id FK, UK
        uuid batch_id FK
        uuid performed_by_id FK
    }
    stock_takes {
        uuid id PK
        varchar referenceNumber UK
        enum status
        varchar note
        timestamptz submittedAt
        timestamptz approvedAt
        timestamptz createdAt
        uuid opened_by_id FK
        uuid counted_by_id FK
        uuid approved_by_id FK
    }
    stock_take_lines {
        uuid id PK
        integer systemQuantity
        integer countedQuantity
        varchar reason
        uuid stock_take_id FK
        uuid batch_id FK
        uuid counted_by_id FK
    }
    stock_take_counters {
        uuid stock_take_id PK, FK
        uuid user_id PK, FK
    }
    stock_alerts {
        uuid id PK
        enum type
        enum status
        varchar message
        timestamptz acknowledgedAt
        timestamptz resolvedAt
        timestamptz raisedAt
        uuid medicine_id FK
        uuid batch_id FK
        uuid acknowledged_by_id FK
    }
    medicines ||--o{ batches : "medicine_id"
    users |o--o{ batches : "status_changed_by_id"
    batches ||--o{ stock_movements : "batch_id"
    users ||--o{ stock_movements : "performed_by_id"
    stock_movements |o--o| stock_movements : "reverses_movement_id"
    users |o--o{ stock_takes : "approved_by_id"
    users |o--o{ stock_takes : "counted_by_id"
    users ||--o{ stock_takes : "opened_by_id"
    batches ||--o{ stock_take_lines : "batch_id"
    users |o--o{ stock_take_lines : "counted_by_id"
    stock_takes ||--o{ stock_take_lines : "stock_take_id"
    stock_takes ||--o{ stock_take_counters : "stock_take_id"
    users ||--o{ stock_take_counters : "user_id"
    users |o--o{ stock_alerts : "acknowledged_by_id"
    batches |o--o{ stock_alerts : "batch_id"
    medicines ||--o{ stock_alerts : "medicine_id"
    medicines {
        uuid id PK
    }
    users {
        uuid id PK
    }
```

### Prescriptions and dispensing

```mermaid
erDiagram
    customers {
        uuid id PK
        varchar code UK
        varchar fullName
        varchar phone
        date dateOfBirth
        varchar address
        timestamptz createdAt
    }
    prescribers {
        uuid id PK
        varchar licenceNumber UK
        varchar fullName
        varchar clinicName
        boolean isActive
    }
    prescriptions {
        uuid id PK
        varchar referenceNumber UK
        date issuedDate
        date validUntil
        enum status
        integer patientAgeYears
        integer patientAgeMonths
        numeric patientWeightKg
        varchar accompanyingAdult
        timestamptz verifiedAt
        varchar verificationNote
        timestamptz createdAt
        uuid verified_by_id FK
        uuid customer_id FK
        uuid prescriber_id FK
    }
    prescription_items {
        uuid id PK
        integer quantityPrescribed
        integer quantityDispensed
        varchar strength
        varchar dose
        varchar route
        integer daysOfUse
        uuid prescription_id FK
        uuid medicine_id FK
    }
    dispense_lines {
        uuid id PK
        integer quantity
        varchar partialSupplyNote
        timestamptz dispensedAt
        uuid prescription_id FK
        uuid prescription_item_id FK
        uuid batch_id FK
        uuid sale_id FK
        uuid dispensed_by_id FK
    }
    customers ||--o{ prescriptions : "customer_id"
    prescribers ||--o{ prescriptions : "prescriber_id"
    users |o--o{ prescriptions : "verified_by_id"
    medicines ||--o{ prescription_items : "medicine_id"
    prescriptions ||--o{ prescription_items : "prescription_id"
    batches ||--o{ dispense_lines : "batch_id"
    users ||--o{ dispense_lines : "dispensed_by_id"
    prescriptions ||--o{ dispense_lines : "prescription_id"
    prescription_items ||--o{ dispense_lines : "prescription_item_id"
    sales |o--o{ dispense_lines : "sale_id"
    batches {
        uuid id PK
    }
    medicines {
        uuid id PK
    }
    sales {
        uuid id PK
    }
    users {
        uuid id PK
    }
```

### Sales and returns

```mermaid
erDiagram
    sales {
        uuid id PK
        varchar receiptNumber UK
        numeric totalAmount
        enum status
        timestamptz soldAt
        uuid customer_id FK
        uuid sold_by_id FK
    }
    sale_lines {
        uuid id PK
        integer quantity
        integer quantityReturned
        numeric unitPrice
        numeric lineTotal
        uuid sale_id FK
        uuid batch_id FK
    }
    sale_returns {
        uuid id PK
        varchar referenceNumber UK
        varchar reason
        numeric refundAmount
        timestamptz returnedAt
        uuid sale_id FK
        uuid processed_by_id FK
    }
    return_lines {
        uuid id PK
        integer quantity
        numeric unitPrice
        enum assessmentStatus
        timestamptz assessedAt
        varchar assessmentNote
        uuid assessed_by_id FK
        uuid sale_return_id FK
        uuid sale_line_id FK
    }
    customers |o--o{ sales : "customer_id"
    users ||--o{ sales : "sold_by_id"
    batches ||--o{ sale_lines : "batch_id"
    sales ||--o{ sale_lines : "sale_id"
    users ||--o{ sale_returns : "processed_by_id"
    sales ||--o{ sale_returns : "sale_id"
    users |o--o{ return_lines : "assessed_by_id"
    sale_lines ||--o{ return_lines : "sale_line_id"
    sale_returns ||--o{ return_lines : "sale_return_id"
    batches {
        uuid id PK
    }
    customers {
        uuid id PK
    }
    users {
        uuid id PK
    }
```

### Access and infrastructure

```mermaid
erDiagram
    users {
        uuid id PK
        varchar username UK
        varchar passwordHash
        varchar fullName
        varchar email
        boolean isActive
        timestamptz lastLoginAt
        timestamptz createdAt
        uuid role_id FK
    }
    roles {
        uuid id PK
        varchar code UK
        varchar name
        varchar description
    }
    permissions {
        uuid id PK
        varchar code UK
        varchar description
    }
    role_permissions {
        uuid rolesId PK, FK
        uuid permissionsId PK, FK
    }
    audit_logs {
        uuid id PK
        varchar action
        varchar entityName
        varchar entityId
        text details
        timestamptz occurredAt
        uuid performed_by_id FK
    }
    processed_requests {
        uuid requestId PK
        varchar commandType
        character payloadHash
        jsonb result
        timestamptz createdAt
        uuid user_id FK
    }
    roles ||--o{ users : "role_id"
    roles ||--o{ role_permissions : "rolesId"
    permissions ||--o{ role_permissions : "permissionsId"
    users |o--o{ audit_logs : "performed_by_id"
    users ||--o{ processed_requests : "user_id"
```

## Links the database does not enforce

- StockMovement.sourceDocumentType + sourceDocumentId point to the receipt, dispense line, sale line, return line or stock-take line that caused the movement. They are not a foreign key: one column pair serves five tables.
- Two triggers written by hand in the initial migration guard `stock_movements`: `stock_movements_append_only` refuses UPDATE and DELETE (BR05), and `stock_movements_check_reversal` checks that a reversal is the exact negation of the movement it reverses.
