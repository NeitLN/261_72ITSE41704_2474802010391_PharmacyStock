# UC03 — Record a goods receipt

> **Exemplar.** This is the pattern for every use-case spec in the project.
> Where UC03 depends on a business decision that is still open, the text says
> so and does not assume an answer.

| | |
|---|---|
| **Owner** | Võ Việt Tiến (A) |
| **Priority** | Must |
| **Primary actor** | Manager |
| **Status** | Draft |
| **Related rules** | BR03 stock never negative (via the ledger), BR05 every stock change is recorded |
| **Depends on decisions** | QĐ 1 (how expiry dates are stored), QĐ 17 (same batch number delivered twice) |

## Goal

When a delivery arrives from a supplier, the manager records it so that each
delivered lot becomes a batch with its own expiry date and quantity. From
that moment the stock can be dispensed, and the pharmacy can always trace a
box back to the delivery it came from.

Permission names such as `receipt.create` are placeholders until the
access-control design (W04-C1) fixes the final list.

## Preconditions

- The manager is signed in and holds the permission `receipt.create`.
- The supplier exists and is active (UC02).
- Every medicine on the delivery note exists in the catalogue and is active (UC01).

## Postconditions

- **Success:** one goods receipt is stored with its lines. Each line has
  created (or added to) a batch, and one `RECEIPT` stock movement per line has
  increased that batch's quantity on hand. The receipt, its lines, the batches
  and the movements are saved in **one transaction**.
- **Failure:** nothing is saved — no receipt, no line, no batch change, no
  movement.

## Main flow

1. The manager opens *Suppliers & goods receipts* and chooses *New receipt*.
2. The system shows a form: supplier, supplier document number, received date
   (default today) and an empty list of lines.
3. The manager selects the supplier, enters the document number and the
   received date.
4. For each delivered lot, the manager adds a line: medicine, batch number,
   expiry date, quantity received (in the medicine's base unit) and unit cost.
5. The manager submits the receipt.
6. The system validates the header and every line (see A1–A5).
7. Within one transaction, the system:
   1. stores the goods receipt and its lines;
   2. creates a batch for each line, linked to the line and the medicine;
   3. posts one `RECEIPT` movement per line through `StockLedger`, which
      raises the batch's quantity on hand by the quantity received and
      records the user and the receipt as the source document.
8. The system shows the saved receipt with its reference, total cost and the
   batches created.

## Alternative and error flows

| ID | Branches at step | Condition | What the system does | Ends in |
|---|---|---|---|---|
| A1 | 6 | A required field is missing, a quantity is not a whole number greater than 0, or a unit cost is negative | Shows the error next to each invalid field; saves nothing | Step 4 |
| A2 | 6 | The supplier document number has already been recorded | Shows "This document has already been recorded" with a link to the existing receipt; saves nothing | Step 3 |
| A3 | 6 | A line's expiry date is on or before the received date | Shows the error on that line; saves nothing | Step 4 |
| A4 | 6 | The supplier or a medicine has been deactivated | Shows which one is inactive; saves nothing | Step 3 or 4 |
| A5 | 6 | A batch number already exists for the same medicine | **Depends on QĐ 17** — until it is decided, reject with a clear message | Step 4 |
| A6 | 7 | The database fails part-way through the transaction | Rolls back everything; shows "The receipt was not saved — try again"; logs the error | Failure |
| A7 | 1 | The signed-in user lacks `receipt.create` (e.g. a Cashier) | Refuses in the service layer, not only by hiding the menu item | Failure |

## Functional requirements

| ID | Requirement | Test cases |
|---|---|---|
| FR-03.1 | The system shall let a user with the `receipt.create` permission record a goods receipt consisting of a supplier, a supplier document number, a received date and one or more lines. | TC-01 |
| FR-03.2 | The system shall require each receipt line to state a medicine, a batch number, an expiry date, a quantity received as a whole number greater than 0, and a unit cost of 0 or more. | TC-02 |
| FR-03.3 | The system shall reject a receipt whose supplier document number has already been recorded, and shall leave stock unchanged. | TC-03 |
| FR-03.4 | The system shall reject a receipt line whose expiry date is not later than the received date. | TC-49 |
| FR-03.5 | The system shall increase the quantity on hand of each received batch by exactly the quantity received and record one `RECEIPT` stock movement per line, stating the user, the receipt and the quantity. | TC-01, TC-48 |
| FR-03.6 | The system shall save a goods receipt, its lines, its batches and its stock movements in a single transaction, so that a failure leaves no part of the receipt stored. | TC-25 |
| FR-03.7 | The system shall refuse to record a goods receipt for a user without the `receipt.create` permission. | TC-53 |
| FR-03.8 | The system shall keep recorded receipts, batches and movements after the application is restarted. | TC-24 |

TC-48, TC-49 and TC-53 are new test cases planned for week 4 (W04-C3).

## Open questions

1. **QĐ 1** — Is the expiry date entered as a full date or as month/year? If
   month/year, FR-03.4 compares against the last day of that month.
2. **QĐ 17** — May the same batch number be delivered again later? Flow A5
   and the unique constraint on (medicine, batch number) depend on the answer.
3. **New** — Is the supplier document number unique across **all** suppliers
   or only per supplier? Two suppliers could use the same numbering. The
   current schema makes it unique globally; FR-03.3 follows the schema until
   the team decides.
