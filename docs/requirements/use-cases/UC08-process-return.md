# UC08 — Process a return

| | |
|---|---|
| **Owner** | Bùi Duy Anh (B) |
| **Priority** | Must |
| **Primary actor** | Cashier |
| **Status** | Design gate, week 7 — decisions, interface and scenario table agreed before the code (issue #58) |
| **Related rules** | BR11, BR05, BR03 (via the ledger) |
| **Requirements** | FR-27, FR-28, FR-23 |
| **Decisions** | DEC-04 (returns go to quarantine), decision 13 (a return does not restore the prescription) |

## Goal

When a customer brings back medicines they bought, the cashier records the
return against the original sale and refunds it at the price paid. The goods
never go straight back on the shelf: they wait in quarantine until a manager
assesses them (BR11), so an item of unknown storage history cannot be sold
again by mistake.

## Preconditions

- The cashier is signed in; the role holds `return.create`.
- The sale exists (UC07) and has at least one line with quantity still
  returnable (sold − already returned > 0).
- The ledger offers `receiveReturn` (Tiến, W07-A1, #55).

## Postconditions

- **Success:** one sale return is stored with a unique return number, a
  reason and its lines. For each line:
  - a `RETURN` movement adds the quantity to the **quarantine** of the
    sale line's original batch — sellable stock is unchanged (BR11, FR-28);
  - the return line is `PENDING_ASSESSMENT` and carries the original unit
    price, so refund = unit price × quantity (FR-28);
  - the sale line's `quantityReturned` grows; the sale becomes
    PARTIALLY_RETURNED or RETURNED.
  The original sale and its movements are never edited (BR05).
- **Failure:** nothing is saved — no return, no movement, no change to the
  sale.

## Main flow

1. The cashier opens *Returns* and finds the sale by receipt number.
2. The system shows each sale line: medicine, batch, quantity sold, already
   returned, still returnable, unit price.
3. The cashier enters the quantity to return on one or more lines and the
   reason for the return.
4. The cashier confirms; the request carries a fresh client-generated
   request ID (FR-23).
5. The system checks every line (A1–A3). In one `StockLedger` transaction it
   locks the sale lines, then the medicines and the original batches, posts
   one `RETURN` movement per line into quarantine, stores the return with its
   lines as PENDING_ASSESSMENT, updates `quantityReturned` and the sale
   status, and computes the refund.
6. The system shows the return: number, lines, refund total, and that the
   goods are in quarantine waiting for assessment.

After this use case, a manager assesses each line in UC11 (Minh, FR-46):
release to sellable stock, or reject to pending destruction (DEC-04).

## Alternative and error flows

| ID | At step | Condition | What the system does | Ends in |
|---|---|---|---|---|
| A1 | 5 | The quantity is more than sold minus already returned (TC-17) | Refused on that line, showing the returnable quantity; nothing changes | Step 3 |
| A2 | 5 | A line does not belong to the chosen sale | Refused on that line | Step 3 |
| A3 | 3 | No reason is given | Error on the reason; nothing saved | Step 3 |
| A4 | 4 | The same request ID arrives again (TC-18, FR-23) | Returns the first result; no second return | Step 6 |
| A5 | 4 | The same request ID arrives with different content | Refused; nothing changes | Failure |
| A6 | 5 | The item is a controlled medicine, or its batch has expired | **Still accepted into quarantine** (BR11); it can never be released to sellable stock — the assessment in UC11 rejects it (DEC-04, TC-50) | Step 6 |
| A7 | 5 | The line came from billing a dispensing (UC07) | Accepted the same way; the prescription's outstanding quantity is **not** restored (decision 13) | Step 6 |
| A8 | 1 | The receipt number does not exist | "Sale not found"; nothing saved | Step 1 |
| A9 | 1 | The user lacks `return.create` (Pharmacist) | 403 from the service, also when the API is called directly | Failure |

## Functional requirements

| ID | Requirement | Test cases |
|---|---|---|
| FR-27 | Record a return against a sale line with a reason, where the quantity returned is at most the quantity sold minus the quantity already returned. | TC-16, TC-17 |
| FR-28 | Post a returned item as a RETURN movement into the quarantine of its original batch with status PENDING_ASSESSMENT, never into sellable stock, and compute the refund at the original unit price. | TC-16, TC-50 |
| FR-23 | Carry a request ID stored with its result in the same transaction; a repeat returns the first result, the same ID with other content is refused. | TC-18 |

## Data and calculation

- Refund per line = `ReturnLine.unitPrice` (copied from the sale line) ×
  quantity; refund total = sum of the lines. Money as in UC07 — never binary
  floating point.
- Sale status: RETURNED when every line is fully returned, otherwise
  PARTIALLY_RETURNED after the first return.
- Lock order: sale lines first (so two cashiers returning against the same
  line queue there, as prescriptions do in UC06), then the ledger's order:
  medicines in one call, then batches.

## Decisions for the build

The open questions of the draft, settled for #58 as assumptions; each can be
changed in one place if the team or the pharmacist reviewer decides otherwise.

| Question | Taken for the build | Why |
|---|---|---|
| Goods given back after a hand-over that was **not billed** | Out of scope: there is no sale line to return against. The pharmacist corrects the hand-over before billing. | FR-27 returns against a sale line |
| Time limit | None. Any line with a returnable quantity can be returned. | No requirement sets one |
| The refund | Stored on the return (`refundAmount`) and shown; handling the cash is outside the system. | FR-28 asks to compute it |
| One return, one sale | A return is against one sale; its lines name sale lines of that sale. A sale line is one batch, so the batch of the return is never chosen by the cashier. | DEC-04: back to the original batch |
| Return number | `RT-YYYYMMDD-NNNN`, running per business day, drawn like the receipt number in UC07. | Readable on paper |
| Reason | Required on the return, trimmed, 3–500 characters. | A3, TC-16 |
| Stock effect | `tx.receiveReturn(actor, batchId, quantity, returnLineId)` from the ledger (#55, `docs/design/stock-ledger.md`): one `RETURN` movement, quarantine +q of the sale line's batch, whatever the batch's status or expiry. UC08 never posts a movement itself. | DEC-04, BR11, A6 |
| A billed line (from a hand-over) | Returned the same way into the batch it was handed over from; the prescription's outstanding quantity is not restored. | A7, decision 13 |
| Low-stock alerts | Unchanged by a return: quarantine is not sellable stock (DEC-08). The ledger re-evaluates the medicine anyway at the end of the transaction (UC10). | DEC-08 |

## Interface (for #58)

| Route | Permission | Body / response |
|---|---|---|
| `GET /api/returns/sales/:receiptNumber` | `return.create` | The sale and what can still be returned: `{ id, receiptNumber, soldAt, customer, lines: [{ saleLineId, medicine, batch, quantitySold, quantityReturned, returnable, unitPrice, billed }] }`. 404 when no sale has that number (A8). |
| `POST /api/returns` | `return.create` | `{ requestId, saleId, reason, lines: [{ saleLineId, quantity }] }`. 201: the return `{ id, referenceNumber, returnedAt, sale: { id, receiptNumber }, reason, lines: [{ saleLineId, medicine, batch, quantity, unitPrice, refund, assessmentStatus }], refundAmount }` |
| `GET /api/returns/:id` | `return.create` | The return again, to show or print |

Money goes out as decimal strings, as in UC07. Errors use the existing
format (#47): 400 per field — `reason`, `lines.N.quantity`, an unknown `saleId`
or a sale line of another sale on `lines.N.saleLineId`, the same sale line
twice; 403; 404 for an unknown receipt number or return in the URL; 409 for a
request ID reused with other content; 422 `RETURN_EXCEEDS_SOLD` (FR-27, TC-17)
on `lines.N.quantity`, naming the returnable quantity.

Lock order, as in sequence diagram 3: the sale's lines (`FOR UPDATE`, so two
cashiers returning against one line queue there), then the request ID, then
the ledger's order — medicines in one call, then each batch inside
`receiveReturn`; the return number's advisory lock last.

## Scenario table

The design-gate table (plan §6.1, D15). The test names are reserved for the
build; if a test ends up with another number, this table changes in the same
pull request.

| ID | Kind | Scenario | Expected | Test |
|---|---|---|---|---|
| S01 | Normal | Sold 5, return 2 with a reason | One return line PENDING_ASSESSMENT; one `RETURN` movement, quarantine +2 of the sold batch, sellable unchanged; `quantityReturned` 2; sale PARTIALLY_RETURNED; refund = 2 × unit price | UC08-01, TC-16 |
| S02 | Normal | Then return the other 3 | Sale RETURNED; the first return untouched | UC08-02 |
| S03 | Edge | Return exactly the returnable quantity | Accepted; returnable 0 | UC08-02 |
| S04 | Error | Sold 5, returned 2, return 4 more | 422 `RETURN_EXCEEDS_SOLD` on `lines.0.quantity` with "Only 3 can be returned."; nothing saved | UC08-03, TC-17 |
| S05 | Normal | A sale of two batches (FEFO split): return from each line | One `RETURN` per line, each into its own batch | UC08-04 |
| S06 | Edge | The batch has expired, or is recalled, since the sale; a controlled medicine | Still accepted into quarantine (A6); sellable unchanged | UC08-05, TC-50 |
| S07 | Normal | Return a billed line (from a hand-over) | Accepted into the hand-over's batch; the prescription's outstanding quantity unchanged (decision 13) | UC08-06 |
| S08 | Error | The same request ID again / with other content | Same return, one movement / 409 | UC08-07, TC-18, FR-23 |
| S09 | Error | Reason missing; quantity 0, −1 or 2.5; no line; the same sale line twice | 400 on the field; nothing saved | UC08-08, NFR-04 |
| S10 | Error | A sale line of another sale; an unknown `saleId` | 400 on `lines.N.saleLineId` / `saleId` (#47) | UC08-09 |
| S11 | Error | Unknown receipt number | 404 "Sale not found" (A8) | UC08-10 |
| S12 | Error | A pharmacist (no `return.create`) calls the API | 403 (A9) | UC08-11 |
| S13 | Concurrency | Two cashiers return the last returnable units of one line at once | One 201, one 422 `RETURN_EXCEEDS_SOLD`; never more returned than sold | UC08-12, NFR-08 |
| S14 | Normal | The return read again; the sale read again | Same return; the sale's lines show what was returned | UC08-13 |

After every test that moves stock, `findLedgerMismatches` must find nothing
(BR05).
