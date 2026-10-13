# UC07 — Record a sale

| | |
|---|---|
| **Owner** | Bùi Duy Anh (B) |
| **Priority** | Must |
| **Primary actor** | Cashier |
| **Status** | Draft — not built yet (issue #50) |
| **Related rules** | BR01, BR02, BR03 (via the ledger), BR04, BR09 *(S)* |
| **Requirements** | FR-24, FR-25, FR-26, FR-23, FR-45 |
| **Decisions** | DEC-05 (stock leaves once), DEC-09 (OTC only), decision 12 (price on the sale date), DEC-01, DEC-07 |

A sale has two forms that share one receipt: an **over-the-counter sale**
(the cashier takes the medicines from the shelf, so the sale moves stock) and
**billing a dispensing** (the pharmacist has already handed the medicines
over in UC06, so the bill moves nothing). One sale may contain both.

## Goal

The cashier takes payment for medicines and gives the customer a receipt
with a unique number, so that every unit that leaves the pharmacy is either
dispensed against a prescription or paid for, and never both counted twice.

## Preconditions

- The cashier is signed in; the role holds `sale.create`.
- Every medicine in an over-the-counter cart exists, is active and has a
  price in force on the sale date (UC01).
- For billing: the dispensing was handed over in UC06 and is not yet billed.

## Postconditions

- **Success:** one sale is stored with a unique receipt number and a total.
  - Over-the-counter lines: one sale line per batch that FEFO used, each
    with one `SALE` movement on its batch (BR01, BR02, BR03).
  - Billed lines: one sale line per dispense line, with the dispense line
    linked to the sale; **no** movement (DEC-05, FR-26).
  - Each line carries the unit price in force on the sale date, so a later
    price change never alters it (decision 12, BR09).
- **Failure:** nothing is saved — no sale, no line, no movement, and no
  dispense line is marked as billed.

## Main flow — over-the-counter sale

1. The cashier opens *Sales* and starts a new sale.
2. The cashier adds medicines and quantities to the cart. The system shows
   each medicine's current price and sellable quantity. The cart moves and
   reserves nothing (DEC-05).
3. The cashier optionally names the customer (not required for an
   over-the-counter sale).
4. The cashier confirms payment; the request carries a fresh client-generated
   request ID (FR-23).
5. The system checks every line (A1–A4). In one `StockLedger` transaction it
   locks the medicines and their eligible batches, takes each line from the
   batch that expires first and continues into the next (BR01, BR02), posts
   one `SALE` movement per batch used, stores the sale and its lines with the
   unit price on the sale date, and computes the total.
6. The system shows the receipt: receipt number, lines with batch, quantity,
   unit price and line total, and the total.

## Main flow — billing a dispensing

1. The cashier opens *Sales* and chooses *Bill a dispensing*.
2. The system lists hand-overs from UC06 that are not yet billed: prescription
   reference, patient, time, medicines and quantities.
3. The cashier picks one (and may add over-the-counter lines to the same
   sale, main flow step 2).
4. The cashier confirms payment with a fresh request ID.
5. In one transaction the system creates one sale line per dispense line —
   same batch and quantity, unit price on the sale date — links each dispense
   line to the sale, and posts **no** movement (DEC-05, FR-26, TC-52).
6. The system shows the receipt as in the main flow.

## Alternative and error flows

| ID | At step | Condition | What the system does | Ends in |
|---|---|---|---|---|
| A1 | OTC 5 | A medicine is not classified OTC — prescription-only or controlled (BR04, DEC-09) | Refused on that line: it must go through UC05/UC06 | OTC step 2 |
| A2 | OTC 5 | The sellable quantity of eligible batches is lower than requested (BR03) | Refused on that line, showing the quantity that can be sold; nothing changes | OTC step 2 |
| A3 | OTC 5 | Only expired, on-hold, recalled or rejected batches remain (BR02, DEC-07) | Treated as A2: such batches are never eligible | OTC step 2 |
| A4 | OTC 5 | A medicine is deactivated, or has no price in force on the sale date | Refused on that line | OTC step 2 |
| A5 | Billing 5 | The dispensing is already billed (another cashier, or a repeat) | Refused; the dispensing stays linked to the first sale | Failure |
| A6 | 4 | The same request ID arrives again (FR-23) | Returns the first receipt; nothing changes a second time | Step 6 |
| A7 | 4 | The same request ID arrives with different content | Refused; nothing changes | Failure |
| A8 | 2–4 | The cashier cancels the cart with a reason before paying (FR-45, TC-59) | No movement and no sale; quantities unchanged | Step 1 |
| A9 | OTC 5 | A dispensing in UC06 takes the last units at the same moment (TC-62) | Exactly one succeeds; the other is refused as in A2, never negative, never a 500 | OTC step 2 |
| A10 | 1 | The user lacks `sale.create` (Pharmacist) | 403 from the service, also when the API is called directly | Failure |

## Functional requirements

| ID | Requirement | Test cases |
|---|---|---|
| FR-24 | Record an over-the-counter sale of one or more medicines, allocating batches by FEFO, valuing each line at the current price and issuing a unique receipt number and total. | TC-35, TC-55 |
| FR-25 | Refuse, in an over-the-counter sale, any medicine that is not classified OTC. | TC-36 |
| FR-26 | Bill a completed dispensing, creating sale lines from its dispense lines without a second stock movement. | TC-15, TC-52 |
| FR-23 | Carry a request ID stored with its result in the same transaction; a repeat returns the first result, the same ID with other content is refused. | TC-27 |
| FR-45 | Move stock only at the confirmed payment of an over-the-counter sale; a cancelled cart leaves stock unchanged. | TC-59, TC-62 |

## Data and calculation

- **Money** is stored as `numeric(12,2)` and computed in whole đồng or as
  decimal strings, never with binary floating point (TC-52).
- `lineTotal = unitPrice × quantity`; `totalAmount` = sum of line totals.
- An over-the-counter line that FEFO splits over two batches becomes two sale
  lines at the same unit price (one per batch), so a return in UC08 can go
  back to the right batch.

## Open questions

- Can a sale bill **part** of a dispensing (some dispense lines only), or is
  a dispensing always billed whole? Assumed whole; FR-26 does not say.
- Is a receipt number a running number per day or across the whole system?
  The schema only requires it to be unique.
- Who may cancel a paid sale? Not covered; a paid sale is corrected only by a
  return (UC08).
