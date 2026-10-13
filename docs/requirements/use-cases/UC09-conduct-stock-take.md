# UC09 — Conduct a stock take

| | |
|---|---|
| **Owner** | Võ Hoàng Minh (C) |
| **Priority** | Must (BR08, two-person approval, is Should) |
| **Primary actor** | Manager (opens and approves); Pharmacist or Manager (counts) |
| **Status** | Specified |
| **Related rules** | BR03 (via the ledger), BR05, BR08 *(S)* |
| **Requirements** | FR-29, FR-30, FR-31, FR-32 *(S)*, FR-39, FR-41 *(S)* |
| **Decisions** | Decision 15 (system quantity recorded at counting time; PENDING_APPROVAL), DEC-08 (what counts as sellable) |

## Goal

Staff count what is physically on the shelf, batch by batch. Where the count
differs from the book, the difference and its reason are reviewed by someone
other than the counter before the book is corrected, so the records match the
shelf and every correction can be explained later. A GPP inspection asks for
stock-count records ([`../sources.md`](../sources.md), S2 item 9.2).

## Preconditions

- The manager who opens and approves holds `stock_take.approve`.
- The counter holds `stock_take.count` (Pharmacist or Manager, Table 2.4).

## Postconditions

- **Success:** the stock take is APPROVED. Every line whose counted quantity
  differs from its system quantity has posted one `ADJUSTMENT` movement of
  *counted − system* on the batch's sellable stock, with the reason and the
  line as source document; lines with no difference post nothing. Opener,
  counter, approver and times are recorded.
- **Failure:** no movement is posted and no quantity changes; the stock take
  stays in its previous status.

## Main flow

1. The manager opens *Stock control → Stock takes → New*, chooses the
   medicines to count and an optional note.
2. The system creates the stock take in COUNTING with a reference number and
   one line per batch of those medicines that has sellable stock, whatever
   its batch status. Each line shows medicine, batch number and expiry date;
   the book quantity is not shown, so it does not steer the count.
3. The counter enters the counted quantity for each line and, where it
   differs, a reason.
4. When a count is saved, the system records the batch's sellable quantity at
   that moment as the line's system quantity (decision 15), so sales and
   dispensing since the stock take was opened do not appear as differences.
5. The counter submits.
6. The system checks every line is counted and every difference has a reason
   (FR-30), records the counter and the time, and sets PENDING_APPROVAL.
7. The manager opens the stock take and sees, per line, system quantity,
   counted quantity, difference, reason, and the value of the difference at
   the batch's unit cost.
8. The manager approves.
9. In one `StockLedger` transaction the system checks the approver is not the
   counter (BR08), locks the medicines and then the batches in ascending id
   order, posts one `ADJUSTMENT` per line with a difference, and sets the
   stock take APPROVED with approver and time (FR-31). If the audit log is
   built, it writes `stock_take.approved` (FR-41).
10. The system shows the approved stock take and the movements posted.

## Alternative and error flows

| ID | At step | Condition | What the system does | Ends in |
|---|---|---|---|---|
| A1 | 3 | A count is empty, negative or not a whole number | Error on that line; the count is not saved | Step 3 |
| A2 | 6 | A line is not counted, or has a difference but no reason (FR-30) | Refused, naming each such line; stays COUNTING | Step 3 |
| A3 | 3 | The counter finds stock of a batch of these medicines that has no line (e.g. one the book holds at 0) | The counter adds a line for that batch; its system quantity is recorded as in step 4 | Step 3 |
| A4 | 9 | The approver is the user who counted (BR08, Should) | Refused: "A stock take must be approved by someone other than the counter"; nothing posted (TC-51) | Step 7 |
| A5 | 8 | The manager disputes a count | Returns the stock take to COUNTING with a comment; nothing posted | Step 3 |
| A6 | 9 | Issues since the count mean an adjustment would take sellable stock below zero (BR03) | The ledger refuses; the whole approval rolls back; the lines are named so they can be recounted | Step 3 |
| A7 | 9 | Every line has counted = system | Approved; no movement posted (TC-39) | Step 10 |
| A8 | 1–7 | The manager cancels | CANCELLED; nothing posted; the record is kept | Failure |
| A9 | 9 | The database fails part-way | Everything rolls back; status unchanged | Failure |
| A10 | any | The user lacks the permission for the step (e.g. a Cashier) | 403 from the service, also when the API is called directly (TC-20, TC-28) | Failure |

## Functional requirements

| ID | Requirement (short form) | Test cases |
|---|---|---|
| FR-29 | A manager opens a stock take for selected medicines; the system quantity of each batch is stored at counting time and the counter enters the counted quantity. | TC-19, TC-39 |
| FR-30 | No approval while a line with a difference has no reason. | TC-20 |
| FR-31 | On approval, one ADJUSTMENT per batch equal to counted − system quantity, and the stock take is closed. | TC-19 |
| FR-32 *(S)* | The user who counted cannot approve (BR08). | TC-51 |
| FR-39 | Permission checked in the service on every request. | TC-20, TC-28, TC-53 |
| FR-41 *(S)* | Approved stock takes are written to the audit log. | TC-44 |

## Open questions

1. **Quarantined and pending-destruction stock** is not counted here: an
   `ADJUSTMENT` can only change sellable stock (CHECK constraint), and those
   goods are kept apart. Is a separate count of them needed? S2 item 9.2
   asks for recalled stock to be counted while it waits.
2. **A6 wording:** FR-31 does not say what happens when an adjustment would
   go negative; this spec relies on BR03 in the ledger refusing it.
3. **Returning to COUNTING (A5)** has no field for the comment on
   `StockTake`; the `note` is used unless a column is added.
