# UC11 — Review expiry alerts, batch status and quarantined stock

| | |
|---|---|
| **Owner** | Võ Hoàng Minh (C) |
| **Priority** | Must (assessing returns and recording destruction are Should) |
| **Primary actor** | Manager |
| **Status** | Specified |
| **Related rules** | BR02, BR03 (via the ledger), BR05, BR11 |
| **Requirements** | FR-35, FR-36, FR-48, FR-46 *(S)*, FR-47 *(S)*, FR-39 |
| **Decisions** | DEC-01 (expiry boundary), DEC-04 (quarantine, pending destruction, destroyed), DEC-07 (batch status), decision 16 (one unresolved expiry alert per batch) |

## Goal

The manager sees which batches expire soon, so they can be used first or
returned to the supplier in time, and which have expired, so they are taken
off sale with a record. The manager can also take a batch out of circulation
(on hold, recalled, rejected), and decide what happens to goods customers
returned. Nothing is recorded as destroyed until it actually is. Sources: S1
("periodic inspection for expiration dates and removal of outdated stock";
recalled products "stored separately") and S2 items 9.2–9.4 in
[`../sources.md`](../sources.md).

## Preconditions

- The manager holds `alert.manage` (expiry list and alerts) and
  `batch_status.manage` (write-off, batch status, assessment, destruction).

## Postconditions

- **Write-off:** one `WRITE_OFF` movement moves the batch's whole sellable
  quantity to pending destruction, with the reason and the user; the batch's
  expiry alert is resolved. The stock is **not** recorded as destroyed.
- **Batch status change:** the batch has its new status, reason, user and
  time; no movement is posted; stock-level alerts for the medicine are
  re-evaluated (FR-33).
- **Assessment (S):** a `RELEASE` or `REJECT` movement for the returned
  quantity, and the return line marked RELEASED or REJECTED with user, time
  and note.
- **Destruction (S):** a `DESTROY` movement removes the quantity from pending
  destruction.
- **Failure:** nothing changes.

## Definitions (DEC-01, decision 10)

- A batch is **expired** when its expiry date is on or before the business
  date (Asia/Ho_Chi_Minh). Expiry is computed, not a batch status.
- A batch is **expiring soon** when business date < expiry date ≤ business
  date + the medicine's `expiryAlertDays` (default 90).
- Only batches with sellable stock appear in the lists and raise alerts.

At the start of each business day the system raises at most one unresolved
EXPIRING_SOON or EXPIRED alert per batch (decision 16): when a batch passes
its expiry date the EXPIRING_SOON alert is resolved and an EXPIRED one raised.
BR02 does not depend on this run; issuing compares the expiry date with the
business date directly.

## Main flow — expiry and write-off

1. The manager opens *Stock control → Expiry*.
2. The system shows *Expired* and then *Expiring soon*, by expiry date: medicine,
   batch number, expiry date, days left or days since expiry, sellable
   quantity, value at unit cost, batch status (FR-35).
3. The manager selects an expired batch and chooses *Write off*.
4. The system shows the quantity that will move to pending destruction and
   asks for a reason.
5. The manager confirms.
6. In one `StockLedger` transaction the system locks the medicine and the
   batch, posts one `WRITE_OFF` movement of the whole sellable quantity
   (sellable → pending destruction), and resolves the batch's expiry alert
   (FR-36).
7. The system shows the batch with sellable 0 and the quantity pending
   destruction.

## Alternative and error flows

| ID | At step | Condition | What the system does | Ends in |
|---|---|---|---|---|
| A1 | 2 | Nothing expired or expiring | "No batch with stock expires within its alert window" | End |
| A2 | 2 | The manager acknowledges an expiry alert instead | ACKNOWLEDGED with user and time | Step 2 |
| A3 | 3 | The batch is not expired | *Write off* is not offered; a direct API call is refused: "Only an expired batch can be written off" | Step 2 |
| A4 | 4 | The reason is empty | Error on the reason field | Step 4 |
| A5 | 6 | The sellable quantity is already 0 (issued since the page loaded) | Refused: "Nothing left to write off"; the alert is resolved | Step 2 |
| A6 | 6 | The database fails part-way | Everything rolls back | Failure |
| A7 | any | The user lacks the permission (Pharmacist, Cashier) | 403 from the service (TC-28) | Failure |

## Sub-flow — change a batch's status (FR-48, DEC-07)

1. From the expiry list or the batch view (UC04), the manager chooses
   *Change status* on a batch.
2. The system offers ACTIVE, ON_HOLD, RECALLED or REJECTED and asks for a
   reason.
3. The manager chooses a status, gives the reason and confirms.
4. The system records status, reason, user and time on the batch and
   re-evaluates stock-level alerts for the medicine. A batch that is not
   ACTIVE is left out of FEFO, sales and the sellable quantity from that
   moment (TC-60).

A reason is required for every change, including back to ACTIVE.

## Sub-flow — assess a quarantined return (FR-46, Should)

1. The manager opens *Stock control → Quarantine*.
2. The system lists return lines in PENDING_ASSESSMENT: medicine, batch,
   expiry, quantity, return date and reason, and whether the medicine is
   controlled.
3. The manager chooses *Release* or *Reject* with a note.
4. *Release* is allowed only if the medicine is not controlled, the batch is
   not expired, and the manager confirms the packaging is intact and the
   storage credible; then a `RELEASE` movement moves the quantity from
   quarantine to sellable stock. *Reject* posts a `REJECT` movement from
   quarantine to pending destruction. Either way the return line records the
   outcome, user, time and note, in one transaction.

A release that fails a condition is refused with the reason (BR11); the item
stays in quarantine.

## Sub-flow — record destruction (FR-47, Should)

1. The manager opens the stock pending destruction, selects a batch and
   enters the quantity destroyed, the date, the method (e.g. returned to the
   supplier, destroyed by a licensed contractor) and the witness.
2. The system posts a `DESTROY` movement for that quantity. Until then the
   stock is shown as pending destruction, never as destroyed.

## Functional requirements

| ID | Requirement (short form) | Test cases |
|---|---|---|
| FR-35 | List batches with stock expiring within the alert window and already expired, with quantity and days remaining. | TC-22 |
| FR-36 | Write off an expired batch with a reason: a WRITE_OFF movement to pending destruction, not recorded as destroyed. | TC-56 |
| FR-48 | Set a batch ACTIVE, ON_HOLD, RECALLED or REJECTED with a reason; a non-ACTIVE batch is excluded from FEFO, sales and the sellable quantity. | TC-60 |
| FR-46 *(S)* | Assess a quarantined return: release only if not controlled, not expired, packaging intact and storage credible, or reject to pending destruction, with user and time. | TC-61 |
| FR-47 *(S)* | Record destruction (date, method, witness) as a DESTROY movement; until then shown as pending destruction. | TC-61 |
| FR-39 | Permission checked in the service on every request. | TC-28, TC-53 |

TC-22 checks the window boundary: a batch expiring on the business date, the
day after, the last day of the window and the day after it, and one checked
at 23:30 and 00:30 Asia/Ho_Chi_Minh.

## Open questions

1. **Destruction record (FR-47):** no table holds date, method and witness.
   Options: put them in the `DESTROY` movement's reason text, or add a
   `destruction_records` table (schema change, Tiến). Recommend the table if
   FR-47 is built.
2. **Write-off of part of a batch** (e.g. damaged boxes before expiry) is not
   in FR-36; damage found in a count goes through UC09.
3. **Quarantined goods of an expired batch** can only be rejected (release
   requires not expired); the quarantine list should flag them.
