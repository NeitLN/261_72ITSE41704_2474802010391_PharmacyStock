# Sequence diagrams — dispensing, billing, returns

Week 4 task W04-B1 (#31), done late. Three flows where stock and money meet,
drawn so that the lock order and the "stock leaves once" rule (DEC-05) can be
checked before and during review.

| Diagram | Source | State |
|---|---|---|
| 1. Dispense against a prescription (UC06) | The code in #109: `DispensingService`, `FefoAllocator`, `StockLedger` | **As built** |
| 2a. Over-the-counter sale (UC07) | [UC07 specification](../requirements/use-cases/UC07-record-sale.md), scenario table | Design gate for #50 (week 6) — update when built |
| 2b. Bill a dispensing (UC07) | Same | Design gate for #50 (week 6) — update when built |
| 3. Process a return (UC08) | [UC08 specification](../requirements/use-cases/UC08-process-return.md) | Design for #58 — update when built |

Every diagram follows the same transaction pattern: one `StockLedger.run`
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
batches.

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
    S->>S: assertPermission(SALE_CREATE)
    S->>L: run(work)
    L->>DB: BEGIN
    S->>DB: find ProcessedRequest(requestId)
    alt request already done (FR-23)
        S-->>C: stored receipt — same hash replays, other content gets 409
    else new request
        S->>DB: read medicines of the cart
        S->>S: each medicine active and classified OTC, else 422 BR04 on that line (A1, A4)
        S->>PB: pricesOn(medicines, businessDate)
        S->>S: every medicine has a price in force, else 422 on that line (A4)
        S->>L: lockMedicines(all medicine ids)
        L->>DB: SELECT medicines FOR UPDATE (ascending id)
        S->>L: lockEligibleBatches(medicine, businessDate)
        L->>DB: SELECT ACTIVE, unexpired, sellable batches FOR UPDATE, FEFO order
        S->>F: allocate per line (lines of one medicine share what is left)
        alt any shortage (BR03, A2, A3, A9)
            S-->>L: throw BusinessRuleViolation BR03 — rollback, 422 with available
        else enough stock
            S->>DB: INSERT sale (receipt number, sold by, customer?)
            loop each batch line
                S->>DB: INSERT sale_line (batch, quantity, unit price, line total)
                S->>L: post(SALE, −quantity, source = sale line)
                L->>DB: INSERT stock_movement, UPDATE batch qtySellable (CHECK ≥ 0)
            end
            S->>DB: UPDATE sale.totalAmount = Σ line totals (integer đồng)
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
