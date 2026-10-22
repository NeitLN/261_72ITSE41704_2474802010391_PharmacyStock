# UC07 — Record a sale

| | |
|---|---|
| **Owner** | Bùi Duy Anh (B) |
| **Priority** | Must |
| **Primary actor** | Cashier |
| **Status** | Built (issue #50): over-the-counter sale and billing a dispensing in `SalesService` (`POST /api/sales`, `GET /api/sales/billable`, `GET /api/sales/:id`); e2e UC07-01…22 |
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
   unit price and line total, and the total. A line from a batch that expires
   within the medicine's alert window carries a warning with the days left
   (BR02, FR-16), so the cashier can point it out to the customer.

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

## Decisions for the build

The open questions of the draft, settled for #50 as assumptions; each can be
changed in one place if the team or the pharmacist reviewer decides otherwise.

| Question | Taken for the build | Why |
|---|---|---|
| Bill part of a dispensing? | No. The schema has no "dispensing" row: a hand-over is the dispense lines of one prescription. The cashier bills a **prescription**, and every dispense line of it not yet billed (`sale_id` empty) goes on the bill. A later hand-over of the same prescription is billed by a later sale. | FR-26 bills "a completed dispensing"; billing whole avoids part-paid hand-overs |
| Receipt number | `RC-YYYYMMDD-NNNN`, a running number per business day (Asia/Ho_Chi_Minh), e.g. `RC-20261019-0001`. `HD-` is already used for supplier invoices in UC03. | Readable on paper; unique by the column constraint |
| Cancel a paid sale | Not possible. A paid sale is corrected only by a return (UC08). Before payment, cancelling is closing the cart in the browser after a confirmation: nothing was stored, so there is nothing to record (A8). TC-59 asks for a reason; the dialog asks for it, but it is not stored, because there is no draft row to attach it to — storing it would need a draft-sale table, which the schema does not have. | DEC-05: only the confirmed payment is a stock event |
| OTC rule | Only medicines classified OTC (DEC-09). DEC-09 is still open with the pharmacist reviewer (business-decisions.md); if it changes, only the classification check changes. | Spec and FR-25 as submitted |

## Interface (for #50)

| Route | Permission | Body / response |
|---|---|---|
| `GET /api/sales/billable` | `sale.create` | Prescriptions with unbilled dispense lines, the latest hand-over first: `[{ id, referenceNumber, customer, lastDispensedAt, lines: [{ dispenseLineId, medicine, batch, quantity, dispensedAt }] }]` |
| `POST /api/sales` | `sale.create` | `{ requestId, prescriptionId?, otcLines?: [{ medicineId, quantity }], customerId? }` — at least one of `prescriptionId` and `otcLines`. 201: the receipt `{ id, receiptNumber, soldAt, customer, lines: [{ medicine, batch, quantity, unitPrice, lineTotal, billed, warning }], totalAmount }` |
| `GET /api/sales/:id` | `sale.create` | The receipt, to show or print again |

Money goes out as decimal strings (`"12500.00"`), as in the rest of the API.
Errors use the existing format: 400 per field (`otcLines.0.quantity`; also an
unknown medicine, customer or prescription, #47), 403, 404 (an unknown sale
in the URL), 409 (request ID reused with other content), 422 with the rule and a
code: `INSUFFICIENT_STOCK` (BR03), `NOT_OVER_THE_COUNTER` (BR04),
`MEDICINE_INACTIVE`, `NO_PRICE_IN_FORCE`, `ALREADY_BILLED` (A5) and
`NOTHING_TO_BILL` (a prescription with no hand-over yet). A billed
prescription is paid for its own patient: another `customerId` is a 400.

## Scenario table

The design-gate table (plan §6.1, D15): every row becomes an automated test
named in the last column, and the rows with a TC are also run by hand.

| ID | Kind | Scenario | Expected | Test |
|---|---|---|---|---|
| S01 | Normal | OTC sale of one medicine; the earliest-expiring batch has enough | One sale line on that batch, one `SALE` movement, total = price × quantity, receipt `RC-…-0001` | UC07-01, TC-35 |
| S02 | Normal | OTC sale larger than the first batch | Two sale lines at the same unit price, earliest expiry first (BR01, DEC-07) | UC07-02, BR01 |
| S03 | Normal | Bill a prescription handed over in UC06 | One sale line per dispense line, dispense lines linked to the sale, **no** new movement, stock unchanged | UC07-15, TC-15, TC-52 |
| S04 | Normal | Bill a prescription and add OTC lines in the same sale | Billed lines move nothing; OTC lines move stock; one total | UC07-16 |
| S05 | Edge | Price changed today vs. yesterday | The line carries the price in force on the business date; a later change does not alter the stored sale | UC07-03 (BR09 *(S)*) |
| S06 | Edge | Quantity equals exactly the sellable quantity | Accepted; the batch reaches 0 | UC07-04 |
| S07 | Edge | A batch expires exactly today | Not eligible (BR02: expiry must be after the business date) | UC07-04, BR02 |
| S08 | Error | A prescription-only or controlled medicine in the OTC cart | 422 BR04 on that line; nothing saved | UC07-05, TC-36 |
| S09 | Error | More than the sellable quantity | 422 BR03 with the quantity available; nothing saved | UC07-06, TC-55 |
| S10 | Error | Only expired, on-hold or recalled batches left | Treated as S09 | UC07-07, DEC-07 |
| S11 | Error | Deactivated medicine, or no price in force | 422 on that line | UC07-08, UC07-22 |
| S12 | Error | Bill a prescription already billed | 422 "already billed"; the first sale unchanged | UC07-17, A5 |
| S13 | Error | Same request ID again / with other content | Same receipt, nothing posted twice / 409 | UC07-09, UC07-20, TC-27, FR-23 |
| S14 | Error | Pharmacist (no `sale.create`) calls the API | 403 | UC07-10, UC07-21, A10 |
| S15 | Error | Empty sale, quantity 0, −1 or 2.5, unknown medicine, customer or prescription | 400 on the field (`otcLines.0.quantity`, `otcLines.0.medicineId`, `customerId`, `prescriptionId`) (#47) | UC07-11, UC07-17, UC07-21, NFR-04 |
| S16 | Concurrency | A sale and a dispensing take the last units at the same moment; two cashiers bill the same prescription | Exactly one succeeds, the other 422; stock never negative; no 500 (BR03) | UC07-13, UC07-14, UC07-18, TC-62, NFR-08 |
| S17 | Edge | The earliest batch expires within the alert window (BR02, FR-16) | Sold with a warning showing the days left on its receipt line; a billed line carries none (its warning was shown at the hand-over) | UC07-23, UC07-15 |
| S18 | Normal | Part of a prescription handed over and billed, the rest handed over later (DEC-02) | The second hand-over appears in the list again and is billed on its own receipt | UC07-19 |
| S19 | Normal | A named customer; the receipt read again | Customer on the receipt; the same receipt from `GET /api/sales/:id` | UC07-12 |

After every test that moves stock, `findLedgerMismatches` must find nothing
(BR05).
