# Manual test cases

Planned manual test cases for the Pharmacy Stock and Prescription Dispensing
System. Every case is currently **Not run** — no feature has been implemented.

Fill in *Actual result* and *Result* only after running the case against a real
build, and link the evidence file under `evidence/`.

`Result` values: `Pass`, `Fail`, `Not run`, `Blocked`.

A case marked _(decision)_ depends on an open business decision listed in
[`../../docs/README.md`](../../docs/README.md) and cannot be given a verdict
until that decision is settled.

| ID | Week | Use case / rule | Purpose | Data / steps | Expected result | Actual result | Result | Owner | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| TC-01 | 5 | UC03 | Receive a valid batch | Medicine and supplier exist; receive 10 units | Stock increases by 10; the goods receipt and the stock movement are linked. |  | Not run | Tiến (A) |  |
| TC-02 | 6 | UC03 | Reject an invalid received quantity | Enter 0, a negative number or text as the quantity | Clear error message; no receipt is written and stock is unchanged. |  | Not run | Tiến (A) |  |
| TC-03 | 6 | UC03 | Prevent a duplicate goods receipt | Submit the same supplier document again | Stock does not increase a second time. |  | Not run | Tiến (A) |  |
| TC-04 | 5 | UC06 / BR01 | FEFO across two batches | Batch A: 3 units; batch B: 8 units; A expires first; dispense 7 | Takes 3 from A and 4 from B; A is left at 0 and B at 4. |  | Not run | Duy Anh (B) |  |
| TC-05 | 6 | UC06 / BR01 | Skip a batch with no stock | Nearest-expiry batch has 0 on hand; the next batch has 5; dispense 2 | Takes from the batch holding 5; 3 remain. |  | Not run | Duy Anh (B) |  |
| TC-06 | 5 | UC06 / BR02 | Reject an expired batch | Only batch available expires before the transaction date | Nothing is dispensed; stock is unchanged and no sale is completed. |  | Not run | Duy Anh (B) |  |
| TC-07 | 6 | UC06 / BR02 | Dispensing on the exact expiry date _(decision)_ | Transaction date equals the batch expiry date | Follows the date-boundary convention agreed in week 2; record the convention in the actual result. |  | Not run | Duy Anh (B) |  |
| TC-08 | 6 | UC06 / BR01 | Skip an expired batch when a valid one exists | A is expired; B is in date and holds enough | Takes from B only; A is unchanged. |  | Not run | Duy Anh (B) |  |
| TC-09 | 5 | UC06 / BR03 | Insufficient valid stock _(decision)_ | 4 units available; 5 requested | Rejected, or handled as a shortage per the agreed scope; stock must never go negative. |  | Not run | Duy Anh (B) |  |
| TC-10 | 6 | UC06 / BR03 | Dispense the exact remaining quantity | 4 on hand; 4 requested | Succeeds once; stock reaches 0. |  | Not run | Duy Anh (B) |  |
| TC-11 | 6 | UC06 | Invalid dispensing quantity | Request 0, a negative number, or the wrong unit | Rejected; no data changes. |  | Not run | Duy Anh (B) |  |
| TC-12 | 6 | UC06 / BR04 | Controlled medicine with no prescription reference | Dispense a controlled medicine leaving the reference blank | Rejected, naming the field that must be supplied. |  | Not run | Duy Anh (B) |  |
| TC-13 | 6 | UC06 / BR04 | Invalid prescription reference _(decision)_ | Reference does not exist, or has a status outside the agreed scope | Rejected; stock is unchanged. |  | Not run | Duy Anh (B) |  |
| TC-14 | 6 | UC06 / BR04 | Valid prescription reference | Prescription and medicine satisfy the documented checks | Dispensing succeeds and traces back to the correct prescription. |  | Not run | Duy Anh (B) |  |
| TC-15 | 7 | UC07 | No double stock deduction on a sale | A dispensing already linked to a sale | Stock falls by one issue only. |  | Not run | Duy Anh (B) |  |
| TC-16 | 6 | UC08 / BR05 | Return linked to the original transaction _(decision)_ | Sold 5; accept a return of 2 under the agreed policy | A return record and a compensating movement are written; the original history is preserved. |  | Not run | Duy Anh (B) |  |
| TC-17 | 7 | UC08 | Reject a return above the returnable quantity | Sold 5, already returned 2; request a further 4 | Rejected; no incorrect stock or refund. |  | Not run | Duy Anh (B) |  |
| TC-18 | 7 | UC08 | Duplicate return submission | Submit the same return request again | No second return to stock is created. |  | Not run | Duy Anh (B) |  |
| TC-19 | 6 | UC09 / BR05 | Stock take with a discrepancy | System holds 10, counted 8, reason supplied | Records an adjustment of -2 with the user and reason; stock becomes 8 and history is kept. |  | Not run | Minh (C) |  |
| TC-20 | 6 | UC09 | Adjustment with no reason or insufficient rights | Staff account without rights, or the reason left blank | Rejected; balance and history are unchanged. |  | Not run | Minh (C) |  |
| TC-21 | 7 | UC10 | Low stock alert at the threshold _(decision)_ | Test below, at, and above the configured threshold | Behaves per the agreed threshold rule; stock that cannot be dispensed is excluded. |  | Not run | Minh (C) |  |
| TC-22 | 7 | UC11 | Expiry report at the range boundary _(decision)_ | Batches before, inside and after the alert window | The list and quantities match the agreed date range. |  | Not run | Minh (C) |  |
| TC-23 | 7 | UC12 | Period report with sales and returns _(decision)_ | Sample data covering sales, returns and two different periods | Figures match the agreed report definition; cross-check by hand. |  | Not run | Minh (C) |  |
| TC-24 | 8 | UC04 | Data survives a restart | Record a valid receipt and issue, then close and reopen the application | Stock, documents and history are not lost. |  | Not run | Tiến (A) |  |
| TC-25 | 8 | UC03 / UC06 | Database error mid-transaction | Simulate a failure before the transaction completes | Everything rolls back; no half-written document or stock change remains. |  | Not run | Tiến (A) |  |
| TC-26 | 8 | UC06 / BR03 | Two transactions competing for the last stock | 5 on hand; two concurrent sessions each request 4 | Stock never goes negative; both cannot succeed with 4 each. |  | Not run | Duy Anh (B) |  |
| TC-27 | 8 | UC06 | Resubmitted dispensing action | Click or submit the same request again | No duplicate dispensing transaction is created. |  | Not run | Duy Anh (B) |  |
| TC-28 | 8 | Access control | Block a management action from a staff account | A staff account calls a manager-only function | Refused in the business layer, not merely by hiding the button. |  | Not run | Minh (C) |  |
| TC-29 | 8 | Performance NFR | Measure search and reporting _(decision)_ | Use the agreed data volume and reference machine | Response time is within the NFR threshold; record the measurement and conditions. |  | Not run | Minh (C) |  |
| TC-30 | 8 | Persistence | Backup and restore | Back up the sample data and restore it into a test environment | Balances and documents match the backup. |  | Not run | Tiến (A) |  |
| TC-31 | 9 | UC03-UC08 | End-to-end flow | Receive, take in prescription, dispense, sell, return | Each step and the final report match the expected data. |  | Not run | Minh (C) |  |
| TC-32 | 9 | Usability NFR | Two people outside the team try the system | Give them the main tasks with no click-by-click guidance | Record time taken, errors and difficulties, and pass/fail against the NFR. |  | Not run | Minh (C) |  |
| TC-33 | 9 | Installation | Run from a fresh clone on another machine | Follow the README, configuration and sample data | Installs and runs; no undocumented secret configuration is needed. |  | Not run | Minh (C) |  |
| TC-34 | 10 | Submission package | Check versions and submitted files | Re-download the PDF and DOCX, open the repository link and the run guide | Files open, are the correct version, and links are accessible. |  | Not run | Tiến (A) |  |
