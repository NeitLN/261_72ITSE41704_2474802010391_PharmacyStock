# Class diagram

> Generated from the TypeORM entities by `npm run diagrams` in `src/backend`.
> Do not edit by hand; change the entity and run it again.

Part 1 shows the persistent classes (TypeORM entities) with their attributes, enumerations and associations, generated. Part 2, below the marker, shows the services and domain classes that hold the business rules; it is written by hand.

## Part 1 — Entities (generated)

Marked <<not used yet>>, because nothing in the application reads or writes them so far:

- `AuditLog`: Only the demo seed writes one row, as its completion marker. The audit entries of FR-41 come with UC15 (#105).


### Catalogue

```mermaid
classDiagram
    class Medicine {
        +uuid id
        +varchar code
        +varchar name
        +varchar activeIngredient?
        +varchar strength?
        +MedicineClassification classification
        +varchar classificationSource?
        +date classificationDate?
        +integer reorderLevel
        +boolean lowStockMonitored
        +integer expiryAlertDays
        +boolean isActive
    }
    class MedicineCategory {
        +uuid id
        +varchar code
        +varchar name
        +varchar description?
    }
    class UnitOfMeasure {
        +uuid id
        +varchar code
        +varchar name
        +integer conversionToBase
        +boolean isBaseUnit
    }
    class MedicinePrice {
        +uuid id
        +numeric unitPrice
        +date effectiveFrom
        +timestamptz createdAt
    }
    Medicine "*" --> "1" UnitOfMeasure : baseUnit
    Medicine "*" --> "1" MedicineCategory : category
    MedicinePrice "*" --> "1" Medicine : medicine
    MedicinePrice "*" --> "1" User : setBy
    class MedicineClassification {
        <<enumeration>>
        otc
        prescription
        controlled
    }
```

### Purchasing

```mermaid
classDiagram
    class Supplier {
        +uuid id
        +varchar name
        +varchar phone
        +varchar address?
        +varchar contactPerson?
        +varchar email?
        +boolean isActive
        +timestamptz createdAt
    }
    class GoodsReceipt {
        +uuid id
        +varchar documentNumber
        +date receiptDate
        +numeric totalCost
        +varchar note?
        +timestamptz createdAt
    }
    class GoodsReceiptLine {
        +uuid id
        +integer lineNumber
        +integer quantity
        +numeric unitCost
    }
    GoodsReceipt "*" --> "1" User : receivedBy
    GoodsReceipt "*" --> "1" Supplier : supplier
    GoodsReceiptLine "*" --> "1" Batch : batch
    GoodsReceiptLine "*" --> "1" GoodsReceipt : goodsReceipt
    GoodsReceiptLine "*" --> "1" Medicine : medicine
```

### Stock and control

```mermaid
classDiagram
    class Batch {
        +uuid id
        +varchar batchNumber
        +date expiryDate
        +integer qtySellable
        +integer qtyQuarantine
        +integer qtyPendingDestruction
        +BatchStatus status
        +varchar statusReason?
        +timestamptz statusChangedAt?
        +numeric unitCost
        +timestamptz receivedAt
        +timestamptz createdAt
    }
    class StockMovement {
        +uuid id
        +StockMovementType type
        +integer deltaSellable
        +integer deltaQuarantine
        +integer deltaPendingDestruction
        +varchar reason?
        +StockMovementSourceDocumentType sourceDocumentType
        +uuid sourceDocumentId
        +timestamptz occurredAt
    }
    class StockTake {
        +uuid id
        +varchar referenceNumber
        +StockTakeStatus status
        +varchar note?
        +timestamptz submittedAt?
        +timestamptz approvedAt?
        +timestamptz createdAt
    }
    class StockTakeLine {
        +uuid id
        +integer systemQuantity
        +integer countedQuantity?
        +varchar reason?
    }
    class StockTakeMedicine {
    }
    class StockTakeCounter {
    }
    class StockAlert {
        +uuid id
        +StockAlertType type
        +StockAlertStatus status
        +varchar message
        +timestamptz acknowledgedAt?
        +timestamptz resolvedAt?
        +timestamptz raisedAt
    }
    Batch "*" --> "1" Medicine : medicine
    Batch "*" --> "0..1" User : statusChangedBy
    StockMovement "*" --> "1" Batch : batch
    StockMovement "*" --> "1" User : performedBy
    StockMovement "0..1" --> "0..1" StockMovement : reversesMovement
    StockTake "*" --> "0..1" User : approvedBy
    StockTake "*" --> "0..1" User : countedBy
    StockTake "*" --> "1" User : openedBy
    StockTakeLine "*" --> "1" Batch : batch
    StockTakeLine "*" --> "0..1" User : countedBy
    StockTakeLine "*" --> "1" StockTake : stockTake
    StockTakeMedicine "*" --> "1" Medicine : medicine
    StockTakeMedicine "*" --> "1" StockTake : stockTake
    StockTakeCounter "*" --> "1" StockTake : stockTake
    StockTakeCounter "*" --> "1" User : user
    StockAlert "*" --> "0..1" User : acknowledgedBy
    StockAlert "*" --> "0..1" Batch : batch
    StockAlert "*" --> "1" Medicine : medicine
    class BatchStatus {
        <<enumeration>>
        active
        on_hold
        recalled
        rejected
    }
    class StockAlertStatus {
        <<enumeration>>
        open
        acknowledged
        resolved
    }
    class StockAlertType {
        <<enumeration>>
        low_stock
        out_of_stock
        expiring_soon
        expired
    }
    class StockMovementSourceDocumentType {
        <<enumeration>>
        goods_receipt
        dispense_line
        sale_line
        return_line
        stock_take_line
        batch
    }
    class StockMovementType {
        <<enumeration>>
        receipt
        dispense
        sale
        return
        release
        reject
        write_off
        destroy
        adjustment
    }
    class StockTakeStatus {
        <<enumeration>>
        counting
        pending_approval
        approved
        cancelled
    }
```

### Prescriptions and dispensing

```mermaid
classDiagram
    class Customer {
        +uuid id
        +varchar code
        +varchar fullName
        +varchar phone?
        +date dateOfBirth?
        +varchar address?
        +timestamptz createdAt
    }
    class Prescriber {
        +uuid id
        +varchar licenceNumber
        +varchar fullName
        +varchar clinicName?
        +boolean isActive
    }
    class Prescription {
        +uuid id
        +varchar referenceNumber
        +date issuedDate
        +date validUntil
        +PrescriptionStatus status
        +integer patientAgeYears?
        +integer patientAgeMonths?
        +numeric patientWeightKg?
        +varchar accompanyingAdult?
        +timestamptz verifiedAt?
        +varchar verificationNote?
        +timestamptz createdAt
    }
    class PrescriptionItem {
        +uuid id
        +integer quantityPrescribed
        +integer quantityDispensed
        +varchar strength
        +varchar dose
        +varchar route
        +integer daysOfUse
    }
    class DispenseLine {
        +uuid id
        +integer quantity
        +varchar partialSupplyNote?
        +timestamptz dispensedAt
    }
    Prescription "*" --> "1" Customer : customer
    Prescription "*" --> "1" Prescriber : prescriber
    Prescription "*" --> "0..1" User : verifiedBy
    PrescriptionItem "*" --> "1" Medicine : medicine
    PrescriptionItem "*" --> "1" Prescription : prescription
    DispenseLine "*" --> "1" Batch : batch
    DispenseLine "*" --> "1" User : dispensedBy
    DispenseLine "*" --> "1" Prescription : prescription
    DispenseLine "*" --> "1" PrescriptionItem : prescriptionItem
    DispenseLine "*" --> "0..1" Sale : sale
    class PrescriptionStatus {
        <<enumeration>>
        received
        verified
        partially_dispensed
        fully_dispensed
        cancelled
    }
```

### Sales and returns

```mermaid
classDiagram
    class Sale {
        +uuid id
        +varchar receiptNumber
        +numeric totalAmount
        +SaleStatus status
        +timestamptz soldAt
    }
    class SaleLine {
        +uuid id
        +integer quantity
        +integer quantityReturned
        +numeric unitPrice
        +numeric lineTotal
    }
    class SaleReturn {
        +uuid id
        +varchar referenceNumber
        +varchar reason
        +numeric refundAmount
        +timestamptz returnedAt
    }
    class ReturnLine {
        +uuid id
        +integer quantity
        +numeric unitPrice
        +ReturnLineAssessmentStatus assessmentStatus
        +timestamptz assessedAt?
        +varchar assessmentNote?
    }
    Sale "*" --> "0..1" Customer : customer
    Sale "*" --> "1" User : soldBy
    SaleLine "*" --> "1" Batch : batch
    SaleLine "*" --> "1" Sale : sale
    SaleReturn "*" --> "1" User : processedBy
    SaleReturn "*" --> "1" Sale : sale
    ReturnLine "*" --> "0..1" User : assessedBy
    ReturnLine "*" --> "1" SaleLine : saleLine
    ReturnLine "*" --> "1" SaleReturn : saleReturn
    class ReturnLineAssessmentStatus {
        <<enumeration>>
        pending_assessment
        released
        rejected
    }
    class SaleStatus {
        <<enumeration>>
        completed
        partially_returned
        returned
    }
```

### Access and infrastructure

```mermaid
classDiagram
    class User {
        +uuid id
        +varchar username
        +varchar passwordHash
        +varchar fullName
        +varchar email?
        +boolean isActive
        +timestamptz lastLoginAt?
        +timestamptz createdAt
    }
    class Role {
        +uuid id
        +varchar code
        +varchar name
        +varchar description?
    }
    class Permission {
        +uuid id
        +varchar code
        +varchar description
    }
    class AuditLog {
        <<not used yet>>
        +uuid id
        +varchar action
        +varchar entityName
        +varchar entityId?
        +text details?
        +timestamptz occurredAt
    }
    class ProcessedRequest {
        +uuid requestId
        +varchar commandType
        +character payloadHash
        +jsonb result
        +timestamptz createdAt
    }
    User "*" --> "1" Role : role
    Role "*" --> "*" Permission : permissions
    AuditLog "*" --> "0..1" User : performedBy
    ProcessedRequest "*" --> "1" User : user
```

<!-- END GENERATED -->

## Part 2 — Services and domain classes (written by hand)

The business rules live in these classes, not in the entities or the
controllers (NFR-11). Kept small on purpose: each box shows the operations
other classes call. Checked against the code on 29/10/2026 (#71):
everything shown is on `main`.

### Stock: the ledger and the rules it applies

Every change of stock goes through `StockLedger.run`, one transaction with a
fixed lock order (medicines, then batches) — see
[`stock-ledger.md`](../design/stock-ledger.md) and the sequence diagrams.

```mermaid
classDiagram
    direction LR
    class StockLedger {
        +run(work) Promise~T~
    }
    class LedgerTransaction {
        +manager EntityManager
        +lockMedicines(ids)
        +lockBatches(ids) Batch[]
        +lockEligibleBatches(medicineId, businessDate) Batch[]
        +lockBatchByNumber(medicineId, batchNumber) Batch
        +createBatch(input) Batch
        +post(actor, movement) StockMovement
        +reverse(actor, movementId, reason) StockMovement
        +setBatchStatus(actor, batchId, status, reason) Batch
        +receiveReturn(actor, batchId, quantity, returnLineId) StockMovement
        +writeOff(actor, batchId, reason, businessDate) StockMovement
        +release(actor, batchId, quantity, returnLineId, businessDate) StockMovement
        +reject(actor, batchId, quantity, returnLineId) StockMovement
        +destroy(actor, batchId, quantity, reason) StockMovement
    }
    class FefoAllocator {
        <<domain>>
        +isEligible(batch, businessDate)$ boolean
        +allocate(request)$ Allocation
    }
    class ExpiryPolicy {
        <<domain>>
        +isIssuable(expiryDate, businessDate)$ boolean
        +daysLeft(expiryDate, businessDate)$ number
        +warningFor(expiryDate, businessDate, options)$ ExpiryWarning
    }
    class Clock {
        <<abstract>>
        +today() string
        +now() Date
    }
    class SystemClock
    class FixedClock {
        +set(instant)
    }
    class PriceBook {
        +pricesOn(manager, medicineIds, date) Map
        +setPrice(manager, actor, medicineId, price, date)
    }
    class AlertEvaluator {
        UC10, UC11
        +levels(manager, medicineIds) Map
        +evaluate(manager, medicineIds)
    }
    StockLedger ..> LedgerTransaction : creates per command
    StockLedger ..> AlertEvaluator : after the work, before commit
    LedgerTransaction ..> StockMovement : writes
    LedgerTransaction ..> Batch : locks, updates cached quantities
    Clock <|-- SystemClock
    Clock <|-- FixedClock
    FefoAllocator ..> ExpiryPolicy
```

### Use-case services

Each service checks the permission, validates against the rules and, when
stock moves, calls the ledger. Controllers only translate HTTP.

```mermaid
classDiagram
    direction LR
    class GoodsReceiptsService {
        UC03
        +create(actor, dto) GoodsReceipt
    }
    class DispensingService {
        UC06
        +preview(actor, dto)
        +dispense(actor, dto)
    }
    class SalesService {
        UC07
        +record(actor, dto) SaleView
        +billable(actor)
        +get(actor, id) SaleView
    }
    class PrescriptionsService {
        UC05
        +create(actor, dto)
        +update(actor, id, dto)
        +verify(actor, id, dto)
    }
    class PrescriptionValidator {
        <<domain>>
        +validUntil(issuedDate)$ string
        +assertEditable(status)$
        +assertVerifiable(state, today)$
        +assertDispensable(state, today)$
        +outstanding(item)$ number
    }
    class MedicinesService {
        UC01
        +list(actor, query)
        +create(actor, dto)
        +update(actor, id, dto)
        +setActive(actor, id, active)
    }
    class SuppliersService {
        UC02
        +create(actor, dto)
        +update(actor, id, dto)
        +setActive(actor, id, active)
    }
    class StockLookupService {
        UC04
        +list(actor, query)
        +medicine(actor, id)
        +history(actor, batchId)
    }
    class ReturnsService {
        UC08
        +findSale(actor, receiptNumber)
        +record(actor, dto)
        +get(actor, id)
    }
    class StockTakesService {
        UC09
        +open(actor, dto)
        +count(actor, id, lineId, dto)
        +addLine(actor, id, dto)
        +submit(actor, id)
        +approve(actor, id)
        +returnToCounting(actor, id, dto)
        +cancel(actor, id)
    }
    class AlertsService {
        UC10, UC11
        +list(actor, query)
        +acknowledge(actor, id)
    }
    class BatchesService {
        UC11
        +writeOff(actor, batchId, reason)
        +setStatus(actor, batchId, status, reason)
    }
    class AuthService {
        UC16
        +login(username, password)
        +actorFromToken(token) Actor
    }
    GoodsReceiptsService ..> StockLedger
    DispensingService ..> StockLedger
    DispensingService ..> FefoAllocator
    DispensingService ..> PrescriptionValidator
    SalesService ..> StockLedger
    SalesService ..> FefoAllocator
    SalesService ..> PriceBook
    PrescriptionsService ..> PrescriptionValidator
    MedicinesService ..> PriceBook
    StockLookupService ..> Clock
    ReturnsService ..> StockLedger
    StockTakesService ..> StockLedger
    BatchesService ..> StockLedger
    AlertsService ..> AlertEvaluator
```

### Errors: one hierarchy, one response shape

Services throw these; `AllExceptionsFilter` turns any of them into
`{ statusCode, code, message, errors }` (see
[`error-handling.md`](../design/error-handling.md)).

```mermaid
classDiagram
    class DomainError {
        <<abstract>>
        +status number
        +code string
        +errors FieldError[]
    }
    class ValidationFailed { 400 }
    class Unauthenticated { 401 }
    class PermissionDenied { 403 }
    class NotFound { 404 }
    class Conflict { 409 }
    class BusinessRuleViolation {
        422
        +rule string
    }
    DomainError <|-- ValidationFailed
    DomainError <|-- Unauthenticated
    DomainError <|-- PermissionDenied
    DomainError <|-- NotFound
    DomainError <|-- Conflict
    DomainError <|-- BusinessRuleViolation
```

### Reports (UC10–UC12)

Decision D14 of the plan: one abstract report, three kinds, so the same
route and screen code serve all of them. `GET /api/reports/:kind` asks
`ReportRegistry` for the generator; `generate` is a template method: it
checks the permission, validates the query, runs the subclass's `check`,
`rows` and `totals`, and stamps who produced it and when.

```mermaid
classDiagram
    class ReportGenerator~Q, R, T~ {
        <<abstract>>
        +kind string
        +permission Permission
        +generate(actor, query) Report
        #parse(query) Q
        #check(query)
        #rows(manager, query)* R[]
        #totals(rows)* T
    }
    class LowStockReport {
        UC10 · low-stock
    }
    class ExpiryReport {
        UC11 · expiry
    }
    class StockMovementReport {
        UC12 · stock-movement
        +movements(actor, medicineId, query)
    }
    class ReportRegistry {
        +get(kind) ReportGenerator
    }
    ReportGenerator <|-- LowStockReport
    ReportGenerator <|-- ExpiryReport
    ReportGenerator <|-- StockMovementReport
    ReportRegistry o-- ReportGenerator : by kind
    ReportGenerator ..> Clock
```
