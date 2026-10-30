# UC09 — Conduct a stock take

| | |
|---|---|
| **Owner** | Võ Hoàng Minh (C) |
| **Priority** | Must (BR08, two-person approval, is Should) |
| **Primary actor** | Manager (opens and approves); Pharmacist or Manager (counts) |
| **Status** | Design gate for #52 (week 6): decisions, interface and scenario table below |
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

## Decisions for the build

The open questions of the spec, settled for #52 as assumptions; each can be
changed in one place.

| Question | Taken for the build | Why |
|---|---|---|
| Who opens, approves, returns and cancels | `stock_take.approve` (manager). Counting, adding a line and submitting need `stock_take.count` (manager or pharmacist). A cashier can do neither. | Table 2.4, FR-29 |
| Which lines a stock take gets | One per batch of the chosen medicines that has sellable stock, whatever its status. The counter may add any other batch of those medicines (A3), e.g. one the book holds at 0. | Step 2, A3 |
| Blind count | While the stock take is COUNTING, the API returns `systemQuantity` and the difference as `null`, for every role. They appear once it is submitted. | Step 2: the book must not steer the count |
| When the system quantity is taken | When the count of that line is saved: the batch's `qtySellable` at that moment (decision 15). Approval posts *counted − system*, so issues between counting and approval do not become a difference. | Decision 15 |
| Who is "the counter" | Everyone who saved a count on any line, and everyone who submitted, kept in `stock_take_counters` even when a later count or submission overwrites the line's or the stock take's `countedBy` (#215). The approver must be none of them, so a manager cannot count the lines, have someone else press *Submit*, and approve their own count. | BR08, FR-32 (strict reading, review of #146) |
| Repeated or racing commands | Every command locks the stock take row first (`FOR UPDATE`), then checks its status. A second approve, or a count after submit, is a 409. No request ID is needed: the status change is the guard. | Same pattern as the prescription row in UC06 |
| Lock order on approval | Stock take row → medicines of the lines (one call, ascending id) → batches (ascending id) → one `ADJUSTMENT` per line with a difference, source `stock_take_line`, reason from the line. | `StockLedger` lock protocol |
| An adjustment that would go below zero (A6) | The ledger refuses it (BR03); the whole approval rolls back and the error names the line, so it can be recounted after a return to COUNTING. | Open question 2 |
| Return to counting (A5) | Allowed from PENDING_APPROVAL with a required comment, added to `note` with the date and the user; counts are kept, `countedBy` and `submittedAt` are cleared. | Open question 3; no new column |
| Quarantine and pending destruction | Not counted here: an `ADJUSTMENT` changes only sellable stock (CHECK constraint). Those goods are handled in UC11. | Open question 1 |
| Reference number | `ST-YYYYMMDD-NNNN`, running per business day, as `RC-` for sales. | Readable on paper |
| Value of a difference | *difference × batch unit cost*, shown to the approver (step 7) as a decimal string; not stored. | Step 7 |
| Audit log (FR-41, Should) | Not written yet; the stock take row keeps opener, counter, approver and times. Added with UC15. | UC15 is week 9 |

## Interface (for #52)

| Route | Permission | Body / response |
|---|---|---|
| `GET /api/stock-takes?status=` | `stock_take.count` | Stock takes, newest first: id, reference, status, opened by, counted by, approved by, times, line count, lines counted |
| `POST /api/stock-takes` | `stock_take.approve` | `{ medicineIds: [uuid, …], note? }` → 201, the stock take |
| `GET /api/stock-takes/:id` | `stock_take.count` | The stock take with its lines: batch (number, expiry, medicine), `countedQuantity`, `reason`, `systemQuantity`, `difference`, `differenceValue` (the last three `null` while COUNTING) |
| `PUT /api/stock-takes/:id/lines/:lineId` | `stock_take.count` | `{ countedQuantity, reason? }` → the stock take |
| `POST /api/stock-takes/:id/lines` | `stock_take.count` | `{ batchId }` → the stock take (A3) |
| `POST /api/stock-takes/:id/submit` | `stock_take.count` | → PENDING_APPROVAL |
| `POST /api/stock-takes/:id/approve` | `stock_take.approve` | → APPROVED, with the movements posted |
| `POST /api/stock-takes/:id/return` | `stock_take.approve` | `{ comment }` → COUNTING (A5) |
| `POST /api/stock-takes/:id/cancel` | `stock_take.approve` | → CANCELLED (A8) |

Errors use the existing format: 400 per field (`countedQuantity`,
`lines.2.reason`), 403, 404 for an unknown stock take or line in the path,
409 when the status does not allow the step, 422 with the rule (BR08
`SAME_COUNTER`, BR03 on approval).

On screen: *Stock control & reports* gets a **Stock takes** tab: the list,
*New stock take* (manager), the count sheet, and the approval view.

## Scenario table

Every row becomes an automated test named in the last column; the rows with
a TC are also run by hand (by Duy Anh, plan week 6).

| ID | Kind | Scenario | Expected | Test |
|---|---|---|---|---|
| S01 | Normal | Manager opens a stock take for two medicines | COUNTING, `ST-…-0001`, one line per batch with sellable stock; system quantity hidden | UC09-01 |
| S02 | Normal | System 10, counted 8 with a reason; pharmacist submits, manager approves | One `ADJUSTMENT` −2 from the line, with the reason; batch 8; the stock take APPROVED with approver and time | UC09-02, TC-19 |
| S03 | Normal | Counted = system on every line | Approved; no movement posted | UC09-03, TC-39 |
| S04 | Edge | A sale of 3 between opening and counting; counted = shelf | System quantity taken at counting, so no difference | UC09-04, decision 15 |
| S05 | Edge | A sale of 3 between counting (system 10, counted 8) and approval | `ADJUSTMENT` −2; batch 10 − 3 − 2 = 5 | UC09-05, decision 15 |
| S06 | Error | A difference with no reason | Submit refused, the line named; stays COUNTING | UC09-06, TC-20 |
| S07 | Error | A line not counted | Submit refused, the line named | UC09-07 |
| S08 | Error | Count `-1`, `2.5`, empty | 400 on `countedQuantity`; nothing saved | UC09-08 |
| S09 | Error | A cashier lists, counts, submits or opens | 403 for each | UC09-09, TC-20, TC-28 |
| S10 | Error | A pharmacist opens, approves, returns or cancels | 403 for each | UC09-10 |
| S11 | Edge | The user who submitted approves; or the manager counts a line and someone else submits, then the manager approves (BR08) | 422 `SAME_COUNTER` both times; nothing posted; still PENDING_APPROVAL | UC09-11, TC-51, TC-20 |
| S12 | Edge | Approve while COUNTING; approve twice | 409; one set of movements only | UC09-12 |
| S13 | Edge | Count or add a line after submit | 409 | UC09-13 |
| S14 | Error | System 10, counted 2; 5 sold after counting, so −8 would go below zero | 422 (BR03) naming the line; nothing posted | UC09-14, A6 |
| S15 | Normal | Manager returns it to counting with a comment | COUNTING; counts kept; comment in the note | UC09-15, A5 |
| S16 | Normal | Manager cancels | CANCELLED; nothing posted | UC09-16, A8 |
| S17 | Normal | Counter adds a batch the book holds at 0 and counts 3 | Line added; on approval `ADJUSTMENT` +3 | UC09-17, A3 |
| S18 | Invariant | After S02, S05, S17 | For every batch, cached quantities = sum of movements (`findLedgerMismatches` finds nothing) | UC09-18, BR05 |
