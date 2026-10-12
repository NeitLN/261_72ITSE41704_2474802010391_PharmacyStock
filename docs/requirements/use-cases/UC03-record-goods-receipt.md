# UC03 — Record a goods receipt

> **Exemplar.** This is the pattern for every use-case spec in the project.

| | |
|---|---|
| **Owner** | Võ Việt Tiến (A) |
| **Priority** | Must |
| **Primary actor** | Manager |
| **Status** | Built (PR #99) — waiting for test runs by another member |
| **Related rules** | BR03 (via the ledger), BR05 |
| **Requirements** | FR-06, FR-07, FR-08, FR-09, FR-12 |
| **Decisions** | DEC-01 (expiry as a full date; month/year → last day), decision 17 (same batch number again) |

## Goal

When a delivery arrives from a supplier, the manager records it so that each
delivered lot becomes a batch with its own expiry date and quantity. From
that moment the stock can be issued, and the pharmacy can always trace a box
back to the delivery it came from.

## Preconditions

- The manager is signed in; the role holds `goods_receipt.create`.
- The supplier exists and is active (UC02).
- Every medicine on the delivery note exists and is active (UC01).

## Postconditions

- **Success:** one goods receipt is stored with its lines. Each line created a
  batch or topped up an existing one, and one `RECEIPT` movement per line
  raised that batch's sellable quantity. The receipt, lines, batches and
  movements are saved in **one transaction**.
- **Failure:** nothing is saved — no receipt, line, batch change or movement.

## Main flow

1. The manager opens *Suppliers & goods receipts → Goods receipts* and chooses
   *Record receipt*.
2. The system shows a form: supplier, supplier document number, receipt date
   (default today), note, and one empty line.
3. The manager selects the supplier and enters the document number and date.
4. For each delivered lot the manager adds a line: medicine, batch number,
   expiry date (a month/year label means the last day of that month), quantity
   in the base unit, and unit cost.
5. The manager submits the receipt.
6. The system validates the header and every line (A1–A6).
7. In one `StockLedger` transaction the system locks the medicines on the
   receipt, stores the receipt, and for each line finds or creates the batch,
   stores the line and posts one `RECEIPT` movement with the user and the
   receipt as source document.
8. The system shows the saved receipt with its total cost and each batch's
   sellable quantity.

## Alternative and error flows

| ID | At step | Condition | What the system does | Ends in |
|---|---|---|---|---|
| A1 | 6 | A required field is missing, a quantity is not a whole number ≥ 1, a unit cost is negative or has more than two decimals, or a date is not a real `YYYY-MM-DD` date | Error under each invalid field (`lines.N.field` for a line); nothing saved | Step 4 |
| A2 | 6 | The document number is already recorded **for this supplier** (4a) | Error under *Supplier document no.*; nothing saved, stock not added twice | Step 3 |
| A3 | 6 | A line's expiry date is on or before the receipt date, or the receipt date is in the future | Error on that field; nothing saved | Step 4 |
| A4 | 6 | The supplier or a medicine is deactivated (checked again after the lock) | Error on the supplier or the line's medicine; nothing saved | Step 3 or 4 |
| A5 | 7 | The batch number already exists for the medicine with **another** expiry date, or the batch is on hold, recalled or rejected (4c) | Error on that line; the whole receipt rolls back | Step 4 |
| A6 | 6 | The same medicine and batch number appear on two lines | Error on the second line | Step 4 |
| A7 | 7 | The database fails part-way (5a) | Everything rolls back; a clear message; the error is logged | Failure |
| A8 | 1 | The user lacks `goods_receipt.create` (Pharmacist, Cashier) | 403 from the service, also when the API is called directly | Failure |

The same batch number with the **same** expiry date tops up the existing batch
(decision 17).

## Functional requirements

| ID | Requirement | Test cases |
|---|---|---|
| FR-06 | Record a receipt with supplier, document number, receipt date and lines; each line creates or tops up a batch and posts one RECEIPT movement in the same transaction. | TC-01 |
| FR-07 | Refuse a line whose quantity is not a positive integer, whose unit cost is negative, whose expiry is not after the receipt date, or whose medicine or supplier is inactive. | TC-02, TC-46, TC-49 |
| FR-08 | Refuse a receipt whose document number is already recorded for the same supplier. | TC-03 |
| FR-09 | If any line or the database write fails, save no part of the receipt. | TC-25 |
| FR-12 | Write every stock change as exactly one movement; never edit or delete one. | TC-16, TC-19, TC-25 |

Automated coverage: `src/backend/test/goods-receipts.e2e-spec.ts` (UC03-01 to
UC03-14, including the mid-receipt rollback) and the ledger invariant check.

## Resolved questions

- Expiry stored as a full date (DEC-01).
- The same batch number delivered again: top up if the expiry matches,
  otherwise refuse (decision 17).
- Document numbers are unique **per supplier** (Proposal FR-08), enforced by
  the unique index `uq_goods_receipt_supplier_document`.
