# UC06 — Dispense against a prescription

| | |
|---|---|
| **Owner** | Bùi Duy Anh (B) |
| **Priority** | Must |
| **Primary actor** | Pharmacist |
| **Status** | Draft — not built yet (issues #41, #42) |
| **Related rules** | BR01, BR02, BR03 (via the ledger), BR04, BR07, BR10 |
| **Requirements** | FR-16, FR-17, FR-18, FR-19, FR-20, FR-21, FR-22, FR-23, FR-45 |
| **Decisions** | DEC-01 (expiry boundary), DEC-02 (shortage), DEC-03 (valid prescription), DEC-05 (only the hand-over moves stock), DEC-07 (batch order) |

## Goal

When a patient comes to collect a verified prescription, the pharmacist hands
over the right batches — earliest expiry first, never expired, never more
than prescribed — so each visit is traceable batch by batch and the shelf
never goes negative.

## Preconditions

- The pharmacist is signed in; the role holds `dispense`.
- The prescription is VERIFIED or PARTIALLY_DISPENSED with quantity still
  outstanding on at least one item (UC05, FR-44).
- The business date is not after the prescription's `validUntil` (BR10).

## Postconditions

- **Success:** one dispensing per confirmed hand-over: one dispense line per
  batch used, one `DISPENSE` movement per line, the item's dispensed quantity
  raised, and the prescription set to PARTIALLY_DISPENSED or FULLY_DISPENSED
  (FR-22) — all in **one transaction**.
- **Failure:** nothing is saved and no quantity changes — no dispense line,
  movement or status change.

## Main flow

1. The pharmacist opens *Dispensing*, picks a VERIFIED prescription and sees
   each item with quantity prescribed, already dispensed and outstanding.
2. The system proposes eligible batches per item in FEFO order (BR01, DEC-07)
   and flags any batch that expires within the alert window or before the end
   of the days of use, showing the days left (FR-16).
3. The pharmacist enters the quantity for each item and confirms the hand-over;
   the request carries a fresh client-generated request ID (FR-23).
4. The system re-checks the prescription (VERIFIED or PARTIALLY_DISPENSED,
   DEC-03 valid, within `validUntil`), the per-item outstanding quantity
   (BR07) and the sellable quantity (A3–A7).
5. In one `StockLedger` transaction the system locks the prescription items
   and the eligible batches, stores the dispensing with the request ID, posts
   one `DISPENSE` movement per batch line and updates each item's dispensed
   quantity and the prescription status.
6. The system shows the dispensing with one line per batch used and each
   item's dispensed and outstanding quantities.

## Alternative and error flows

| ID | At step | Condition | What the system does | Ends in |
|---|---|---|---|---|
| A1 | 4 | The prescription is RECEIVED (never verified), fails a DEC-03 check, or a non-OTC medicine has no valid prescription behind it (BR04) | Refused with the rule; stock unchanged | Step 1 |
| A2 | 4 | The business date is after `validUntil` (BR10) | Refused; stock unchanged | Step 1 |
| A3 | 4 | A batch is expired, expires on the business date (DEC-01), holds nothing sellable, or is on hold, recalled or rejected | Skipped silently for FEFO; an expired-only request is refused (BR02) | Step 2 or Failure |
| A4 | 4 | The sellable quantity is lower than requested (BR03) | Refused, showing the sellable quantity; nothing changes (FR-18) | Step 3 |
| A5 | 4 | The pharmacist confirms a smaller quantity with the treatment assessment and note (DEC-02) | Issues the smaller quantity, keeps the rest outstanding, sets PARTIALLY_DISPENSED | Step 6 |
| A6 | 4 | The request would push an item's total dispensed above the quantity prescribed (BR07) | Refused on that item's quantity; nothing changes | Step 3 |
| A7 | 5 | The same request ID arrives again (FR-23) | Returns the first result; nothing changes a second time | Step 6 |
| A8 | 5 | The same request ID arrives with different content | Refused; nothing changes | Failure |
| A9 | 3 | The pharmacist cancels the draft with a reason before confirming (FR-45) | No movement, no reservation, quantities unchanged | Step 1 |
| A10 | 5 | The database fails part-way, or a concurrent visit takes the last units first | Everything rolls back; exactly one visit wins, the other is refused as in A4 (never negative, never 500) | Step 3 or Failure |
| A11 | 1 | The user lacks `dispense` (Cashier) | 403 from the service, also when the API is called directly | Failure |

## Functional requirements

| ID | Requirement | Test cases |
|---|---|---|
| FR-16 | Select eligible batches by FEFO with one dispense line per batch, warning with the days left when a batch expires within the alert window or before the end of the days of use. | TC-04, TC-05, TC-57, TC-60 |
| FR-17 | Never issue from a batch whose expiry is on or before the business date. | TC-06, TC-07, TC-08 |
| FR-18 | On shortage refuse the line showing the sellable quantity and change nothing; a smaller quantity only on resubmission with treatment confirmation and a note, keeping the outstanding quantity. | TC-09, TC-10, TC-26 |
| FR-19 | Dispense a non-OTC medicine only against a VERIFIED prescription passing every DEC-03 check. | TC-12, TC-13, TC-14, TC-58 |
| FR-20 | Refuse dispensing that would push an item's total dispensed above the quantity prescribed. | TC-37, TC-54 |
| FR-21 | Refuse dispensing after the computed valid-until date, checked again at every visit. | TC-38 |
| FR-22 | After each dispensing set the status to PARTIALLY_DISPENSED or FULLY_DISPENSED and show dispensed and outstanding per item. | TC-37 |
| FR-23 | Carry a request ID stored with its result in the same transaction; a repeat ID returns the first result, the same ID with different content is refused. | TC-18, TC-27 |
| FR-45 | Move stock only at the confirmed hand-over; entering or drafting moves and reserves nothing, a cancelled draft leaves stock unchanged. | TC-59 |

## Open questions

- After hand-over, a return or correction belongs to UC08; whether a
  FULLY_DISPENSED prescription can ever be dispensed against again (beyond a
  return flow) is not stated anywhere — assumed no.
- The slip or label the patient receives at hand-over has no specified
  content; assumed outside this use case.
