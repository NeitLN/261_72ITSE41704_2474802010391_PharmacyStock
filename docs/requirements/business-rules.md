# Business rules

A three-person team is expected to implement **6 or more** non-trivial business
rules. Ten are identified below: the five named in the catalogue entry for
topic 12, plus five that follow from the domain model.

Each rule must live in a service class that can be tested without a user
interface. **Rules inside button handlers are the single most common reason a
project scores in the Average band for design.**

| ID | Rule | Source | Owner | Tests |
|---|---|---|---|---|
| BR01 | **FEFO.** Dispensing draws from the available batch that expires first. When one request exceeds that batch, it continues into the next-earliest, producing one dispense line per batch. | Catalogue | Duy Anh (B) | TC-04, TC-05, TC-08 |
| BR02 | **No expired stock.** A batch past its expiry date can never be dispensed or sold, regardless of quantity on hand. | Catalogue | Duy Anh (B) | TC-06, TC-07, TC-08 |
| BR03 | **Stock never goes negative.** No operation may take a batch below zero, including two concurrent transactions competing for the last units. | Catalogue | Duy Anh (B) | TC-09, TC-10, TC-26 |
| BR04 | **Controlled medicines require a valid prescription reference.** Dispensing a medicine flagged as controlled without a prescription that passes the validity checks is refused. | Catalogue | Duy Anh (B) | TC-12, TC-13, TC-14 |
| BR05 | **Every stock change is recorded and reversible only by compensation.** Each movement writes one `StockMovement` row. Corrections post a new, opposite movement that references the original; no row is ever edited or deleted. | Catalogue | Tiến (A) | TC-16, TC-19, TC-25 |
| BR06 | **Unit conversion is explicit.** Quantities entered in a non-base unit are converted to base units before any stock arithmetic. A quantity that does not resolve to a whole number of base units is refused. | Model | Tiến (A) | _to be written_ |
| BR07 | **A prescription cannot be over-dispensed.** The sum of dispensed quantities for a prescription item can never exceed the quantity prescribed, across any number of visits. | Model | Duy Anh (B) | _to be written_ |
| BR08 | **A stock take is approved by someone other than the counter.** Posting adjustments requires an approver different from the person who counted, and every discrepancy line carries a reason. | Model | Minh (C) | TC-19, TC-20 |
| BR09 | **Prices are effective-dated.** A sale is valued at the price in force on the day of the sale. Changing a price never alters the value of a past sale or a past report. | Model | Tiến (A) | _to be written_ |
| BR10 | **An expired prescription cannot be dispensed.** A prescription past its valid-until date is refused, separately from the batch expiry check in BR02. | Model | Duy Anh (B) | _to be written_ |

## Invariants worth testing directly

These are properties that must hold at all times, not single operations. They
are the strongest evidence of a correct implementation.

1. **Ledger balance.** For every batch, `quantityOnHand` equals the sum of its
   `StockMovement.quantityDelta`. Any drift means a code path changed stock
   without recording it.
2. **No negative stock, ever.** No `Batch.quantityOnHand` is below zero at any
   point, under any sequence of operations.
3. **Dispensed never exceeds prescribed.** For every `PrescriptionItem`, the
   sum of its dispense-line quantities is at most `quantityPrescribed`.
4. **Returned never exceeds sold.** For every `SaleLine`, the sum of its
   return-line quantities is at most the quantity sold.

## Rules still to be settled

Five of the rules above depend on decisions the team has not yet made. They are
listed in [`../README.md`](../README.md) and must be settled in Week 2:

- **BR02** — whether a batch expiring exactly on the transaction date is usable.
- **BR03** — whether a shortage rejects the whole request or allows a partial dispense.
- **BR04** — which fields and statuses make a prescription reference valid.
- **BR01** — how a tie is broken between two batches with the same expiry date.
- Return disposition — which stock state returned medicines enter, and whether they may be dispensed again.

Until each is settled, the corresponding test cases cannot be given an expected
result and are marked *(decision)* in
[`../../tests/manual/test-cases.md`](../../tests/manual/test-cases.md).
