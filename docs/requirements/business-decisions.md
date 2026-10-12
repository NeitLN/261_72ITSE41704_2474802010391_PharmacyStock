# Business decisions

The business questions the topic catalogue does not answer, and what the team
decided, so that every requirement and test case has one expected result.
Source: Proposal v1.1, Appendix D (Tables D.1 and D.2), submitted 11/10/2026.

The decisions were reviewed by a practising pharmacist in week 4 (an informal,
recorded conversation; the reviewer is a relative of the team leader). The
written summary is in
[`pharmacist-review-week4.md`](pharmacist-review-week4.md). A point marked
**open** stays a team assumption until the reviewer confirms it, and is
reported as such in the Final Report.

## Decisions adopted (Table D.1)

| ID | Question | Decision | Traced to |
|---|---|---|---|
| DEC-01 | Expiry date boundary | Expiry is stored as a full date; a label with only month and year means the last day of that month. As a pharmacy policy, stricter than the label, a batch is usable only while its expiry date is **after** the business date, so it is not issued on its expiry day. A batch that expires within the expiry-alert window, or before the end of the prescribed days of use, is issued only with a warning showing the days left. | BR02, FR-16, FR-17, TC-07, TC-57 |
| DEC-02 | Shortage | If the sellable quantity is lower than requested, the line is refused and the sellable quantity is shown; nothing is issued automatically. The pharmacist may issue less only after confirming that the effect on the treatment was assessed and discussed with the customer; dispensed and outstanding quantities are kept per item and the prescription becomes PARTIALLY_DISPENSED. | BR07, FR-18, FR-22, TC-09 |
| DEC-03 | Valid prescription | The prescriber is active with a licence number; the patient's name, date of birth or age and address are present (for a child under 72 months also age in months, weight and the accompanying adult); every item has medicine, strength, quantity, dose, route and days of use; the issue date is not in the future; the business date is not after the valid-until date (issue date + 5 days, computed, not editable); the status allows dispensing and the item has quantity outstanding. Passing these checks is not enough: the pharmacist must also review the prescription and mark it VERIFIED. | BR04, BR10, FR-13, FR-14, FR-21, FR-44, TC-13, TC-38, TC-47, TC-58 |
| DEC-04 | Returned goods | A returned item never goes straight back to sellable stock. It enters the quarantine of its original batch as PENDING_ASSESSMENT. A manager may release it (not controlled, not expired, packaging intact, storage credible) or reject it to "pending destruction"; it becomes "destroyed" only when a destruction record is made. | BR11, FR-28, FR-36, FR-46, FR-47, TC-50, TC-56, TC-61 |
| DEC-05 | Dispensing vs. sale | Stock leaves once: at the confirmed hand-over of a dispensing, or at the confirmed payment of an over-the-counter sale. Entering a prescription or preparing a draft moves nothing, and a cancelled draft or cart leaves stock unchanged. Billing a handed-over dispensing creates sale lines without a second movement; goods given back after hand-over follow DEC-04. | FR-45, UC06, UC07, TC-59 |
| DEC-06 | Stock movement report | Called a stock movement report. Net quantity issued = dispensed + sold − returns released to sellable stock, per medicine and period; a billed dispensing counts once, and returns still in quarantine are not deducted. It is a quantity, not revenue or inventory turnover; write-offs, destructions and adjustments are shown separately; cost comes from the batch unit cost. | UC12, FR-37, TC-23 |
| DEC-07 | Tie between batches | Only ACTIVE, unexpired batches with sellable quantity are candidates; batches on hold, recalled or rejected are excluded even if unexpired. Earliest expiry first; with the same expiry, the batch received earlier goes first, then the lower batch number. | BR01, FR-48, TC-60 |
| DEC-08 | Low-stock threshold | Each medicine has its own switch to turn low-stock monitoring on or off. LOW_STOCK is raised when the sellable quantity is above zero and at or below the reorder level, OUT_OF_STOCK when it is zero. The sellable quantity excludes expired, quarantined, non-active and pending-destruction stock. | FR-01, FR-33, TC-21, TC-63 |
| DEC-09 | Over-the-counter rules | The over-the-counter sale accepts only medicines classified OTC; every other medicine, controlled or not, needs a verified prescription. New medicines default to "prescription"; the manager sets OTC only from the classification on the approved registration information or label and records its source and date. Sales also apply BR01 and BR02. | BR04, FR-01, FR-25, TC-36 |
| DEC-10 | Performance targets | Thresholds, data volumes and the measuring method are those in NFR-01 to NFR-03 and NFR-13; two staff selling the same scarce medicine at the same time is covered by NFR-08 and TC-26, TC-54 and TC-62. | NFR-01 to 03, NFR-08, NFR-13, TC-62 |

## Outcome of the pharmacist review (Table D.2)

| ID | Reviewer's view (summarised) | Effect on the design | Status |
|---|---|---|---|
| DEC-01 | Agreed in part: the month/year rule is right; blocking on the expiry day must be stated as pharmacy policy; wants a warning for stock close to expiry | Policy stated; near-expiry warning added | Confirmed |
| DEC-02 | Agreed, with additions: do not simply issue what is left; partial supply needs an assessment of the treatment and a talk with the buyer; keep dispensed and outstanding | Confirmation step; outstanding quantity kept | Confirmed |
| DEC-03 | Not sufficient: patient, medicine, strength, dose and directions must also be checked; a record in the system is not yet dispensable; the 5 days must follow the regulation and not be extendable | Mandatory fields; pharmacist verification; validity computed and read-only | Confirmed |
| DEC-04 | Not agreed: returned goods may not be resold without assessment; quarantine first; "pending destruction" differs from "destroyed" | Quarantine, assessment and two-step destruction | Confirmed |
| DEC-05 | Agreed; preparing or entering is not a hand-over; cancellation must be defined | Confirmation is the only stock event; cancel rule | Confirmed |
| DEC-06 | Agreed with the formula; the name "turnover" was wrong | Renamed; only released returns deducted | Confirmed |
| DEC-07 | Agreed; quarantined, recalled and failed batches must be excluded | Batch status added | Confirmed |
| DEC-08 | Agreed; wants a separate on/off switch, low versus out of stock, and only sellable stock counted | Switch and two alert types | Confirmed |
| DEC-09 | Not agreed: blocking only controlled medicines is wrong; the sale must check that a medicine is classified OTC. Wants to read BR01 and BR02 first | OTC-only sale; default "prescription" | **Open**: review of BR01 and BR02 in week 5 |
| DEC-10 | Needs the concrete targets; two staff selling the same scarce medicine must be tested | NFR-13 and TC-62 added | **Open**: comment on the targets in week 5 |

## Technical decisions from the plan (decisions 10–18)

Recorded in [`../plan/00-tong-quan.md`](../plan/00-tong-quan.md) §8.2 and
settled by Proposal v1.1:

| # | Decision | Where it shows |
|---|---|---|
| 10 | Business dates use Asia/Ho_Chi_Minh | `Clock`; expiry and validity checks |
| 11 | Every issue of stock (dispensing and OTC sale) applies BR01 and BR02; OTC accepts only OTC medicines | DEC-09 |
| 12 | A sale is valued at the price in force on the sale date | BR09, `SaleLine.unitPrice` |
| 13 | Returning dispensed goods does not give back quantity outstanding on the prescription | UC08 specification |
| 14 | Returns are quarantined per quantity on the batch, with an assessment on the return line | `Batch.qtyQuarantine`, `ReturnLine.assessmentStatus` (DEC-04) |
| 15 | A stock take records counted − system quantity at counting time and waits in PENDING_APPROVAL | `StockTake.status`, `StockTakeLine.systemQuantity` |
| 16 | One unresolved stock-level alert per medicine, one unresolved expiry alert per batch | Partial unique indexes on `stock_alerts` |
| 17 | The same batch number delivered again tops up the batch if the expiry matches; otherwise the line is refused | `GoodsReceiptLine.batch` many-to-one; UC03 alternative flow 4c |
| 18 | Pack-unit conversion (BR06) is out of the Must scope; stock is entered and issued in base units | Could item |
