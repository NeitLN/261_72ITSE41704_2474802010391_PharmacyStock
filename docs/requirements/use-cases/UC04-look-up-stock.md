# UC04 — Look up stock and batch history

| | |
|---|---|
| **Owner** | Võ Việt Tiến (A) |
| **Priority** | Must |
| **Primary actor** | Manager, Pharmacist, Cashier |
| **Status** | Agreed — planned for week 6 (W06-A1, #46) |
| **Related rules** | BR02, BR05, DEC-07, DEC-08 (what counts as sellable) |
| **Requirements** | FR-10, FR-11 |

## Goal

Any member of staff can answer "how much of this medicine can we sell, in
which batches, and why is the number what it is?" — every quantity is
explained by its movements.

## Preconditions

- The user is signed in; every role holds `stock.view`.

## Postconditions

- No data are changed.

## Main flow

1. The user searches by code, name or category.
2. The system lists matching medicines with the **sellable** quantity: the sum
   of `qtySellable` over ACTIVE batches whose expiry date is after the business
   date.
3. The user opens a medicine; the system lists its batches with number,
   expiry date, status and the quantity in each stock state (sellable,
   quarantine, pending destruction).
4. The user opens a batch; the system lists its movements in time order with
   type, signed quantity per state, resulting balance, user, time
   (Asia/Ho_Chi_Minh) and source document.

## Alternative and error flows

| ID | At step | Condition | What the system does |
|---|---|---|---|
| A1 (2a) | 2 | No match | An empty-state message |
| A2 (3a) | 3 | Expired, quarantined, pending-destruction or non-active stock | Shown with its state; not counted as sellable |
| A3 | 4 | A batch with a correction | The reversal shows which movement it reverses; the original stays visible |

## Functional requirements

| ID | Requirement | Test cases |
|---|---|---|
| FR-10 | Search medicines by code, name or category; show the sellable quantity and each batch with number, expiry, status and quantity per stock state. | TC-48 |
| FR-11 | Show the history of a batch: every movement with type, signed quantity, resulting balance, user, time and source document, in time order. | TC-24, TC-48 |

## Design notes

- The running balance is computed with a window function over
  `stock_movements` ordered by `occurredAt, id`, not stored, so it can never
  disagree with the ledger.
- The index `ix_stock_movements_batch_occurred` (initial migration) serves
  step 4; NFR-01 (first page in ≤ 1 s with 5,000 batches) is measured in
  TC-29.
