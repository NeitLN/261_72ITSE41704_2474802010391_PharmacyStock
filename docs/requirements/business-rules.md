# Business rules

A three-person team is expected to implement **6 or more** non-trivial business
rules. Proposal v1.1 (Table 2.5) has eleven: the five named in the catalogue
entry for topic 12, and six from the domain analysis and the pharmacist review
— **8 Must, 2 Should, 1 Could**. The decisions behind them are in
[`business-decisions.md`](business-decisions.md).

Each rule lives in a domain or service class that can be tested without a user
interface. **Rules inside button handlers are the single most common reason a
project scores in the Average band for design.**

| ID | Rule | Pri. | Owner | Where | Tests |
|---|---|---|---|---|---|
| BR01 | **FEFO.** Dispensing and sales draw from the eligible batch that expires first; a request larger than that batch continues into the next one, one line per batch. Only ACTIVE batches with sellable quantity and an expiry date after the business date are eligible; batches on hold, recalled or rejected are skipped even if unexpired; ties go to the earlier receipt, then the lower batch number (DEC-07). Example: A holds 3 and expires first, B holds 8; issuing 7 takes 3 from A and 4 from B. | Must | Duy Anh (B) | `FefoAllocator`; eligible batches come from `StockLedger.lockEligibleBatches` | TC-04, 05, 08, 35, 60 |
| BR02 | **No expired stock.** A batch whose expiry date is on or before the business date is never dispensed or sold — a pharmacy policy stricter than the label; a month/year label means the last day of that month (DEC-01). A batch that expires within the alert window, or before the end of the prescribed days of use, is issued only with a warning showing the days left. | Must | Duy Anh (B) | `ExpiryPolicy` + `Clock` | TC-06, 07, 08, 57 |
| BR03 | **Stock never goes negative,** in any stock state, including when two transactions compete for the last units, also a sale against a dispensing. | Must | Tiến (A) ledger · Duy Anh (B) commands | `StockLedger.post` (built, #96) + CHECK constraints | TC-09, 10, 26, 55, 62 |
| BR04 | **Prescription-only medicines need a verified prescription.** A medicine that is not classified OTC (prescription or controlled) is issued only by a pharmacist against a prescription that passed the system checks and the pharmacist's verification (DEC-03); the over-the-counter sale accepts only medicines classified OTC (DEC-09). | Must | Duy Anh (B) | `PrescriptionsService`, `DispensingService` (partly: VERIFIED status and active prescriber only; full `PrescriptionValidator` in week 6) | TC-12, 13, 14, 36, 58 |
| BR05 | **Append-only ledger.** Every stock change writes exactly one stock movement; movements are never edited or deleted, and a correction is a new opposite movement that references the original. | Must | Tiến (A) | `StockLedger` (built, #96); trigger and CHECKs in the initial migration (#94) | TC-16, 19, 25 + invariant |
| BR06 | **Pack-unit conversion.** Quantities entered in a pack unit are converted to base units before any stock arithmetic; a quantity that is not a whole number of base units is refused. | Could | Tiến (A) | — | — |
| BR07 | **No over-dispensing.** The total dispensed for a prescription item, over any number of visits, never exceeds the quantity prescribed; a partial supply records the outstanding quantity (DEC-02). | Must | Duy Anh (B) | `DispensingService` + CHECK on `prescription_items` | TC-09, 37, 54 |
| BR08 | **Two-person stock take.** A stock take is approved by a user other than the one who counted it, and every discrepancy carries a reason. | Should | Minh (C) | stock-take service | TC-20, 51 |
| BR09 | **Effective-dated prices.** A sale is valued at the price in force on the sale date; a price change never alters a past sale or report. | Should | Tiến (A) | `PriceBook` (built for current prices, #97); scheduling in UC13 | TC-40, 41 |
| BR10 | **Prescription validity.** A prescription is dispensed only within issue date + 5 days, computed by the system, never edited or extended, and checked again at every visit (separate from BR02). | Must | Duy Anh (B) | `PrescriptionsService`, `DispensingService` + `Clock` | TC-38 |
| BR11 | **Returns go to quarantine.** Returned goods never go straight back to sellable stock: they enter quarantine as PENDING_ASSESSMENT. Only an approved assessment releases them; goods that fail are "pending destruction" until a destruction record is made (DEC-04). | Must | Duy Anh (B) return · Minh (C) assessment | return service; RETURN/RELEASE/REJECT movements | TC-50, 61 |

## Invariants tested directly

Properties that hold at all times, not single operations
([`../design/stock-ledger.md`](../design/stock-ledger.md)):

1. **Ledger balance.** For every batch and stock state, the cached quantity
   equals the sum of its movement deltas — `findLedgerMismatches()` returns
   nothing.
2. **No negative stock** in any state (CHECK constraints plus BR03 in the
   ledger).
3. **Dispensed ≤ prescribed** for every prescription item (CHECK plus BR07).
4. **Returned ≤ sold** for every sale line (CHECK plus FR-27).
5. **Only sellable stock of an ACTIVE, unexpired batch is ever issued.**

Money is stored as PostgreSQL `numeric`, read back as strings, summed in whole
cents, and copied onto each transaction line.
