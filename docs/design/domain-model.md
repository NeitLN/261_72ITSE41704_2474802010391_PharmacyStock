# Domain model

Twenty-five entities in `src/backend/src/entities/`. The target for a
three-person team is 16–22 meaningful domain classes; this model sits just
above that, and every class below earns its place by holding state that some
business rule reads or writes.

A class diagram matching this model is due in Week 4. **Keep the diagram and
this file in step with the code** — a diagram that contradicts the repository
is worse than no diagram.

## Catalogue

| Entity | Holds | Why it is separate |
|---|---|---|
| `Medicine` | Code, name, active ingredient, strength, controlled flag, reorder level, expiry alert window | The catalogue item. Holds no stock — stock is per batch. |
| `MedicineCategory` | Therapeutic grouping | Lets the turnover report group by category without a hard-coded list. |
| `MedicinePrice` | A dated selling price | Prices are a history, not a column, so a sale made last month can still be explained and a price change never rewrites past figures (BR09). |
| `UnitOfMeasure` | Unit name and conversion to base | A box of 10 blisters of 10 tablets must resolve to 100 tablets. Stock is always held in base units (BR06). |
| `Batch` | Batch number, expiry date, quantity on hand, status, unit cost | The unit that expires. FEFO (BR01) and the expiry ban (BR02) both operate on batches, not medicines. |

## Purchasing

| Entity | Holds | Why it is separate |
|---|---|---|
| `Supplier` | Contact details | — |
| `GoodsReceipt` | Supplier document reference, date, total, who received it | The document. Its unique reference is what rejects a duplicate entry (TC-03). |
| `GoodsReceiptLine` | Medicine, quantity, unit cost, the batch created | Cost is per line because the same medicine bought at two prices must value its batches separately. |

## Prescriptions and dispensing

| Entity | Holds | Why it is separate |
|---|---|---|
| `Customer` | Name, phone, date of birth | Optional on a sale, required on a prescription. |
| `Prescriber` | Licence number, name, clinic | A licence checked once and reused; part of deciding whether a prescription is valid under BR04. |
| `Prescription` | Reference, issue date, valid-until date, status | The document brought to the counter. |
| `PrescriptionItem` | Medicine and quantity **prescribed** | What the doctor ordered. |
| `DispenseLine` | Batch, quantity **issued**, who issued it | What actually left the shelf. Separate from `PrescriptionItem` because one prescribed quantity can span several batches under FEFO, and because comparing ordered against issued is what detects over-dispensing (BR07). |

## Sales and returns

| Entity | Holds | Why it is separate |
|---|---|---|
| `Sale` | Receipt number, total, status, customer, who sold it | — |
| `SaleLine` | Batch, quantity, unit price, line total | Price is copied onto the line so a later price change does not alter past sales. |
| `SaleReturn` | Reference, reason, refund amount, who processed it | A separate document. The original sale is never edited (BR05). |
| `ReturnLine` | Quantity, disposition, the sale line it reverses | The link to `SaleLine` caps the returnable quantity (TC-17). Disposition decides whether stock comes back as saleable, quarantined or destroyed. |

## Stock control

| Entity | Holds | Why it is separate |
|---|---|---|
| `StockMovement` | Type, signed quantity delta, reason, source document, who performed it | The append-only ledger. Every change to any batch appears here exactly once (BR05). |
| `StockTake` | Reference, date, status, who counted, who approved | Counting is separated from posting so a discrepancy is reviewed before it changes the book quantity, and approval is a distinct step (BR08). |
| `StockTakeLine` | System quantity, counted quantity, reason | The discrepancy, with the reason required whenever the two differ (TC-20). |
| `StockAlert` | Type, status, message, medicine, batch, who acknowledged it | Alerts are stored rather than recomputed on every page load, so the pharmacy can show who saw an alert and when it was acted on. |

## Access control and audit

| Entity | Holds | Why it is separate |
|---|---|---|
| `User` | Username, password hash, role, last login | — |
| `Role` | Named set of permissions | Roles are data, not an enum, so a manager can adjust what a role may do without a code change. |
| `Permission` | A single grantable action, e.g. `stock.adjust` | Checks happen in the business layer, never by hiding a button (TC-28). |
| `AuditLog` | Action, entity, details, who, when | `StockMovement` answers "what happened to stock"; this answers "who did something the pharmacy may later be asked about" — logins, permission changes, price changes, posted stock takes. |

## Key design decisions

**Stock lives on `Batch`, never on `Medicine`.** Expiry is a property of a
delivered lot. Holding a single quantity on the medicine would make FEFO and
the expiry ban impossible to express.

**`StockMovement` is append-only.** No row is ever updated or deleted. A
correction is a new, compensating movement that references the original. The
current quantity on a batch must always equal the sum of its movements — an
invariant worth testing directly.

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

## Open questions

Nine business decisions are still open and are listed in
[`../README.md`](../README.md). Each is marked `TODO` at the place in the code
it affects. They must be settled in Week 2, before the affected use cases are
built or their test cases are given expected results.
