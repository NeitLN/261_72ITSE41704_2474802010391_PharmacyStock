# Sequence diagrams — dispensing, billing, returns

Week 4 task W04-B1 (#31), done late. Three flows where stock and money meet,
drawn so that the lock order and the "stock leaves once" rule (DEC-05) can be
checked before and during review.

| Diagram | Source | State |
|---|---|---|
| 1. Dispense against a prescription (UC06) | The code in #109: `DispensingService`, `FefoAllocator`, `StockLedger` | **As built** |
| 2. Bill a dispensing (UC07) | [UC07 specification](../requirements/use-cases/UC07-record-sale.md) | Design for #50 — update when built |
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

## 2. Bill a dispensing (UC07) — design

The medicines already left the shelf at the hand-over. Billing records the
money only: **no** stock movement (DEC-05, FR-26, TC-52).

```mermaid
sequenceDiagram
    autonumber
    actor K as Cashier
    participant UI as SalesPage
    participant S as SalesService
    participant PB as PriceBook
    participant L as StockLedger
    participant DB as PostgreSQL

    K->>UI: Bill a dispensing → choose an unbilled hand-over
    UI->>S: POST /sales {requestId, dispensing, OTC lines?}
    S->>S: assertPermission(SALE_CREATE)
    S->>L: run(work)
    L->>DB: BEGIN
    S->>DB: SELECT dispense lines FOR UPDATE
    S->>DB: find ProcessedRequest(requestId)
    alt already billed (UC07 A5) or request reused
        S-->>UI: 422 already billed / 409 / stored result
    else not billed
        S->>PB: price of each medicine on the sale date (decision 12)
        S->>DB: INSERT sale (receipt number), one sale line per dispense line
        S->>DB: UPDATE dispense_line.sale_id
        Note over S,L: no StockLedger.post — stock left once, at the hand-over
        opt OTC lines in the same sale
            S->>L: lockMedicines → lockEligibleBatches → post(SALE, −q) per batch
        end
        S->>DB: INSERT processed_request
    end
    L->>DB: COMMIT
    S-->>UI: 201 receipt — lines, unit prices, total
```

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
