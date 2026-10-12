# Functional and non-functional requirements

Source: Proposal v1.1 (submitted 11/10/2026), Tables 2.6 and 2.7. Numbers are
fixed: code, tests and the Final Report refer to them. A change goes through a
pull request that also updates the affected use-case specification and test
cases.

Priorities: 40 Must, 6 Should, 2 Could. Every Must FR maps to a use case and at
least one test case ([`../../tests/manual/test-cases.md`](../../tests/manual/test-cases.md)).

**Status** says whether the requirement is implemented and where; *Verified*
needs a passing run by someone other than the author in `tests/manual/runs.md`.

## Catalogue and pricing — owner Tiến (A)

| ID | Requirement | Pri. | UC | Tests | Status |
|---|---|---|---|---|---|
| FR-01 | The system shall allow a manager to create a medicine with a unique code, name, active ingredient, strength, base unit, category, classification (OTC, prescription or controlled; default prescription, with the source and date of the classification), reorder level, a low-stock monitoring switch and an expiry-alert window in days; a duplicate code shall be refused with a message on the code field. | Must | UC01 | TC-45 | Built (#97) |
| FR-02 | The system shall allow a manager to edit and deactivate a medicine; a deactivated medicine cannot be received, dispensed or sold, but its batches and history remain viewable. | Must | UC01 | TC-46 | Built (#97); receipt check in #99 |
| FR-03 | The system shall allow a manager to set the current selling price of a medicine as a positive whole number of VND. | Must | UC01 | TC-46 | Built (#97) |
| FR-04 | The system shall allow a manager to schedule a new price with an effective date while keeping all earlier prices, and shall value each sale at the price in force on the sale date (BR09). | Should | UC13 | TC-40, 41 | Price history in place (#97); scheduling in UC13 |

## Purchasing and stock ledger — owner Tiến (A)

| ID | Requirement | Pri. | UC | Tests | Status |
|---|---|---|---|---|---|
| FR-05 | The system shall allow a manager to create, edit and deactivate a supplier with name, phone number and address, where name and phone number are mandatory. | Must | UC02 | TC-46 | Built (#95) |
| FR-06 | The system shall allow a manager to record a goods receipt with supplier, supplier document number, receipt date and one or more lines (medicine, batch number, expiry date, quantity, unit cost); each line shall create or top up a batch and post one RECEIPT movement in the same transaction. | Must | UC03 | TC-01 | Built (#99) |
| FR-07 | The system shall refuse a receipt line whose quantity is not a positive integer, whose unit cost is negative, whose expiry date is not after the receipt date, or whose medicine or supplier is inactive. | Must | UC03 | TC-02, 46 | Built (#99) |
| FR-08 | The system shall refuse a goods receipt whose document number is already recorded for the same supplier. | Must | UC03 | TC-03 | Built (#99) |
| FR-09 | If any line or the database write fails, the system shall save no part of the receipt, dispensing, sale or return. | Must | UC03, 06–08 | TC-25 | Ledger and UC03 built (#96, #99) |
| FR-10 | The system shall let any signed-in user search medicines by code, name or category and see the sellable quantity (without expired, quarantined, on-hold, recalled or rejected stock), plus each batch with number, expiry date, status and quantity in each stock state. | Must | UC04 | TC-48 | Week 6 |
| FR-11 | The system shall show the history of a batch: every movement with type, signed quantity, resulting balance, user, time and source document, in time order. | Must | UC04 | TC-24, 48 | Week 6 |
| FR-12 | The system shall write every stock change as exactly one stock movement, never edit or delete a movement, and record a correction as a new opposite movement that references the original (BR05). | Must | All | TC-16, 19, 25 | Built (#94, #96) |

## Prescriptions and dispensing — owner Duy Anh (B)

| ID | Requirement | Pri. | UC | Tests |
|---|---|---|---|---|
| FR-13 | The system shall allow a pharmacist to record a prescription with reference, prescriber, patient (full name, date of birth or age, address; for a child under 72 months also age in months, weight and the accompanying adult), issue date and one or more items (medicine, strength, quantity prescribed, dose, route and days of use). | Must | UC05 | TC-47 |
| FR-14 | The system shall refuse a prescription with a mandatory field of FR-13 missing, an item quantity of zero or less, or an issue date in the future; the valid-until date shall be computed as the issue date plus the validity period in the system settings (5 days) and shall not be editable. | Must | UC05 | TC-38, 47 |
| FR-44 | The system shall let a pharmacist record the professional review of a prescription (patient, medicine, strength, dose and directions) and mark it VERIFIED with user and time; only a VERIFIED or PARTIALLY_DISPENSED prescription can be dispensed, and any later edit returns it to RECEIVED. | Must | UC05 | TC-58 |
| FR-15 | The system shall allow a pharmacist to create and edit customers (name, phone, date of birth, address) and prescribers (licence number, name, clinic, active), including a quick-create from the prescription form; a duplicate licence number shall be refused. Quick-create is Must; the separate management screens (UC14) are Should. | Must | UC05, UC14 | TC-49 |
| FR-16 | When dispensing an item, the system shall select eligible batches by FEFO (BR01, DEC-07), create one dispense line per batch used, and warn with the days left when a chosen batch expires within the expiry-alert window or before the end of the days of use (BR02). | Must | UC06 | TC-04, 05, 57, 60 |
| FR-17 | The system shall never issue from a batch whose expiry date is on or before the business date; this is a pharmacy policy (BR02, DEC-01). | Must | UC06, 07 | TC-06, 07, 08 |
| FR-18 | If the sellable quantity is lower than requested, the system shall refuse the line, show the sellable quantity and change nothing (BR03). A smaller quantity is issued only when the pharmacist submits it again and confirms that the effect on the treatment was assessed and discussed with the customer, with a note; the outstanding quantity is kept on the prescription item (DEC-02). | Must | UC06, 07 | TC-09, 10, 26 |
| FR-19 | The system shall dispense a medicine that is not classified OTC only against a VERIFIED prescription that passes every check in DEC-03 (BR04). | Must | UC06 | TC-12, 13, 14, 58 |
| FR-20 | The system shall refuse a dispensing that would make the total dispensed for a prescription item exceed the quantity prescribed (BR07). | Must | UC06 | TC-37, 54 |
| FR-21 | The system shall refuse dispensing when the business date is after the computed valid-until date of the prescription, and shall check this again at every visit (BR10). | Must | UC06 | TC-38 |
| FR-22 | After each dispensing the system shall set the prescription status to PARTIALLY_DISPENSED or FULLY_DISPENSED and show, per item, the quantity dispensed and the quantity still outstanding. | Must | UC06 | TC-37 |
| FR-23 | A dispensing, sale or return command shall carry a request ID that is stored with its result in the same transaction; a repeated request with the same ID shall return the first result and change nothing, and the same ID with different content shall be refused. | Must | UC06–08 | TC-18, 27 |
| FR-45 | Stock shall leave only when the pharmacist confirms the hand-over of a dispensing or the cashier confirms payment of a sale; entering a prescription or preparing a draft moves and reserves nothing, and a draft cancelled with a reason leaves stock unchanged (DEC-05). | Must | UC06, 07 | TC-59 |

## Sales and returns — owner Duy Anh (B)

| ID | Requirement | Pri. | UC | Tests |
|---|---|---|---|---|
| FR-24 | The system shall allow a cashier to record an over-the-counter sale of one or more medicines, allocating batches by FEFO, valuing each line at the current price and issuing a unique receipt number and total. | Must | UC07 | TC-35, 55 |
| FR-25 | The system shall refuse, in an over-the-counter sale, any medicine that is not classified OTC (BR04, DEC-09). | Must | UC07 | TC-36 |
| FR-26 | The system shall allow a cashier to bill a completed dispensing, creating sale lines from its dispense lines without a second stock movement (DEC-05). | Must | UC07 | TC-15, 52 |
| FR-27 | The system shall allow a cashier to record a return against a sale line with a reason, where the quantity returned is at most the quantity sold minus the quantity already returned. | Must | UC08 | TC-16, 17 |
| FR-28 | The system shall post a returned item as a RETURN movement into the quarantine of its original batch with status PENDING_ASSESSMENT, never into sellable stock (BR11, DEC-04), and compute the refund at the original unit price. | Must | UC08 | TC-16, 50 |

## Stock control and reporting — owner Minh (C)

| ID | Requirement | Pri. | UC | Tests |
|---|---|---|---|---|
| FR-29 | The system shall allow a manager to open a stock take for selected medicines, store the system quantity of each batch at that moment, and let the counter enter the counted quantity. | Must | UC09 | TC-19, 39 |
| FR-30 | The system shall not accept a stock take for approval while any line whose counted and system quantities differ has no reason. | Must | UC09 | TC-20 |
| FR-31 | On approval the system shall post one ADJUSTMENT movement per batch equal to counted minus system quantity, and close the stock take. | Must | UC09 | TC-19 |
| FR-32 | The system shall refuse approval of a stock take by the user who counted it (BR08). | Should | UC09 | TC-51 |
| FR-33 | The system shall raise a LOW_STOCK alert when a monitored medicine's sellable quantity is above zero and at or below its reorder level, and an OUT_OF_STOCK alert when it is zero (DEC-08); alerts are re-evaluated after every movement or batch status change and at the start of each business day, at most one alert is open per medicine, and it is resolved when the quantity rises above the level. | Must | UC10 | TC-21, 63 |
| FR-34 | The system shall allow a manager to list open alerts and acknowledge one, recording the user and time. | Must | UC10 | TC-21 |
| FR-35 | The system shall list batches with stock that expire within the medicine's alert window (default 90 days) and batches already expired, with quantity and days remaining. | Must | UC11 | TC-22 |
| FR-36 | The system shall allow a manager to write off an expired batch with a reason, posting a WRITE_OFF movement that moves its remaining quantity from sellable stock to "pending destruction"; the stock is not recorded as destroyed (DEC-04). | Must | UC11 | TC-56 |
| FR-37 | The system shall produce a stock movement report for a chosen date range showing, per medicine, opening quantity, received, dispensed, sold, returned into quarantine, released, written off, destroyed and adjusted quantities, closing quantity and net quantity issued = dispensed + sold − released in the period; cost value is shown at batch unit cost and labelled as not revenue (DEC-06). | Must | UC12 | TC-23 |
| FR-46 | The system shall allow a manager to assess a quarantined returned item: release it to sellable stock only if it is not controlled, not expired, its packaging is intact and its storage is credible, or reject it to "pending destruction", recording who decided and when (BR11). | Should | UC11 | TC-61 |
| FR-47 | The system shall allow a manager to record the destruction of stock pending destruction (date, method, witness), posting a DESTROY movement; until then the stock is shown as pending destruction. | Should | UC11 | TC-61 |
| FR-48 | The system shall allow a manager to set a batch to ACTIVE, ON_HOLD, RECALLED or REJECTED with a reason; a batch that is not ACTIVE is excluded from FEFO, sales and the sellable quantity (DEC-07). | Must | UC11 | TC-60 |

## Access control — owner Minh (C)

| ID | Requirement | Pri. | UC | Tests |
|---|---|---|---|---|
| FR-38 | The system shall let a user sign in with username and password and sign out; a failed sign-in shall not reveal which field was wrong, and a session shall expire after 8 hours. | Must | UC16 | TC-42, 43 |
| FR-39 | The business layer shall check the signed-in user's permission (Table 2.4) on every request and refuse a forbidden one, even when it is sent directly to the API. | Must | All | TC-28, 53 |
| FR-40 | The system shall allow a manager to create users, assign a role, reset a password and lock or unlock an account; a locked user cannot sign in. | Should | UC15 | TC-44 |
| FR-41 | The system shall keep an audit log of sign-ins, user and role changes, price changes and approved stock takes, with user and time. | Should | UC15 | TC-44 |

FR-39 is in place for UC01–03 (permission matrix, `Actor`, `assertPermission`,
#95); sign-in itself (FR-38) is UC16.

## Optional

| ID | Requirement | Pri. | UC |
|---|---|---|---|
| FR-42 | The system shall accept quantities in a pack unit and convert them to base units (BR06). | Could | UC03, 06 |
| FR-43 | The system shall export the expiry and stock movement reports to Excel or PDF. | Could | UC11, 12 |

## Non-functional requirements (ISO/IEC 25010)

| ID | Category | Requirement | Measured by |
|---|---|---|---|
| NFR-01 | Performance | A stock lookup search returns its first page (20 rows) in at most 1 second with 1,000 medicines and 5,000 batches in the database. | TC-29: median of 10 runs on the reference machine |
| NFR-02 | Performance | A one-month stock movement report over 10,000 stock movements is produced in at most 3 seconds. | TC-29 |
| NFR-03 | Usability | A first-time user with only a one-page task sheet completes "record a 2-line goods receipt" and "dispense a 2-item prescription" in at most 5 minutes each, asking for help at most once. | TC-32: two people outside the team |
| NFR-04 | Usability | Every invalid input produces a message next to the field that names the problem; no stack trace or blank page is ever shown. | All negative test cases: 0 crashes |
| NFR-05 | Security | Passwords are stored only as bcrypt hashes (cost ≥ 10); every API endpoint except sign-in requires a valid token. | Code review; TC-42, 43, 53 |
| NFR-06 | Security | No password, key or connection string is committed; configuration is read from a git-ignored `.env` file with a committed `.env.example`. | Repository check at every tag |
| NFR-07 | Reliability | Every operation that changes stock runs in one database transaction; an injected failure leaves 0 partial documents. | TC-25 |
| NFR-08 | Reliability | For every batch, the quantity in each stock state equals the sum of its movements after any sequence of operations; 20 runs of two concurrent requests for the last units, also a sale against a dispensing, never go negative. | Invariant test; TC-26, 54, 62 |
| NFR-09 | Persistence | All data survive a restart of the application and the database container; a backup made with `pg_dump` restores to identical balances (Should). | TC-24; TC-30 |
| NFR-10 | Portability | The system runs on Windows 10/11 and Ubuntu 22.04 or later with Node.js 20+ and Docker; a fresh clone runs with seed data in at most 30 minutes by following the README. | TC-33 on a second machine |
| NFR-11 | Maintainability | Business rules live in domain or service classes, never in UI event handlers; CI runs build, lint and all tests on every pull request, and `main` is never left failing. | CI history; code review |
| NFR-12 | Auditability | Every stock movement records user, time (Asia/Ho_Chi_Minh), type and source document. | TC-48 |
| NFR-13 | Performance | At the counter, confirming a 3-line sale or dispensing takes at most 2 seconds from the click to the receipt or slip on screen, with the data volume of NFR-01 (DEC-10, open with the reviewer). | TC-29 in the browser |
