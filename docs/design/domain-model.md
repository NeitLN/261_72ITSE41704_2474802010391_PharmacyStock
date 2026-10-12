# Domain model

Twenty-five domain entities in `src/backend/src/entities/`, plus one
infrastructure table (`ProcessedRequest`). The target for a three-person team
is 16–22 meaningful domain classes; this model sits just above that, and every
class below earns its place by holding state that some business rule reads or
writes.

The schema is built by the migrations in `src/backend/src/migrations/`
(Proposal v1.1, decisions DEC-01 to DEC-10). Database constraints repeat the
most important rules as a safety net behind the services: no negative stock in
any state, dispensed ≤ prescribed, returned ≤ sold, the sign of every stock
movement, and an append-only ledger.

A class diagram matching this model is due in Week 4. **Keep the diagram and
this file in step with the code** — a diagram that contradicts the repository
is worse than no diagram.

## Catalogue

| Entity | Holds | Why it is separate |
|---|---|---|
| `Medicine` | Code, name, active ingredient, strength, classification (OTC / prescription / controlled, with source and date), reorder level, low-stock monitoring switch, expiry alert window, active flag | The catalogue item. Holds no stock — stock is per batch. New medicines default to *prescription*; only OTC ones can be sold over the counter (DEC-09). |
| `MedicineCategory` | Therapeutic grouping | Lets the stock movement report group by category without a hard-coded list. |
| `MedicinePrice` | A selling price and the date it takes effect | Prices are a history, not a column. The price in force on a date is the one with the latest `effectiveFrom` on or before it; one price per medicine per date (BR09). |
| `UnitOfMeasure` | Unit name and conversion to base | Stock is always held in base units. Pack-unit conversion (BR06) is a Could item. |
| `Batch` | Batch number, expiry date, quantity per stock state (sellable, quarantine, pending destruction), status (active / on hold / recalled / rejected) with reason, unit cost, first received | The unit that expires. FEFO (BR01) and the expiry ban (BR02) operate on batches. Only the sellable quantity of an ACTIVE, unexpired batch can be issued (DEC-07). |

## Purchasing

| Entity | Holds | Why it is separate |
|---|---|---|
| `Supplier` | Name, phone (both required), address, contact person, e-mail, active flag | A deactivated supplier cannot be chosen on a new receipt. |
| `GoodsReceipt` | Supplier document number, receipt date, total cost, who received it | The document. The pair (supplier, document number) is unique, which rejects a duplicate entry (FR-08, TC-03). |
| `GoodsReceiptLine` | Line number, medicine, quantity, unit cost, the batch created or topped up | Cost is per line. The same batch number delivered again with the same expiry tops up the existing batch (decision 17), so the batch link is many-to-one. |

## Prescriptions and dispensing

| Entity | Holds | Why it is separate |
|---|---|---|
| `Customer` | Name, phone, date of birth | Optional on a sale, required on a prescription. |
| `Prescriber` | Licence number, name, clinic | A licence checked once and reused; part of deciding whether a prescription is valid under BR04. |
| `Prescription` | Reference, issue date, computed valid-until date, status (received / verified / partially / fully dispensed / cancelled), patient age and child details, who verified it and when | The document brought to the counter. Only a VERIFIED or PARTIALLY_DISPENSED prescription can be dispensed (FR-44). |
| `PrescriptionItem` | Medicine, strength, dose, route, days of use, quantity **prescribed**, quantity dispensed so far | What the doctor ordered. A CHECK keeps dispensed ≤ prescribed (BR07). |
| `DispenseLine` | Batch, quantity **issued**, who issued it, partial-supply note, the sale that billed it | What actually left the shelf. Separate from `PrescriptionItem` because one prescribed quantity can span several batches under FEFO, and because comparing ordered against issued is what detects over-dispensing (BR07). |

## Sales and returns

| Entity | Holds | Why it is separate |
|---|---|---|
| `Sale` | Receipt number, total, status, customer, who sold it | — |
| `SaleLine` | Batch, quantity, quantity returned so far, unit price, line total | Price is copied onto the line so a later price change does not alter past sales. A CHECK keeps returned ≤ sold (TC-17). |
| `SaleReturn` | Reference, reason, refund amount, who processed it | A separate document. The original sale is never edited (BR05). |
| `ReturnLine` | Quantity, original unit price, assessment status (pending / released / rejected) with who and when, the sale line it reverses | A return always enters quarantine first (BR11, DEC-04); a manager's assessment releases it to sellable stock or rejects it to pending destruction. |

## Stock control

| Entity | Holds | Why it is separate |
|---|---|---|
| `StockMovement` | Type, a signed delta per stock state, reason, source document type and id, the movement it reverses, who performed it | The append-only ledger. Every change to any batch appears here exactly once (BR05). A transfer between states (release, reject, write-off) is one row with two deltas. |
| `StockTake` | Reference, status (counting / pending approval / approved / cancelled), who opened, counted and approved it, and when | Counting is separated from posting so a discrepancy is reviewed before it changes the book quantity, and approval is a distinct step (BR08). |
| `StockTakeLine` | Sellable quantity when opened, counted quantity, reason | The discrepancy, with the reason required whenever the two differ (TC-20). |
| `StockAlert` | Type (low stock / out of stock / expiring / expired), status, message, medicine, batch, who acknowledged it, when resolved | Stored so the pharmacy can show who saw an alert and when. Partial unique indexes allow one unresolved stock-level alert per medicine and one unresolved expiry alert per batch (decision 16). |

## Access control and audit

| Entity | Holds | Why it is separate |
|---|---|---|
| `User` | Username, password hash, role, last login | — |
| `Role` | Named set of permissions | Roles are data, not an enum, so a manager can adjust what a role may do without a code change. |
| `Permission` | A single grantable action, e.g. `stock.adjust` | Checks happen in the business layer, never by hiding a button (TC-28). |
| `AuditLog` | Action, entity, details, who, when | `StockMovement` answers "what happened to stock"; this answers "who did something the pharmacy may later be asked about" — logins, permission changes, price changes, posted stock takes. |

## Infrastructure

| Table | Holds | Why |
|---|---|---|
| `ProcessedRequest` | Client request ID, command type, payload hash, the first result | Makes a repeated dispensing, sale or return harmless (FR-23): written in the same transaction as the command, replayed on a repeat, refused if the same ID comes with different content. Not a domain class. |

## Key design decisions

**Stock lives on `Batch`, never on `Medicine`.** Expiry is a property of a
delivered lot. Holding a single quantity on the medicine would make FEFO and
the expiry ban impossible to express.

**`StockMovement` is append-only.** No row is ever updated or deleted; a
trigger in the initial migration refuses it. A correction is a new movement
that references the original through `reversesMovement` (unique, so each
movement is reversed at most once). For every batch and stock state, the
quantity cached on the batch equals the sum of its movement deltas — an
invariant tested directly.

**Expiry is computed, not stored as a status.** A batch is issuable only while
its `expiryDate` is after the business date in Asia/Ho_Chi_Minh (DEC-01). An
EXPIRED status would go stale at midnight.

**Prescribed and issued quantities are different things.** `PrescriptionItem`
records what the doctor ordered; `DispenseLine` records what was handed over.
Keeping them apart is what supports partial dispensing across visits and makes
over-dispensing detectable.

**Money is copied at the moment of the transaction.** `SaleLine.unitPrice` and
`GoodsReceiptLine.unitCost` are stored on the line, not read from the medicine
at report time. Otherwise a price change silently rewrites history.

**Numeric money columns are read back as strings.** PostgreSQL `numeric` maps
to `string` in TypeORM to avoid float rounding. Arithmetic must go through a
decimal-safe path, never `parseFloat`.

## Business decisions

The decisions behind this model are DEC-01 to DEC-10 of Proposal v1.1
(Appendix D), recorded in
[`../requirements/business-decisions.md`](../requirements/business-decisions.md).
DEC-09 and DEC-10 are still being confirmed with the pharmacist reviewer in
week 5.
