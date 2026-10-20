# Manual test cases

The 63 planned test cases of Proposal v1.1, Appendix C, plus TC-64 (added
20/10/2026, #129). Purpose and expected result are as submitted; steps are
refined by the owner before the first run.
The first manual runs were recorded on 14/10/2026 (TC-01, 02, 03, 45, 46), 18/10/2026 (TC-42, 43) and 20/10/2026 (TC-04, 06, 09, 47, 58).
Automated tests exist for the built use cases (column *Automated*), but a
manual run by someone other than the author is what closes a feature issue
(`docs/plan/00-tong-quan.md` §6.6).

Every run is recorded in [`runs.md`](runs.md) (one line per run: date, runner,
commit, actual result, verdict, bug link). This table only shows the latest
verdict. Evidence files go in `evidence/`, named after the test case.

- `Result`: `Pass`, `Fail`, `Not run`, `Blocked`.
- **Author** writes and refines the case; **Runner** runs it. The runner is
  never the author of the feature: Tiến's cases are run by Minh, Duy Anh's by
  Tiến, Minh's by Duy Anh (plan, week 6).
- *(S)* = tests a Should item; run only if the item is built.
- Business decisions: [`../../docs/requirements/business-decisions.md`](../../docs/requirements/business-decisions.md).

| ID | Week | Covers | Purpose | Data / steps | Expected result | Author | Runner | Automated | Result |
|---|---|---|---|---|---|---|---|---|---|
| TC-01 | 5 | UC03 | Receive a valid batch | Active medicine and supplier; record a receipt of 10 units of a new batch | Sellable stock +10; the receipt, its line, the batch and one RECEIPT movement are linked | Tiến | Minh | UC03-01 | Pass |
| TC-02 | 5 | UC03 | Invalid received quantity | Quantity 0, −1, `ten`, 2.5 | Error under the quantity field; nothing saved | Tiến | Minh | UC03-03 | Pass |
| TC-03 | 5 | UC03 | Duplicate supplier document | Record HD-0001 for supplier X, then again | Refused under *Supplier document no.*; stock not increased twice | Tiến | Minh | UC03-06 | Pass |
| TC-04 | 5 | UC06 / BR01 | FEFO across two batches | A = 3 (expires first), B = 8; dispense 7 | A = 0, B = 4; two dispense lines | Duy Anh | Tiến | — | Pass |
| TC-05 | 6 | UC06 / BR01 | Skip a batch with no stock | Earliest batch holds 0, next holds 5; dispense 2 | Taken from the next batch | Duy Anh | Tiến | — | Not run |
| TC-06 | 5 | UC06 / BR02 | Only an expired batch available | Single batch, expiry before the business date | Refused; nothing changes | Duy Anh | Tiến | — | Pass |
| TC-07 | 6 | UC06 / BR02 | Issue on the exact expiry day | Batch expiry = business date | Refused — pharmacy policy (DEC-01) | Duy Anh | Tiến | — | Not run |
| TC-08 | 6 | UC06 / BR01 | Expired batch A, valid batch B | A expired, B in date with enough | Only B used | Duy Anh | Tiến | — | Not run |
| TC-09 | 5 | UC06 / BR03, BR07 | Shortage | 4 sellable, 5 requested; then 4 submitted with the treatment confirmation | First refused showing 4 sellable; then 4 issued, 1 outstanding (DEC-02) | Duy Anh | Tiến | — | Pass |
| TC-10 | 6 | UC06 / BR03 | Issue the exact remaining quantity | 4 sellable, 4 requested | Succeeds; stock 0 | Duy Anh | Tiến | BR03-U1 (ledger) | Not run |
| TC-11 | 6 | UC06 | Invalid quantity | 0, negative | Refused; no change | Duy Anh | Tiến | — | Not run |
| TC-12 | 6 | UC06 / BR04 | Non-OTC medicine without a prescription | Dispense a controlled medicine with no prescription | Refused, field named | Duy Anh | Tiến | — | Not run |
| TC-13 | 6 | UC06 / BR04 | Prescription not VERIFIED or missing dose/strength | Prescription in RECEIVED, or an item without dose | Refused; stock unchanged | Duy Anh | Tiến | — | Not run |
| TC-14 | 6 | UC06 / BR04 | Valid prescription | VERIFIED prescription passing every DEC-03 check | Dispensed and traced to the prescription | Duy Anh | Tiến | — | Not run |
| TC-15 | 7 | UC07 | Bill a dispensing | Bill a handed-over dispensing | Stock falls only once | Duy Anh | Tiến | — | Not run |
| TC-16 | 7 | UC08 / BR05 | Return 2 of 5 sold | Sale of 5; return 2 with a reason | RETURN movement into quarantine; original sale untouched; history kept | Duy Anh | Tiến | — | Not run |
| TC-17 | 7 | UC08 | Return more than returnable | Sold 5, returned 2; return 4 more | Refused | Duy Anh | Tiến | — | Not run |
| TC-18 | 7 | UC08 | Duplicate return submission | Submit the same return (same request ID) twice | No second return | Duy Anh | Tiến | — | Not run |
| TC-19 | 6 | UC09 / BR05 | Stock take with a discrepancy | System 10, counted 8, reason given; approve | ADJUSTMENT −2; history kept | Minh | Duy Anh | — | Not run |
| TC-20 | 6 | UC09 / BR08 | Difference without reason, or wrong role | Leave the reason blank; or a Cashier submits | Refused | Minh | Duy Anh | — | Not run |
| TC-21 | 6 | UC10 | Low-stock thresholds | Reorder level 10: sellable 11, 10, 9 and 0 | LOW_STOCK at and below 10, OUT_OF_STOCK at 0 (DEC-08) | Minh | Duy Anh | — | Not run |
| TC-22 | 7 | UC11 | Expiry window boundaries | Batches before, inside and after the 90-day window | Correct list and quantities | Minh | Duy Anh | — | Not run |
| TC-23 | 7 | UC12 | Two periods with sales, returns and releases | Seeded transactions over two months | Net quantity issued matches a hand calculation (DEC-06) | Minh | Duy Anh | — | Not run |
| TC-24 | 8 | UC04 | Restart application and database | Record a receipt and an issue; restart the API and the container | No data lost | Tiến | Minh | — | Not run |
| TC-25 | 8 | UC03 / UC06 | Failure in the middle of a transaction | A receipt whose second line fails inside the transaction | Full rollback; no partial document | Tiến | Minh | UC03-08, BR03-01 | Not run |
| TC-26 | 8 | UC06 / BR03 | Two sessions request 4 of the last 5 | Two concurrent dispensings, 20 runs | Only one succeeds each time; never negative | Duy Anh | Tiến | BR03-02 (ledger) | Not run |
| TC-27 | 8 | UC06 | Resubmit the same dispensing | Same request ID twice | No duplicate | Duy Anh | Tiến | — | Not run |
| TC-28 | 8 | Access | Cashier calls a manager function | Cashier sends a supplier or catalogue change to the API | Refused in the business layer (403) | Minh | Duy Anh | UC02-08, UC01-09 | Not run |
| TC-29 | 8 | NFR-01, 02, 13 | Measure search, report and counter time | Large data set in a separate database; 10 runs, median | Within NFR thresholds; machine recorded | Tiến | Minh | — | Not run |
| TC-30 | 8 | NFR-09 *(S)* | Backup and restore | `pg_dump`, restore into an empty database | Balances match | Tiến | Minh | — | Not run |
| TC-31 | 9 | UC03–08 | End-to-end flow | Receive → prescription → dispense → bill → return → report | Every step and report consistent | Tiến | Minh | — | Not run |
| TC-32 | 9 | NFR-03 | Two outside users perform tasks | One-page task sheet: 2-line receipt; 2-item dispensing | Each ≤ 5 minutes with at most one help request | Minh | Duy Anh | — | Not run |
| TC-33 | 9 | NFR-10 | Fresh clone on another machine | Follow the README only | Runs with seed data within 30 minutes | Minh | Duy Anh | — | Not run |
| TC-34 | 10 | Submission | Re-download files, open links | PDF, DOCX, repository link, run guide after upload | Files open; links accessible | Tiến | Minh | — | Not run |
| TC-35 | 7 | UC07 / BR01–02 | Sale uses FEFO and skips expired batches | OTC medicine with an expired and two valid batches | Correct batches used | Duy Anh | Tiến | — | Not run |
| TC-36 | 7 | UC07 / BR04 | Prescription and controlled medicine in a sale | Add a prescription-only and a controlled medicine to an OTC sale | Both refused (DEC-09) | Duy Anh | Tiến | — | Not run |
| TC-37 | 6 | UC06 / BR07 | Dispense over two visits beyond prescribed | Prescribed 10; dispense 6, then 6 | Second visit refused; status correct | Duy Anh | Tiến | — | Not run |
| TC-38 | 6 | UC06 / BR10 | Validity day 5 and day 6 | Dispense on issue date + 5 and + 6; try to edit valid-until | Day 5 accepted, day 6 refused; field read-only | Duy Anh | Tiến | — | Not run |
| TC-39 | 6 | UC09 | Stock take with no differences | Counted = system for every line | Approved; no adjustment posted | Minh | Duy Anh | — | Not run |
| TC-40 | 8 | UC13 / BR09 *(S)* | Sale after a scheduled price change | Price changes tomorrow; sell tomorrow | Valued at the new price | Tiến | Minh | — | Not run |
| TC-41 | 8 | UC13 / BR09 *(S)* | Price change after a sale | Sell, then change the price | Past sale and report unchanged | Tiến | Minh | UC01-05 (price history) | Not run |
| TC-42 | 5 | UC16 | Wrong password; locked account | Sign in with a wrong password; with a locked user | Generic message; refused | Minh | Duy Anh | UC16-03, UC16-05 | Pass |
| TC-43 | 5 | UC16 | Menu by role and session expiry | Sign in as each role; let the session expire | Correct menu; redirect when expired | Minh | Duy Anh | UC16-01, UC16-08, UC16-09 | Pass |
| TC-44 | 8 | UC15 *(S)* | Create user, change role, lock | As manager | Applied; audit entry written | Minh | Duy Anh | — | Not run |
| TC-45 | 5 | UC01 | Duplicate medicine code | Add `Para500` when `PARA500` exists | Refused on the code field | Tiến | Minh | UC01-02 | Pass |
| TC-46 | 5 | UC01 / UC02 | Deactivated medicine or supplier in a receipt | Deactivate, then use it on a receipt | Refused | Tiến | Minh | UC03-09 | Pass |
| TC-47 | 5 | UC05 | Multi-item prescription; missing patient, strength or dose | Save a complete prescription; then omit each field | Saved; or field errors | Duy Anh | Tiến | — | Pass |
| TC-48 | 6 | UC04 | Lookup and batch history | Search; open a medicine with expired and valid batches; open a batch | Sellable vs expired correct; history ordered with running balance | Tiến | Minh | — | Not run |
| TC-49 | 7 | UC14 | Duplicate prescriber licence | Quick-create a prescriber with an existing licence | Refused | Duy Anh | Tiến | — | Not run |
| TC-50 | 7 | UC08 / BR11 | Return of an unexpired item | Return 1 unit | Goes to quarantine, not sellable | Duy Anh | Tiến | — | Not run |
| TC-51 | 8 | UC09 / BR08 *(S)* | Counter approves own stock take | Same user counts and approves | Refused | Minh | Duy Anh | — | Not run |
| TC-52 | 7 | UC07 | Billing creates no stock movement | Bill a dispensing; compare the ledger | Ledger unchanged by billing | Duy Anh | Tiến | — | Not run |
| TC-53 | 8 | Access | Every role × every endpoint | Automated matrix | Only permitted calls succeed | Minh | Duy Anh | partial: UC01-09, UC02-08, UC03-12 | Not run |
| TC-54 | 8 | UC06 / BR07 | Two pharmacists dispense the same item | Concurrent dispensing of the last outstanding quantity, 20 runs | Total never above prescribed | Duy Anh | Tiến | — | Not run |
| TC-55 | 7 | UC07 / BR03 | Sale with insufficient stock | Sell more than sellable | Refused with the available quantity | Duy Anh | Tiến | — | Not run |
| TC-56 | 7 | UC11 | Write off an expired batch | Write off with a reason | Moved to pending destruction; not destroyed | Minh | Duy Anh | — | Not run |
| TC-57 | 6 | UC06 / BR02 | FEFO picks a batch inside the alert window | Earliest batch expires in 30 days | Warning with days left; issue allowed | Duy Anh | Tiến | — | Not run |
| TC-58 | 5 | UC05 / BR04 | Dispense unverified; edit after verification | Dispense a RECEIVED prescription; edit a VERIFIED one | Refused; status back to RECEIVED | Duy Anh | Tiến | — | Pass |
| TC-59 | 7 | UC06 / UC07 | Cancel a draft dispensing and an unpaid sale | Cancel each with a reason | No stock movement; quantities unchanged | Duy Anh | Tiến | — | Not run |
| TC-60 | 7 | UC06 / BR01 | Earlier-expiring batch on hold or recalled | Put the first FEFO batch on hold | Skipped; next eligible batch used | Duy Anh | Tiến | LOCK-02 (ledger) | Not run |
| TC-61 | 8 | UC11 / BR11 *(S)* | Release one quarantined return, reject another, record destruction | Two returns in quarantine | Released units sellable; rejected units pending destruction until destroyed | Minh | Duy Anh | — | Not run |
| TC-62 | 7 | UC06, UC07 / BR03 | Cashier sale and dispensing race for the last units | 20 runs | One succeeds, the other refused with the new quantity; never negative | Duy Anh | Tiến | — | Not run |
| TC-63 | 7 | UC10 | Monitoring off; expired or quarantined units present | Switch monitoring off; separately hold expired and quarantined stock | No alert when off; those units not counted as sellable | Minh | Duy Anh | — | Not run |
| TC-64 | 6 | UC03 | Expiry not after the receipt date | Receipt dated today with a line expiring today, then one expiring yesterday | Error under that line's expiry date; nothing saved | Tiến | Minh | UC03-04 | Not run |

The *Automated* column names e2e or unit tests in `src/backend` that check the
same behaviour at API level. They support the manual run; they do not replace
it.

## Regression pack R

Run before every tag (`v0.1`, `v0.2`, `v1.0`), starting on the Thursday of the
tag week, on a freshly seeded database (plan §6.5). About two hours with the
reset. Each run is a new line in [`runs.md`](runs.md); a case whose feature is
not merged yet is recorded as `Blocked`, not skipped.

| Area | Cases |
|---|---|
| Goods receipts (UC03) | TC-01, TC-03 |
| Dispensing rules (UC06: BR01, BR02, BR03, BR04) | TC-04, TC-06, TC-07, TC-09, TC-12 |
| Sales and returns (UC07, UC08: DEC-05, BR05, BR11) | TC-15, TC-16, TC-35, TC-50 |
| Stock control (UC09, UC10) | TC-19, TC-21 |
| Access (FR-39, UC16) | TC-28, TC-43 |
| End to end | TC-31 |

Sixteen cases: the fifteen of plan §6.5, plus TC-50 because BR11 (returns go
to quarantine) became a Must rule in Proposal v1.1. BR10 (prescription
validity) is not in the pack by hand; its e2e tests run in CI on every pull
request.
