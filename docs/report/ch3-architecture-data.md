# Ch.3 — Architecture and data (draft)

> **Draft for W08-A3 (#66), written by Tiến.** Final in W09-A1, on `v1.0`:
> the ERD and class diagram are regenerated from the code then (#71), and table
> and figure numbers are set by the editor. Describes `main` at `2e0203f`
> (02/11/2026).

## 3.1 Architecture

The system has three parts: a React client in the browser, a NestJS server,
and a PostgreSQL 18 database (Figure 3.1). The client never reaches the
database; every read and write goes through the server's JSON API under
`/api`, and every request except sign-in carries a signed token (NFR-05).

*Figure 3.1 — Client, server and database, with the three server layers (from
the README architecture diagram, redrawn for the report).*

Inside the server each use-case group is a NestJS module (16 modules in
`src/backend/src/`, for example `catalogue`, `receiving`, `dispensing`,
`sales`, `returns`, `stocktake`, `reports`). A module has the same three
layers everywhere:

| Layer | What it does | What it never does |
|---|---|---|
| Controller (`*.controller.ts`) | Maps a route and its validated DTO to one service call | Holds a rule or touches the database |
| Service (`*.service.ts`) | Checks the permission first (`assertPermission`), applies the business rules, runs the transaction | Changes a stock quantity directly |
| Data access (entities, `StockLedger`) | Reads and writes rows; `StockLedger` is the only code that changes stock | Decides whether an operation is allowed |

Rules that need no database are plain classes with unit tests:
`FefoAllocator` (BR01, BR02), `PrescriptionValidator` (BR04, BR07, BR10),
`ExpiryPolicy`, and `ReportGenerator` with one subclass per report (UC10–UC12).

**Errors.** Services throw domain errors (`ValidationFailed` 400,
`PermissionDenied` 403, `NotFound` 404, `Conflict` 409,
`BusinessRuleViolation` 422) instead of HTTP exceptions. One filter turns them
into a single shape, `{ statusCode, code, message, errors[] }`, where each
error names its field. The client places the message under that field
(NFR-04). This keeps HTTP out of the business code and gives the screens one
format to handle.

## 3.2 Data

The schema has 28 entities (`src/backend/src/entities/`). They fall into six
groups (Table 3.1). The ERD is Figure 3.2.

*Table 3.1 — Entity groups.*

| Group | Entities |
|---|---|
| Catalogue | `Medicine`, `MedicineCategory`, `UnitOfMeasure`, `MedicinePrice` |
| Purchasing | `Supplier`, `GoodsReceipt`, `GoodsReceiptLine` |
| Prescriptions and dispensing | `Customer`, `Prescriber`, `Prescription`, `PrescriptionItem`, `DispenseLine` |
| Sales and returns | `Sale`, `SaleLine`, `SaleReturn`, `ReturnLine` |
| Stock control | `Batch`, `StockMovement`, `StockTake`, `StockTakeLine`, `StockTakeMedicine`, `StockTakeCounter`, `StockAlert` |
| Access, audit, infrastructure | `User`, `Role`, `Permission`, `AuditLog`, `ProcessedRequest` |

*Figure 3.2 — ERD (generated from the entities by `npm run diagrams`, #71).*

Five decisions shape the data model:

1. **Stock is held on `Batch`, never on `Medicine`.** Expiry belongs to a
   delivered lot, so a single quantity per medicine could not express FEFO or
   the expiry ban. A batch has three quantities: sellable, quarantine and
   pending destruction.
2. **`StockMovement` is append-only.** A trigger in the first migration
   (`trg_stock_movements_append_only`) refuses every `UPDATE` and `DELETE`. A
   correction is a new movement that references the original, at most once
   (BR05).
3. **Expiry is computed, not stored.** A batch can be issued only while its
   expiry date is after the business date in Asia/Ho_Chi_Minh (DEC-01). A
   stored "expired" status would go stale at midnight.
4. **What was prescribed and what was handed over are different rows.**
   `PrescriptionItem` holds the order and `DispenseLine` the hand-over, which
   is what makes partial dispensing and the BR07 check possible.
5. **Money is copied onto the line.** `SaleLine.unitPrice` and
   `GoodsReceiptLine.unitCost` are written when the document is made, and
   prices are a dated history (`MedicinePrice`, BR09). A later price change
   never rewrites a past sale. Money columns are `numeric(12,2)` and are read
   as strings, so no amount passes through floating point.

The schema is built only by migrations (`synchronize` is off). There are five
so far: the initial schema with its constraints and triggers, then four short
hand-written changes, each merged with the feature that needed it. Examples
are the time a movement was written (batch history order) and the counters of
a stock take (BR08).

## 3.3 The stock ledger

Every change of stock goes through one class, `StockLedger`
(`src/backend/src/stock/stock-ledger.ts`). It does three things in one
transaction:

1. locks the rows;
2. changes the batch quantities;
3. writes one movement per change.

The document (receipt, dispense lines, sale, return) is saved with the same
transaction manager, so the document and its movements commit or roll back
together (FR-09, NFR-07).

The ledger enforces a lock order: every medicine row first, in ascending id,
then the batches. Two commands therefore never wait for each other in a cycle.

### Code excerpt 3.1 — the lock order is enforced, not just documented

`src/backend/src/stock/stock-ledger.ts`, `lockMedicines` (query shortened)

```ts
const ids = [...new Set(medicineIds.map((id) => id.toLowerCase()))]
  .filter((id) => !this.lockedMedicines.has(id))
  .sort();
if (ids.length === 0) return;
if (this.lockedBatches.size > 0) {
  throw new Error('Lock order: lock every medicine before any batch.');
}
if (this.highestMedicineId !== null && ids[0] < this.highestMedicineId) {
  throw new Error(
    'Lock order: medicines must be locked in ascending id; lock them all in one call.',
  );
}
// SELECT … FROM medicines WHERE id IN (…) ORDER BY id FOR UPDATE
```

A convention in a design document is easy to break in a new feature. Here a
command that locks a batch before its medicine, or medicines out of order,
fails at once in its own tests instead of deadlocking under load months later.
The medicine row is the lock every stock command for that medicine meets
first, so a sale and a hand-over that race for the last units take turns: the
second one sees the new quantity and is refused (BR03). The race tests repeat
this 20 times per scenario, and two of them hold the lock until both requests
wait (`races.e2e-spec.ts`, RACE-01…05).

**Safety nets below the code:**
- `CHECK` constraints refuse a negative quantity, and a movement whose signs
  do not match its type.
- A trigger refuses edits to movements.
- A unique index allows each movement to be reversed only once.
- In the tests, `findLedgerMismatches()` checks after every stock-changing
  e2e test that each batch's cached quantities equal the sum of its movements
  (NFR-08).

## 3.4 Data flow of one command

Figure 3.3 follows an over-the-counter sale of three lines:

1. The client sends the lines with a request ID it created for this
   confirmation.
2. The sales service checks `sale.create`.
3. The ledger locks the three medicines in id order, then their eligible
   batches in FEFO order.
4. `FefoAllocator` splits each quantity across batches.
5. The service reads the prices in force on the sale date from `PriceBook`.
6. It writes the sale, its lines and one `SALE` movement per batch line.
7. It stores the result under the request ID (`ProcessedRequest`), so a
   repeated request returns the same receipt instead of selling twice (FR-23).

On the reference data volume, this takes a median of 27 ms on the server
(TC-29 trial run, #260; the official TC-29 run is in week 9).

*Figure 3.3 — Sequence of an over-the-counter sale (sequence diagram of UC07,
`docs/diagrams/sequence-diagrams.md`).*
