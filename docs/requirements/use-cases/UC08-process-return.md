# UC08 — Process a return

| | |
|---|---|
| **Owner** | Bùi Duy Anh (B) |
| **Priority** | Must |
| **Primary actor** | Cashier |
| **Status** | Draft — not built yet (issue #58) |
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
- The ledger supports the `RETURN` movement into quarantine (Tiến, W07-A1).

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

## Open questions

- Can goods be given back after a dispensing that was **not billed**? There
  is no sale line to return against; assumed out of scope (the pharmacist
  corrects it before billing).
- Is there a time limit for returns (e.g. 7 days after the sale)? No
  requirement sets one.
- Is the refund recorded as a payment anywhere? The system stores the refund
  amount on the return; handling cash is outside the system.
