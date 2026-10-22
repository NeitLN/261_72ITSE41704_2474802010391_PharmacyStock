# Sequence diagrams — dispensing, billing, returns, stock lookup

Week 4 task W04-B1 (#31), done late. Three flows where stock and money meet,
drawn so that the lock order and the "stock leaves once" rule (DEC-05) can be
checked before and during review.

| Diagram | Source | State |
|---|---|---|
| 1. Dispense against a prescription (UC06) | The code in #109: `DispensingService`, `FefoAllocator`, `StockLedger` | **As built** |
| 2a. Over-the-counter sale (UC07) | The code: `SalesService`, `FefoAllocator`, `StockLedger`, `PriceBook` | **As built** — matches the design |
| 2b. Bill a dispensing (UC07) | Same | Design gate for #50 (week 6) — update when built |
| 3. Process a return (UC08) | [UC08 specification](../requirements/use-cases/UC08-process-return.md) | Design for #58 — update when built |
| 4. Look up stock and batch history (UC04) | The code: `StockLookupService`, `StockPanel` | **As built** — matches the design |
| 5. Approve a stock take (UC09) | [UC09 specification](../requirements/use-cases/UC09-conduct-stock-take.md) | Design gate for #52 (week 6) — update when built |
| 6. Evaluate low-stock alerts (UC10) | [UC10 specification](../requirements/use-cases/UC10-review-low-stock-alerts.md) | Design gate for #53 (week 6) — update when built |
| 7. Expiry alerts, write-off and batch status (UC11) | [UC11 specification](../requirements/use-cases/UC11-expiry-batch-status-quarantine.md), [ledger commands](../design/stock-ledger.md) | Design gate for #61 (week 7) — update when built |
| 8. Stock movement report (UC12) | [UC12 specification](../requirements/use-cases/UC12-stock-movement-report.md) | Design gate for #62 (week 7) — update when built |

Every diagram that writes (1–3) follows the same transaction pattern: one `StockLedger.run`
(READ COMMITTED, 5-second lock timeout, one retry on deadlock); the document
row that two users could both touch is locked first; then the ledger's own
order — medicines in one call, ascending id, then batches; the request ID is
stored with the result in the same transaction (FR-23). Any error rolls the
whole transaction back, so nothing is half-saved.

## 1. Dispense against a prescription (UC06) — as built

Preview and hand-over are two requests. Only the second moves stock (FR-45).

```mermaid
sequenceDiagram
    autonumber
    actor P as Pharmacist
    participant UI as DispensePanel
    participant C as DispensingController
    participant S as DispensingService
    participant F as FefoAllocator
    participant L as StockLedger
    participant DB as PostgreSQL

    P->>UI: choose a verified prescription, quantities
    UI->>C: POST /dispensings/preview
    C->>S: preview(actor, dto)
    S->>S: assertPermission(DISPENSE)
    S->>DB: read prescription, items, batches (no locks)
    S->>S: checkPrescription — BR04 status, BR10 valid-until, active prescriber
    S->>F: allocate(batches, quantity, businessDate)
    F-->>S: lines per batch + expiry warnings, or shortage with available
    S-->>UI: preview — nothing locked, moved or reserved (DEC-05)

    P->>UI: Confirm hand-over (note if partial)
    UI->>C: POST /dispensings {requestId, items}
    C->>S: dispense(actor, dto)
    S->>S: assertPermission(DISPENSE)
    S->>L: run(work)
    L->>DB: BEGIN
    S->>DB: SELECT prescription FOR UPDATE
    S->>DB: find ProcessedRequest(requestId)
    alt request already done (FR-23)
        S-->>C: stored result — same hash replays, other content gets 409
    else new request
        S->>S: checkPrescription (BR04, BR10)
        S->>DB: SELECT prescription items FOR UPDATE
        S->>S: quantity ≤ outstanding (BR07), note when partial (DEC-02)
        S->>L: lockMedicines(all medicine ids)
        L->>DB: SELECT medicines FOR UPDATE (ascending id)
        S->>L: lockEligibleBatches(medicine, businessDate)
        L->>DB: SELECT ACTIVE, unexpired, sellable batches FOR UPDATE, FEFO order
        S->>F: allocate per item (same medicine shares what is left)
        alt any shortage (BR03, FR-18)
            S-->>L: throw BusinessRuleViolation BR03 — rollback, 422 with available
        else enough stock
            loop each batch line
                S->>DB: INSERT dispense_line
                S->>L: post(DISPENSE, −quantity, source = dispense line)
                L->>DB: INSERT stock_movement, UPDATE batch qtySellable (CHECK ≥ 0)
            end
            S->>DB: UPDATE items quantityDispensed and prescription status PARTIALLY or FULLY_DISPENSED (FR-22)
            S->>DB: INSERT processed_request(requestId, hash, result)
        end
    end
    L->>DB: COMMIT
    S-->>UI: 201 result — lines per batch, dispensed and outstanding
```

Why the prescription is locked first: two pharmacists on the same
prescription queue there, so the outstanding quantity one of them reads is
still true when it is written (BR07, TC-54); a repeat of the same request
waits for the first and then finds its stored result.

## 2. Record a sale (UC07) — design

One `POST /sales` records both forms; a sale may hold over-the-counter lines,
a billed prescription, or both. The cart lives in the browser until payment
is confirmed, so adding, changing or cancelling it moves and reserves nothing
(DEC-05, FR-45). Scenario rows (UC07-S01…S16) are in the
[UC07 specification](../requirements/use-cases/UC07-record-sale.md#scenario-table).

Lock order inside the transaction, the same as UC06 so the two cannot
deadlock each other: the billed **prescription's unbilled dispense lines**
first (the document row two cashiers could both touch), then the request ID,
then the ledger's order — medicines in one call, ascending id, then eligible
batches. An over-the-counter sale has no document row, so it locks its
medicines before looking up the request ID: a repeat of the same request
waits there and then finds the stored receipt. The receipt number is drawn
under a transaction-level advisory lock taken after every row lock, so it
cannot form a cycle with them.

### 2a. Over-the-counter sale

Stock leaves at the confirmed payment, by FEFO, only for medicines classified
OTC (DEC-09, BR01, BR02, BR03).

```mermaid
sequenceDiagram
    autonumber
    actor K as Cashier
    participant UI as SalesPage
    participant C as SalesController
    participant S as SalesService
    participant PB as PriceBook
    participant F as FefoAllocator
    participant L as StockLedger
    participant DB as PostgreSQL

    K->>UI: add medicines and quantities to the cart (browser only)
    K->>UI: Confirm payment
    UI->>C: POST /sales {requestId, otcLines[{medicineId, quantity}], customerId?}
    C->>S: record(actor, dto)
    S->>S: assertPermission(SALE_CREATE), one line per medicine, else 400
    S->>L: run(work)
    L->>DB: BEGIN
    S->>L: lockMedicines(all medicine ids)
    L->>DB: SELECT medicines FOR UPDATE (ascending id), unknown id 404
    S->>DB: find ProcessedRequest(requestId)
    alt request already done (FR-23)
        S-->>C: stored receipt — same hash replays, other content gets 409
    else new request
        S->>DB: read medicines of the cart
        S->>S: each medicine classified OTC and active, else 422 BR04 / FR-02 on that line (A1, A4)
        S->>PB: pricesOn(medicines, businessDate)
        S->>S: every medicine has a price in force, else 422 on that line (A4)
        S->>L: lockEligibleBatches(medicine, businessDate)
        L->>DB: SELECT ACTIVE, unexpired, sellable batches FOR UPDATE, FEFO order
        S->>F: allocate per line (lines of one medicine share what is left)
        alt any shortage (BR03, A2, A3, A9)
            S-->>L: throw BusinessRuleViolation BR03 — rollback, 422 with available
        else enough stock
            S->>DB: pg_advisory_xact_lock, next RC-YYYYMMDD-NNNN of the business day
            S->>DB: INSERT sale (receipt number, sold by, customer?, sold at = Clock)
            loop each batch line
                S->>DB: INSERT sale_line (batch, quantity, unit price, line total)
                S->>L: post(SALE, −quantity, source = sale line)
                L->>DB: INSERT stock_movement, UPDATE batch qtySellable (CHECK ≥ 0)
            end
            S->>DB: UPDATE sale.totalAmount = Σ line totals (whole xu, no float)
            S->>DB: INSERT processed_request(requestId, hash, result)
        end
    end
    L->>DB: COMMIT
    S-->>UI: 201 receipt — number, lines per batch, unit prices, total
```

### 2b. Bill a dispensing

The medicines already left the shelf at the hand-over. Billing records the
money only: **no** stock movement (DEC-05, FR-26, TC-52). The schema has no
separate "dispensing" row: a hand-over is the set of `DispenseLine`s of one
prescription, so the cashier bills a prescription, and every dispense line
of it whose `sale_id` is still empty goes on the bill.

```mermaid
sequenceDiagram
    autonumber
    actor K as Cashier
    participant UI as SalesPage
    participant C as SalesController
    participant S as SalesService
    participant PB as PriceBook
    participant L as StockLedger
    participant DB as PostgreSQL

    K->>UI: Bill a dispensing
    UI->>C: GET /sales/billable
    C->>S: billable(actor)
    S->>DB: prescriptions with dispense lines where sale_id IS NULL
    S-->>UI: reference, patient, hand-over time, medicines and quantities
    K->>UI: choose one, Confirm payment
    UI->>C: POST /sales {requestId, prescriptionId, otcLines?}
    C->>S: record(actor, dto)
    S->>S: assertPermission(SALE_CREATE)
    S->>L: run(work)
    L->>DB: BEGIN
    S->>DB: SELECT dispense lines of the prescription WHERE sale_id IS NULL FOR UPDATE
    S->>DB: find ProcessedRequest(requestId)
    alt request already done (FR-23)
        S-->>UI: stored receipt — or 409 for other content
    else no unbilled line left (A5: another cashier billed it first)
        S-->>L: throw BusinessRuleViolation — rollback, 422 "already billed"
    else unbilled lines found
        S->>PB: pricesOn(medicines, businessDate) (decision 12)
        S->>DB: INSERT sale (receipt number, customer = the patient)
        loop each dispense line
            S->>DB: INSERT sale_line (same batch and quantity, unit price, line total)
            S->>DB: UPDATE dispense_line.sale_id = sale
        end
        Note over S,L: no StockLedger.post — stock left once, at the hand-over
        opt OTC lines in the same sale
            S->>L: lockMedicines → lockEligibleBatches → post(SALE, −q) per batch, as in 2a
        end
        S->>DB: UPDATE sale.totalAmount, INSERT processed_request
    end
    L->>DB: COMMIT
    S-->>UI: 201 receipt — lines, unit prices, total
```

Why the dispense lines are locked first: two cashiers billing the same
prescription queue on those rows; the second one, once the first commits,
finds no line with an empty `sale_id` and is refused (A5, TC-52) instead of
billing it twice.

## 3. Process a return (UC08) — design

The returned quantity goes into the **quarantine** of the original batch,
never back to sellable stock (BR11, DEC-04). A manager assesses it later in
UC11.

```mermaid
sequenceDiagram
    autonumber
    actor K as Cashier
    participant UI as ReturnsPage
    participant R as ReturnService
    participant L as StockLedger
    participant DB as PostgreSQL

    K->>UI: find the sale by receipt number, quantities, reason
    UI->>R: POST /returns {requestId, saleId, lines, reason}
    R->>R: assertPermission(RETURN_CREATE)
    R->>L: run(work)
    L->>DB: BEGIN
    R->>DB: SELECT sale lines FOR UPDATE
    R->>DB: find ProcessedRequest(requestId)
    alt repeat (TC-18) or reused ID
        R-->>UI: stored result / 409
    else new return
        R->>R: quantity ≤ sold − returned (TC-17), line belongs to the sale
        R->>L: lockMedicines(all) → lockBatches(original batches)
        R->>DB: INSERT sale_return, return lines PENDING_ASSESSMENT, unit price copied
        loop each return line
            R->>L: post(RETURN, deltaQuarantine +q, source = return line)
            L->>DB: INSERT stock_movement, UPDATE batch qtyQuarantine
        end
        R->>DB: UPDATE sale_line.quantityReturned, sale status
        R->>DB: INSERT processed_request
    end
    L->>DB: COMMIT
    R-->>UI: 201 return — refund at the original price, goods in quarantine
    Note over K,DB: later, UC11 (manager): RELEASE to sellable, or REJECT to pending destruction
```

A return never edits the sale or its movements (BR05): the history of what
was sold stays readable, and the return is a new document with its own
movements. Returning dispensed goods does not restore the prescription's
outstanding quantity (decision 13).

## 4. Look up stock and batch history (UC04) — as built

Read only: no lock, no request ID, nothing written. The two numbers that must
agree with issuing come from the same rule as `StockLedger.lockEligibleBatches`
(ACTIVE, expiry after the business date), and the running balance is computed
from the movements in the query, so it cannot drift from the ledger (BR05).
Scenario rows (UC04-S01…S14) are in the
[UC04 specification](../requirements/use-cases/UC04-look-up-stock.md#scenario-table).

```mermaid
sequenceDiagram
    autonumber
    actor U as Manager, pharmacist or cashier
    participant UI as CataloguePage — Stock tab
    participant C as StockController
    participant S as StockLookupService
    participant K as Clock
    participant DB as PostgreSQL

    U->>UI: search, category, stock state
    UI->>C: GET /stock?search&categoryId&state&page
    C->>S: list(actor, query)
    S->>S: assertPermission(STOCK_VIEW)
    S->>K: today() — business date, Asia/Ho_Chi_Minh
    S->>DB: medicines LEFT JOIN batches, SUM per medicine: sellable (ACTIVE, expiry > today), expired, held, quarantine, pending destruction — filter, ORDER BY name, code — LIMIT/OFFSET and COUNT
    S-->>UI: page of medicines with quantities and total (empty → empty state, A1)

    U->>UI: open a medicine
    UI->>C: GET /stock/medicines/:id
    C->>S: medicine(actor, id)
    S->>DB: medicine (404 if unknown), its batches in FEFO order
    S->>S: state per batch — status first, then expired (expiry ≤ today), else active with days left
    S-->>UI: totals and batches with quantity per stock state

    U->>UI: open a batch
    UI->>C: GET /stock/batches/:id/movements
    C->>S: history(actor, id)
    S->>DB: batch (404 if unknown) and its movements with SUM(delta) OVER (ORDER BY occurredAt, id) per state, the user, the reversal links
    S->>DB: references of the source documents (receipt, prescription, sale) in one query per type
    S-->>UI: movements in time order with running balance and source — last balance = batch quantities
```

## 5. Approve a stock take (UC09) — design

Counting and posting are apart: the counts are entered and submitted first
(the system quantity of a line is taken when its count is saved, decision
15), and only the approval changes stock, in one ledger transaction, by
someone who counted none of its lines and did not submit it (BR08). Scenario rows UC09-S01…S18 are in the
[UC09 specification](../requirements/use-cases/UC09-conduct-stock-take.md#scenario-table).

```mermaid
sequenceDiagram
    autonumber
    actor P as Pharmacist (counter)
    actor M as Manager (approver)
    participant UI as ReportsPage — Stock takes
    participant C as StockTakesController
    participant S as StockTakesService
    participant L as StockLedger
    participant DB as PostgreSQL

    P->>UI: count sheet — counted quantity, reason where it differs
    UI->>C: PUT /stock-takes/:id/lines/:lineId {countedQuantity, reason?}
    C->>S: count(actor, id, lineId, dto)
    S->>S: assertPermission(STOCK_TAKE_COUNT)
    S->>DB: SELECT stock_take FOR UPDATE — COUNTING, else 409
    S->>DB: UPDATE line: counted, reason, countedBy = actor, systemQuantity = batch.qtySellable now
    P->>UI: Submit
    UI->>C: POST /stock-takes/:id/submit
    C->>S: submit(actor, id)
    S->>DB: SELECT stock_take FOR UPDATE — COUNTING, else 409
    S->>S: every line counted, every difference has a reason, else 400 naming the lines (FR-30)
    S->>DB: UPDATE status PENDING_APPROVAL, countedBy, submittedAt

    M->>UI: open, read system / counted / difference / value, Approve
    UI->>C: POST /stock-takes/:id/approve
    C->>S: approve(actor, id)
    S->>S: assertPermission(STOCK_TAKE_APPROVE)
    S->>L: run(work)
    L->>DB: BEGIN
    S->>DB: SELECT stock_take FOR UPDATE — PENDING_APPROVAL, else 409
    S->>S: actor counted no line and did not submit, else 422 BR08 SAME_COUNTER (FR-32)
    S->>L: lockMedicines(medicines of the lines with a difference)
    S->>L: lockBatches(their batches, ascending id)
    loop each line with counted ≠ system
        S->>L: post(ADJUSTMENT, counted − system, source = line, reason)
        L->>DB: INSERT stock_movement, UPDATE batch (CHECK ≥ 0)
        Note over S,L: below zero → 422 BR03 naming the line, rollback (A6)
    end
    S->>DB: UPDATE status APPROVED, approvedBy, approvedAt
    L->>L: evaluate alerts of the locked medicines (section 6)
    L->>DB: COMMIT
    S-->>UI: approved stock take with the movements
```

## 6. Evaluate low-stock alerts (UC10) — design

The check runs inside `StockLedger.run`, after the command's work and before
the commit, for every medicine the transaction locked: those rows are locked,
so two concurrent commands cannot both raise an alert, and no use case can
forget it. A catalogue change of the reorder level or the switch runs the
same check; so does the first alert request of a new business date. Scenario
rows UC10-S01…S15 are in the
[UC10 specification](../requirements/use-cases/UC10-review-low-stock-alerts.md#scenario-table).

```mermaid
sequenceDiagram
    autonumber
    participant L as StockLedger.run
    participant E as AlertEvaluator
    participant K as Clock
    participant DB as PostgreSQL

    L->>E: evaluate(manager, locked medicine ids)
    E->>K: today() — business date
    E->>DB: per medicine: lowStockMonitored, reorderLevel, SUM(qtySellable) of ACTIVE batches with expiry > today
    E->>DB: its unresolved LOW_STOCK / OUT_OF_STOCK alert, if any
    alt monitoring on and sellable = 0
        E->>E: wanted = OUT_OF_STOCK
    else monitoring on and sellable ≤ reorder level
        E->>E: wanted = LOW_STOCK
    else
        E->>E: wanted = none
    end
    alt open alert of the wanted type
        E-->>L: keep it (acknowledgement kept)
    else
        E->>DB: UPDATE open alert SET RESOLVED, resolvedAt (if any)
        E->>DB: INSERT alert of the wanted type with the message (if any)
    end
```

## 7. Expiry alerts, write-off and batch status (UC11) — design

The write-off and the status change are Tiến's ledger commands; their
sequence, with the lock order, is in
[`stock-ledger.md`](../design/stock-ledger.md) § *Week 7*. UC11 adds the
service around them and the expiry alerts, which the same `AlertEvaluator`
as section 6 raises per batch. Scenario rows UC11-S01…S13 are in the
[UC11 specification](../requirements/use-cases/UC11-expiry-batch-status-quarantine.md#scenario-table).

```mermaid
sequenceDiagram
    autonumber
    actor M as Manager
    participant S as BatchesService (UC11)
    participant L as StockLedger
    participant E as AlertEvaluator
    participant DB as PostgreSQL

    M->>S: POST /batches/:id/write-off {reason} or /status {status, reason}
    S->>S: assertPermission(BATCH_STATUS_MANAGE)
    S->>DB: batch (404 if unknown) and its medicine id
    S->>L: run(work)
    L->>DB: BEGIN
    S->>L: lockMedicines([medicine])
    alt write-off
        S->>L: tx.writeOff(actor, batch, reason)
        Note over L: expired or not ACTIVE, sellable above 0, else 422 (#55)
    else status
        S->>L: tx.setBatchStatus(actor, batch, status, reason)
        Note over L: reason, not the same status, REJECTED final, else 422 (#55)
    end
    L->>E: evaluate(locked medicines)
    E->>DB: low-stock alert of the medicine (section 6)
    E->>DB: expiry alert of each batch with sellable stock: EXPIRING_SOON, EXPIRED or resolved
    L->>DB: COMMIT
    S-->>M: the batch, and the movement for a write-off
```

## 8. Stock movement report (UC12) — design

Read only: no lock, nothing written. One SQL statement per report sums the
signed deltas of each movement type per medicine over the period's business
days, so the figures always come from the movements (DEC-06, BR05). Scenario
rows UC12-S01…S13 are in the
[UC12 specification](../requirements/use-cases/UC12-stock-movement-report.md#scenario-table).

```mermaid
sequenceDiagram
    autonumber
    actor M as Manager
    participant UI as ReportsPage — Stock movement
    participant C as ReportsController
    participant R as StockMovementReport
    participant DB as PostgreSQL

    M->>UI: period, category, Run
    UI->>C: GET /reports/stock-movement?from&to&categoryId
    C->>R: generate(actor, query) — chosen by kind
    R->>R: assertPermission(REPORT_VIEW), validate the period, else 400
    R->>DB: per medicine: SUM(delta) FILTER (type, day of occurredAt in Asia/Ho_Chi_Minh) — opening before from, columns within, closing up to to, cost = SUM(quantity × batch unitCost)
    R->>R: net issued = dispensed + sold − released, check closing against the columns per row
    R->>R: totals, sort by cost of net issued, stamp producedAt and producedBy
    R-->>UI: rows, totals, any row whose check failed flagged
```
