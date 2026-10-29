# Business rule scenarios — BR01, BR02, BR03, BR04, BR05, BR06, BR07, BR08, BR09, BR10, BR11

This table is the design gate for the three issuing rules: it mirrors plan §6.1
and Definition of Done §6.6 item 2 (#32). Every row is one automated test that
already exists; the Given/When/Then columns describe **what the test body
actually asserts**, not just its name. Read a row top-to-bottom like a test
case; the TC column links it to the manual scenario in
`tests/manual/test-cases.md`. Unit tests run with `npm test`, e2e tests with
`npm run test:e2e` (both from `src/backend`), and both run in CI, so a rule
without a manual run is still checked on every push.

## BR01 FEFO

Rule: dispensing and sales draw from the eligible batch that expires first and
continue into the next batch, one line per batch
([business-rules.md](../requirements/business-rules.md), BR01).
Ties and candidate selection follow DEC-07.

Source: `src/backend/src/issuing/fefo-allocator.spec.ts` (unit, `npm test`).
Business date `2026-10-13`, `alertDays` 90. The default batch is ACTIVE,
holds 10, expires `2027-06-30`, received `2026-09-01`.

| Test | Kind | Given | When | Then | TC |
|---|---|---|---|---|---|
| BR01-01 | Normal | A = 3, expires 2027-01-31 (earliest); B = 8, expires 2027-03-31; request 7 | `allocate(7)` | Two lines: A 3, B 4 | TC-04 |
| BR01-02 | Edge | A = 5 (earliest), B = 10; request exactly A's quantity | `allocate(5)` | One line: A 5; B untouched | — |
| BR01-03 | Edge | A holds 0, B = 5; request 2 | `allocate(2)` | Line from B only | TC-05 |
| BR01-04 | Edge | Z, A, B all expire 2027-06-30; Z received 2026-09-02, A and B received 2026-09-10; request 25 | `allocate(25)` | Z 10, then A 10, then B 5 (earlier receipt first, then lower batch number) | — |
| BR01-05 | Edge | Three batches with status ON_HOLD / RECALLED / REJECTED, expiring 2026-12-31 (earliest); one ACTIVE batch "OK"; request 4 | `allocate(4)` | All three inactive batches skipped; OK 4 | TC-60 |
| BR01-06 | Error | A = 3, B = 2 (total 5); request 6 | `allocate(6)` | `ok: false`, no lines, `available: 5` reported | — |
| BR01-07 | Error | request 0, then request 1.5 | `allocate` | `RangeError` — quantity must be a positive integer | — |

## BR02 No expired stock

Rule: a batch whose expiry date is on or before the business date is never
issued; a label of month/year means the last day of that month (DEC-01), and a
batch inside the alert window, or expiring before the days of use run out, is
issued only with a warning ([business-rules.md](../requirements/business-rules.md),
BR02).

Source: `src/backend/src/issuing/fefo-allocator.spec.ts` (unit, `npm test`),
same harness as BR01.

| Test | Kind | Given | When | Then | TC |
|---|---|---|---|---|---|
| BR02-01 | Error | One batch, expiry 2026-10-12 (the day before the business date); request 1 | `allocate(1)` | Refused, no lines, `available: 0` | TC-06 |
| BR02-02 | Edge | Batch expiry = business date 2026-10-13 | `isIssuable(today, today)`; `allocate(1)` | Not issuable — pharmacy policy is stricter than the label | TC-07 |
| BR02-03 | Normal | Batch expiry 2026-10-14, one day after the business date | `isIssuable` | Issuable | — |
| BR02-04 | Normal | A expired 2026-10-01 (holds 10); B in date (holds 10); request 4 | `allocate(4)` | Only B used: line B 4 | TC-08 |
| BR02-05 | Edge | Clock at 2026-10-13T17:30Z — already 2026-10-14 in Vietnam | `today()`; `isIssuable('2026-10-14', 2026-10-14)` | Business date is 2026-10-14; a batch expiring on that date is not issuable | — |

### Near-expiry warnings (FR-16)

| Test | Kind | Given | When | Then | TC |
|---|---|---|---|---|---|
| BR02-06 | Edge | Batch expiry 2026-11-12 — 30 days left, inside the 90-day alert window; request 1 | `allocate(1)` | Issued with warning `WITHIN_ALERT_WINDOW`, `daysLeft: 30` | TC-57 |
| BR02-07 | Normal | Batch expiry 2027-06-30 — outside the alert window; request 1 | `allocate(1)` | Issued with warning `null` | — |
| BR02-08 | Edge | Batch expiry 2026-10-20; prescription says `daysOfUse: 10` | `allocate(1, 10)` | Issued with warning `BEFORE_END_OF_USE`, `daysLeft: 7` | — |
| BR02-09 | Edge | Business date 2026-10-13, `alertDays` 90 | `warningFor('2027-01-11', …)` and `warningFor('2027-01-12', …)` | Boundary inclusive: 90 days left warns; 91 does not | — |

## BR03 Stock never goes negative

Rule: stock may never go negative in any stock state, including when two
transactions compete for the last units
([business-rules.md](../requirements/business-rules.md), BR03).

### Unit level — delta math

Source: `src/backend/src/stock/stock-deltas.spec.ts` (unit, `npm test`).
Given stock of `{ sellable: 5, quarantine: 2, pendingDestruction: 1 }`.

| Test | Kind | Given | When | Then | TC |
|---|---|---|---|---|---|
| BR03-U1 | Edge | delta −5 on sellable | `applyDeltas` | Sellable 0 — the exact remaining quantity is allowed | TC-10 |
| BR03-U2 | Error | delta −6 on sellable | `applyDeltas` | `BusinessRuleViolation`, rule BR03, code `INSUFFICIENT_STOCK`, message "only 5 sellable" | — |
| BR03-U3 | Error | delta −3 on quarantine; then delta −2 on pending destruction | `applyDeltas` | Each refused — no state may go negative | — |

### Database level — transactions and races

Source: `src/backend/test/stock-ledger.e2e-spec.ts` (e2e,
`npm run test:e2e`). Business date `2026-10-12`; `receive(number, qty, expiry)`
defaults to expiry `2027-06-30`, received `2026-10-01`.

| Test | Kind | Given | When | Then | TC |
|---|---|---|---|---|---|
| BR03-01 | Error | A1 = 3, B1 = 8; one `ledger.run` posts DISPENSE −2 (B1), then DISPENSE −4 (A1) — more than A1 holds | Second `post` | `BusinessRuleViolation`; the whole command rolls back: A1 still 3, B1 still 8, only the two receipt movements remain (FR-09) | TC-25 |
| BR03-03 | Concurrency | A1 = 10; inside one command, two SALE −7 posts on the same batch run concurrently via `Promise.all` | Both `post` | One rejected with rule BR03; batch back to 10; `findLedgerMismatches` empty | — |
| BR03-02 | Concurrency | A1 = 5 sellable; two whole commands race to take 4 (short `pg_sleep` inside the transaction), repeated 5 times | Two concurrent `ledger.run` | Each round: exactly one 201, one `BusinessRuleViolation`; sellable ends at 1; ledger balanced | TC-26 |

Source: `src/backend/test/dispensing.e2e-spec.ts` (e2e, `npm run test:e2e`).
Business date 2026-10-13 (fixed clock), medicine with `expiryAlertDays: 90`.

| Test | Kind | Given | When | Then | TC |
|---|---|---|---|---|---|
| UC06-13 | Concurrency | Batch A = 5; two verified prescriptions, 5 each | Two concurrent `POST /api/dispensings`, 5 each | One 201, one 422 `INSUFFICIENT_STOCK`; A reaches 0; ledger balanced | — |
| UC06-14 *(BR07)* | Concurrency | Batch A = 20; one verified prescription prescribing 4 | Two concurrent dispenses of the same item, 4 each | One 201, one 422; `quantityDispensed` stays 4 — never above the prescription | TC-54 |

## BR04 Prescription-only medicines need a verified prescription

Rule: a medicine that is not classified OTC is handed over only against a
prescription that passed the system checks and a pharmacist's verification,
and an over-the-counter sale takes only OTC medicines
([business-rules.md](../requirements/business-rules.md), BR04). The checks are
DEC-03; DEC-09 keeps prescription and controlled medicines off the cashier's
counter. `PrescriptionValidator` is called from `PrescriptionsService` and
`DispensingService`, so both paths appear below.

### Unit level — the validator

Business date `2026-10-19`. The default state is `VERIFIED`, valid until
`2026-10-20`, prescriber active; a row changes only what it names.

| Test | Kind | Given | When | Then | TC |
|---|---|---|---|---|---|
| BR04-01 | Normal | Status `VERIFIED`, then `PARTIALLY_DISPENSED`, prescriber active | `assertDispensable(state, '2026-10-19')` | Both allowed — a partial supply stays open | TC-14 |
| BR04-02 | Error | Status `RECEIVED` — recorded, not yet verified | `assertDispensable` | Refused, rule BR04, code `PRESCRIPTION_NOT_DISPENSABLE` | TC-13 |
| BR04-03 | Error | Status `FULLY_DISPENSED`, then `CANCELLED` | `assertDispensable` | Both refused, rule BR04, code `PRESCRIPTION_NOT_DISPENSABLE` | — |
| BR04-04 | Error | `prescriberActive: false`, status `VERIFIED`; then status `RECEIVED` | `assertDispensable`; `assertVerifiable` | Both refused, rule BR04, code `PRESCRIBER_INACTIVE` — deactivation blocks verification too | — |
| BR04-05 | Edge | Status `RECEIVED`; then the default `VERIFIED` | `assertVerifiable` | `RECEIVED` passes; `VERIFIED` is refused with rule FR-44, code `PRESCRIPTION_NOT_RECEIVED` | TC-58 |
| BR04-06 | Edge | Status `FULLY_DISPENSED` and `validUntil` `2026-10-01`, long past | `assertDispensable` | Rule BR04, code `PRESCRIPTION_NOT_DISPENSABLE` — the status is checked before the date, so a closed prescription is never reported as expired | — |

Source: `src/backend/src/prescriptions/prescription-validator.spec.ts` (unit,
`npm test`).

### Through the API — UC05, UC06 and UC07

| Test | Kind | Given | When | Then | TC |
|---|---|---|---|---|---|
| UC05-08 | Normal | A `RECEIVED` prescription | `POST /api/prescriptions/:id/verify` with a note, then the same call again | First: 200, status `verified`, verifier's name stored, note kept, `verifiedAt` `2026-10-13T03:00:00.000Z`. Second: 422 `PRESCRIPTION_NOT_RECEIVED` | TC-58 |
| UC06-07 | Error | Batch A = 5; a prescription for 2 recorded but not verified | `POST /api/dispensings`, 2 | 422 `PRESCRIPTION_NOT_DISPENSABLE`; batch A still 5 | TC-58 |
| UC07-05 | Error | OTC medicine with batch A = 10; `Amoxicillin 500 mg` (prescription) and `Diazepam 5 mg` (controlled), 10 each; one sale of 1 of each | `POST /api/sales` as the cashier | 422 `NOT_OVER_THE_COUNTER`, one error per refused line (`otcLines.1.medicineId`, `otcLines.2.medicineId`), the first naming Amoxicillin; no sale saved and no SALE movement — the whole sale rolls back | TC-36 |

Source: `src/backend/test/prescriptions.e2e-spec.ts` (UC05-08),
`src/backend/test/dispensing.e2e-spec.ts` (UC06-07),
`src/backend/test/sales.e2e-spec.ts` (UC07-05) (e2e, `npm run test:e2e`).

## BR05 Append-only ledger

Rule: every stock change writes exactly one stock movement; movements are
never edited or deleted, and a correction is a new opposite movement that
references the original ([business-rules.md](../requirements/business-rules.md),
BR05). A trigger and CHECKs in the initial migration enforce the same at the
database level.

### Unit level — delta math

Source: `src/backend/src/stock/stock-deltas.spec.ts` (unit, `npm test`). Given
stock of `{ sellable: 5, quarantine: 2, pendingDestruction: 1 }`.

| Test | Kind | Given | When | Then | TC |
|---|---|---|---|---|---|
| BR05-U1 | Normal | A release of 2: sellable +2, quarantine −2 in the same delta | `applyDeltas` | One movement moves stock between states: `{ 7, 0, 1 }` | — |
| BR05-U2 | Normal | A write-off of 3 (sellable −3, pending destruction +3), then its negation | `applyDeltas`, twice | The reversal is the exact negation and restores `{ 5, 2, 1 }` | — |

### Ledger level — the database

Source: `src/backend/test/stock-ledger.e2e-spec.ts` (e2e,
`npm run test:e2e`). Business date `2026-10-12`; `receive(batch, qty)` defaults
to expiry `2027-06-30`, received `2026-10-01`.

| Test | Kind | Given | When | Then | TC |
|---|---|---|---|---|---|
| BR05-01 | Normal | New batch A1 receiving 10 | `ledger.run` with one RECEIPT | Batch `{ 10, 0, 0 }`, exactly one movement, `findLedgerMismatches` empty | — |
| BR05-02 | Normal | A1 = 10, then SALE −3, RETURN +2 quarantine, RELEASE −1 quarantine / +1 sellable, REJECT −1 quarantine / +1 pending, WRITE_OFF −2 sellable / +2 pending, DESTROY −3 pending, ADJUSTMENT −1 sellable | One `post` per type | Every state equals its movements: `{ 5, 0, 0 }`, 8 movements, ledger balanced | — |
| BR05-03 | Normal | A1 = 10, SALE −4 | `reverse(sale, 'Keyed twice')`; then reverse the same sale again; then reverse the reversal | The correction is a new movement (`type` SALE, +4) and A1 is back to 10; the second call is refused with `ALREADY_REVERSED`, reversing a reversal with `Conflict`; 3 rows kept, the original untouched | TC-16 |
| BR05-04 | Error | A1 = 5, SALE −4, then the receipt is reversed | `reverse(receipt)` | Refused with rule BR03 — the correction would make stock negative; 1 sellable, 2 movements | — |
| BR05-05 | Error | A1 = 5, one receipt movement | `UPDATE stock_movements SET "deltaSellable" = 50`; `DELETE FROM stock_movements` | Both rejected by the database with "append-only" | — |
| BR05-06 | Error | A1 = 5, one receipt movement | `reverse(receipt, '  ')` | Refused, code `REASON_REQUIRED` — a correction needs a reason | — |

### Through the API — receipts, hand-overs and sales

Source: `src/backend/test/ledger-invariant.e2e-spec.ts` (e2e,
`npm run test:e2e`). Fixed clock 10:00 on 13/10/2026; the medicine has a price
of 2.000 ₫ in force from 2026-10-01, so an OTC sale can run.

| Test | Kind | Given | When | Then | TC |
|---|---|---|---|---|---|
| BR05-11 | Normal | Receipt with two lines: A = 3 expiring 2027-01-31, B = 8 expiring 2027-03-31; verified prescription for 7 | Receipt, then verify, then hand over 7 | 2 RECEIPT movements, still 2 after verification, then 2 DISPENSE (A 3, B 4); A 0, B 4, 2 dispense lines, 4 movements, ledger balanced | — |
| BR05-12 | Error | Receipt of 5 into A | `UPDATE` and `DELETE` on `stock_movements` | Both rejected with "append-only"; still 1 movement, ledger balanced | — |
| BR05-13 | Error | A = 3; verified prescription for 5 | Hand over 5 | 422 `INSUFFICIENT_STOCK`, `items.0.quantity` "Only 3 can be issued now."; 1 movement, 0 dispense lines, A still 3, ledger balanced | TC-25 |
| BR05-14 | Normal | A = 10; verified prescription for 3; one `requestId` | Hand over 3 twice with that `requestId` | Both 201 with an identical body; A 7; exactly one DISPENSE movement | — |
| BR05-15 | Normal | Receipt A = 3 (expires 2027-01-31) and B = 8 (2027-03-31); verified prescription for 2 | Hand over 2, then an OTC sale of 5 | A 1, B 8 after the hand-over (3 movements), then the sale takes A 1 and B 4: A 0, B 4, 2 SALE movements, 5 movements in all, ledger balanced | — |
| BR05-16 | Error | A = 3 | OTC sale of 4 | 422 `INSUFFICIENT_STOCK`, `otcLines.0.quantity` "Only 3 can be sold now."; 1 movement, 0 SALE movements, 0 sale lines, A still 3, ledger balanced | — |
| BR05-17 | Normal | A = 10; one `requestId` | OTC sale of 3 twice with that `requestId` | Both 201 with an identical body; A 7; exactly one SALE movement | — |

## BR06 Pack-unit conversion

Rule: a quantity entered in a pack unit is converted to base units before any
stock arithmetic, and a quantity that is not a whole number of base units is
refused ([business-rules.md](../requirements/business-rules.md), BR06). BR06 is
*Could*: the reference data seeded by
`src/backend/src/seed/catalogue-reference.seed.ts` holds base units only
(`isBaseUnit: true`, `conversionToBase: 1`), and no endpoint takes a pack unit
yet, so **the pack → base half has no test on `main`**. What the build does
enforce, at every door a quantity can come in, is the whole-base-unit half.

| Test | Kind | Given | When | Then | TC |
|---|---|---|---|---|---|
| UC03-03 | Error | A receipt whose third line asks for `quantity: 2.5` (its first two lines are wrong as well) | `POST /api/goods-receipts` | 400 with an error on `lines.2.quantity`, next to the other line errors; nothing saved | TC-02 |
| UC07-11 | Error | An OTC sale line with quantity 0, -1 or 2.5 | `POST /api/sales` | 400 on `otcLines.0.quantity` for each | — |
| UC09-08 | Error | A stock-take line counted -1, 2.5 or not at all | `PUT /api/stock-takes/:id/lines/:lineId` | 400 on `countedQuantity` for each; the saved count stays null | — |
| UC01-13 | Error | A medicine with a batch already on the book | `PATCH /api/medicines/:id` with another `baseUnitId` | 400 on `baseUnitId`: "The base unit cannot change once the medicine has stock." The unit every stored quantity is counted in cannot move underneath it | — |

Source: `src/backend/test/goods-receipts.e2e-spec.ts` (UC03-03),
`src/backend/test/sales.e2e-spec.ts` (UC07-11),
`src/backend/test/stock-takes.e2e-spec.ts` (UC09-08),
`src/backend/test/medicines.e2e-spec.ts` (UC01-13) (e2e, `npm run test:e2e`).

The ledger adds a programming-error guard: `applyDeltas` refuses a fractional
delta ("Stock deltas must be whole numbers of base units."), checked by
`refuses an empty or fractional movement as a programming error` in
`src/backend/src/stock/stock-deltas.spec.ts` (unit, `npm test`). It guards code,
not user input, so it does not replace the four checks above.

## BR07 No over-dispensing

Rule: the total dispensed for a prescription item, over any number of visits,
never exceeds the quantity prescribed; a partial supply records the
outstanding quantity
([business-rules.md](../requirements/business-rules.md), BR07, DEC-02).

### Unit level — the validator

Business date `2026-10-19`; the shared item is `quantityPrescribed: 20`,
`quantityDispensed: 13`.

| Test | Kind | Given | When | Then | TC |
|---|---|---|---|---|---|
| BR07-01 | Normal | Prescribed 20, dispensed 13 | `outstanding(item)` | 7 left | TC-37 |
| BR07-02 | Edge | The same item; a request of exactly the outstanding quantity | `assertWithinPrescribed([item], [7])` | Allowed | TC-37 |
| BR07-03 | Error | Items: prescribed 10 dispensed 0, and the shared item (20 / 13); request 10 and then 8 | `assertWithinPrescribed` | Rule BR07, code `OVER_PRESCRIBED_QUANTITY`, one error on the offending line: `items.1.quantity` "Only 7 of 20 prescribed are still outstanding." | TC-37 |
| BR07-04 | Error | Prescribed 5, dispensed 5; a further 1 | `assertWithinPrescribed` | Refused, rule BR07, code `OVER_PRESCRIBED_QUANTITY` — a closed item allows nothing | — |
| BR07-05 | Edge | Status `RECEIVED`, `VERIFIED`, then `PARTIALLY_DISPENSED`, `FULLY_DISPENSED`, `CANCELLED` | `assertEditable` | The first two may be edited; the last three are refused, rule BR07, code `PRESCRIPTION_NOT_EDITABLE` | TC-58 |

Source: `src/backend/src/prescriptions/prescription-validator.spec.ts` (unit,
`npm test`).

### Through the API — UC05 and UC06

| Test | Kind | Given | When | Then | TC |
|---|---|---|---|---|---|
| UC05-10 | Error | A prescription moved to `PARTIALLY_DISPENSED` | `PUT /api/prescriptions/:id` | 422 `PRESCRIPTION_NOT_EDITABLE` — an edit after dispensing is refused | — |
| UC06-05 | Normal | A = 4; prescription for 6 | Hand over 4 without a note, then 4 with a partial-supply note | Without the note: 400 on `items.0.partialSupplyNote`. With it: 201, status `partially_dispensed`, dispensed 4, outstanding 2, the note stored on the dispense line | TC-09 |
| UC06-06 | Normal | A = 20; prescription for 6; 4 already handed over with a note | Hand over 3, then 2, then 1 more | 3: 422 `OVER_PRESCRIBED_QUANTITY` on `items.0.quantity`. 2: 201, status `fully_dispensed`. 1 more: 422 `PRESCRIPTION_NOT_DISPENSABLE`; ledger balanced | TC-37 |
| UC06-14 | Concurrency | A = 20; verified prescription for 4 | Two concurrent hand-overs of 4 for the same item | One 201 and one 422; `quantityDispensed` stays 4 — never above the prescription | TC-54 |

Source: `src/backend/test/prescriptions.e2e-spec.ts` (UC05-10),
`src/backend/test/dispensing.e2e-spec.ts` (UC06-05, UC06-06, UC06-14) (e2e,
`npm run test:e2e`).

## BR08 Two-person stock take

Rule: a stock take is approved by a user other than the one who counted it, and
every discrepancy carries a reason
([business-rules.md](../requirements/business-rules.md), BR08). "Counted" means
anyone who saved a count on any line or submitted the take, so a manager who
counted a single line cannot approve even when a pharmacist submitted it. Since
#226 every such user is kept in `stock_take_counters`, so a count saved over
by someone else, or a submission before the take was returned, still counts. BR08
has no unit spec: the checks live in `StockTakesService` and are exercised
through the API.

Business date `2026-10-12`; the book holds 10 of batch P1 unless a row says
otherwise.

| Test | Kind | Given | When | Then | TC |
|---|---|---|---|---|---|
| UC09-02 | Normal | Book 10; counted 8 with a reason; another user approves | `POST /api/stock-takes/:id/approve` | 201, status `approved`, one ADJUSTMENT -2 whose `reason` is the text typed and whose source is `stock_take_line`; stock 8 | TC-19 |
| UC09-06 | Error | Book 10; counted 8 with a reason of spaces only | `POST /api/stock-takes/:id/submit` | 400 with an error on `lines.0.reason` whose message names the batch (`P1`) and says "give a reason for the difference."; the take stays Counting | TC-20 |
| UC09-11 | Error | The manager counts the only line and submits; the same manager approves | `POST /api/stock-takes/:id/approve` | 422, code `SAME_COUNTER`, "A stock take must be approved by someone who did not count it."; no movement, stock still 10, status `pending_approval` | TC-51 |
| UC09-11b | Error | The manager counts line P1, a pharmacist counts P2 and submits; the manager approves | `POST /api/stock-takes/:id/approve` | 422, code `SAME_COUNTER`, no movement — one counted line is enough to disqualify the approver | TC-20 |
| UC09-11c | Error | The manager counts P1 (8), the pharmacist saves the same line again (8) and submits; the manager approves | `POST /api/stock-takes/:id/approve` | 422, code `SAME_COUNTER`, no movement, stock still 10 — an overwritten count still disqualifies (#215) | TC-20 |
| UC09-11d | Error | The pharmacist counts; the manager submits, returns the take for recount, the pharmacist resubmits; the manager approves | `POST /api/stock-takes/:id/approve` | 422, code `SAME_COUNTER`, no movement — an earlier submitter still disqualifies (#215) | TC-20 |

Source: `src/backend/test/stock-takes.e2e-spec.ts` (e2e, `npm run test:e2e`).

## BR09 Effective-dated prices

Rule: a sale is valued at the price in force on the sale date, and a price
change never alters a past sale or report
([business-rules.md](../requirements/business-rules.md), BR09, decision 12).
`PriceBook` reads the `medicine_prices` history: the price in force on a date is
the newest row whose `effectiveFrom` is not after that date. That lookup is one
SQL query, so it is tested against the real database rather than with a mocked
manager. Scheduling a price from UC13 is not built yet, so a change made in the
app starts on the business day it is saved.

### Database level — `PriceBook`

| Test | Kind | Given | When | Then | TC |
|---|---|---|---|---|---|
| BR09-01 | Normal | 1500 from 01/10, 1800 from 10/10 | `pricesOn` 05/10 and 12/10 | `1500.00`, then `1800.00` | TC-41 |
| BR09-02 | Edge | Same two prices | `pricesOn` 09/10 and 10/10 | `1500.00` the day before, `1800.00` on the start date itself | TC-41 |
| BR09-03 | Edge | 1800 from 10/10, 2000 from 20/10 | `pricesOn` 12/10 and 20/10 | `1800.00`: a later price does not apply early; `2000.00` from its date | — |
| BR09-04 | Error | Only a price from 20/10 | `pricesOn` 12/10; and with no medicines | No price for the medicine; an empty list gives an empty map | — |
| BR09-05 | Edge | 1500 from 01/10, 1800 then 1900 both saved for 10/10 | `setPrice` twice on 10/10 | Two rows: 01/10 `1500.00`, 10/10 `1900.00`; 05/10 still `1500.00` | TC-41 |
| BR09-06 | Normal | Medicine A 1500 from 01/10; B 3200 from 05/10 and 3500 from 15/10 | `pricesOn` both on 12/10 | A `1500.00`, B `3200.00` | — |

A mutation check: with `<=` changed to `<` in the query, BR09-02 and BR09-03
fail.

### Through the API — UC01 and UC07

| Test | Kind | Given | When | Then | TC |
|---|---|---|---|---|---|
| UC01-05 | Normal | A medicine created on 12/10/2026 at 1500; the same day's price corrected to 1600; then the clock moves to 13/10 and the price changes to 1800 | `PATCH /api/medicines/:id` with `currentPrice` | Same day: still one `medicine_prices` row — the day is corrected, not appended. Next day: 2 rows, `currentPrice` `1800.00`; `PriceBook.pricesOn(…, '2026-10-12')` still `1600.00` | TC-41 |
| UC07-03 | Normal | Batch A = 10 at `2200.00`; `2500.00` saved with `effectiveFrom` 14/10/2026 | Sell 1 on 13/10, move the clock to 14/10, sell 1 | First line `unitPrice` `2200.00`, second `2500.00`, receipt `RC-20261014-0001`; reading the first sale again still returns `totalAmount` `2200.00` | TC-40, TC-41 |

Source: `src/backend/test/price-book.e2e-spec.ts` (BR09-01…06),
`src/backend/test/medicines.e2e-spec.ts` (UC01-05),
`src/backend/test/sales.e2e-spec.ts` (UC07-03) (e2e, `npm run test:e2e`).

## BR10 Prescription validity

Rule: a prescription is dispensed only within issue date + 5 days, computed by
the system, never edited or extended, and checked again at every visit
([business-rules.md](../requirements/business-rules.md), BR10).

### Unit level — the validator

Business date `2026-10-19`. `validUntil` is the last day the prescription may
be used, both to verify and to dispense.

| Test | Kind | Given | When | Then | TC |
|---|---|---|---|---|---|
| BR10-01 | Normal | Issued 2026-10-14 | `validUntil('2026-10-14')` | `2026-10-19` — five days from the issue date | TC-38 |
| BR10-02 | Edge | Issued 2026-10-29, then 2026-12-30 | `validUntil` | `2026-11-03`, then `2027-01-04` — the window crosses a month and a year end | — |
| BR10-03 | Edge | `validUntil` equals the business date `2026-10-19` | `assertDispensable`; `isExpired('2026-10-19', …)` | Allowed; not expired — the last day still counts | TC-38 |
| BR10-04 | Error | `validUntil` `2026-10-18` | `assertDispensable`; `isExpired` | Rule BR10, code `PRESCRIPTION_EXPIRED`; expired | TC-38 |
| BR10-05 | Error | Status `RECEIVED`, `validUntil` `2026-10-18` | `assertVerifiable` | Rule BR10, code `PRESCRIPTION_EXPIRED` — an expired prescription cannot be verified either | TC-38 |

Source: `src/backend/src/prescriptions/prescription-validator.spec.ts` (unit,
`npm test`).

### Through the API — UC05 and UC06

| Test | Kind | Given | When | Then | TC |
|---|---|---|---|---|---|
| UC05-11 | Edge | Prescription issued 2026-10-13, so valid until 2026-10-18 | Clock at 23:30 on 18/10, then at 00:30 on 19/10 (Vietnam); verify | On the last day the list shows `isExpired: false`; after midnight the verify is 422 `PRESCRIPTION_EXPIRED` and the record shows `isExpired: true`, status still `received` | TC-38 |
| UC06-08 | Edge | A = 10; verified prescription for 4, valid until 2026-10-18 | Hand over 2 at 17:00 on 18/10, then 2 at 00:30 on 19/10 | The first hand-over is 201 (partial, with a note); the second is 422 `PRESCRIPTION_EXPIRED` — the date is checked again at every visit | TC-38 |

Source: `src/backend/test/prescriptions.e2e-spec.ts` (UC05-11),
`src/backend/test/dispensing.e2e-spec.ts` (UC06-08) (e2e,
`npm run test:e2e`).

## BR11 Returns go to quarantine

Rule: returned goods never go straight back to sellable stock; they enter the
quarantine of the batch they were sold from, as PENDING_ASSESSMENT. Only an
approved assessment releases them; goods that fail wait in pending
destruction until a destruction record is made
([business-rules.md](../requirements/business-rules.md), BR11, DEC-04).

### Ledger level — the commands

Quantities are written `[sellable, quarantine, pending destruction]`.

| Test | Kind | Given | When | Then | TC |
|---|---|---|---|---|---|
| LEDGER-W7-03 | Edge | Batch of 10 that expired on 2026-10-01 and is RECALLED | `receiveReturn` of 2 | One RETURN movement, quarantine +2, sellable unchanged: `[10, 2, 0]` — whatever the status or expiry | TC-50 |
| LEDGER-W7-06 | Normal / Error | 3 returned into an active batch of 10 expiring 2027-06-30 | `release` 2; then release from a held batch, an expired one and one of a controlled medicine | First: RELEASE, `[12, 1, 0]`; the others are 422 `CANNOT_RELEASE` (held, "expired on 2026-10-01", "controlled") | TC-61 |
| LEDGER-W7-07 | Normal / Error | 2 in quarantine | `reject` 3, then 2 | 3 is refused (BR03, `INSUFFICIENT_STOCK`); 2 is REJECT: `[10, 0, 2]` | TC-61 |
| LEDGER-W7-08 | Error / Normal | 5 pending destruction | `destroy` with a blank reason, then 6, then 5 | 400 on `reason`; 6 refused (BR03); 5 is DESTROY: `[0, 0, 0]` | — |

Every row ends with `findLedgerMismatches` empty (BR05).
Source: `src/backend/test/stock-ledger.e2e-spec.ts` (e2e, `npm run test:e2e`).

### Through the API — UC08

| Test | Kind | Given | When | Then | TC |
|---|---|---|---|---|---|
| UC08-01 | Normal | Batch A = 10; an over-the-counter sale of 5 | Return 2 with a reason | One return line `pending_assessment`; one RETURN movement into A: sellable 5, quarantine 2; sale PARTIALLY_RETURNED; refund 4400.00 at the price paid | TC-16 |
| UC08-04 | Normal | A sale of 5 split by FEFO over E (2) and L (10) | Return 1 from each line | One RETURN per line, each into its own batch: E quarantine 1, L quarantine 1 | — |
| UC08-05 | Edge | Batch A (expires 2026-10-20) sold from, then RECALLED; clock moved to 2026-10-25 | Return 2 | Accepted: A stays RECALLED, sellable 5, quarantine 2 | TC-50 |
| UC08-06 | Edge | A controlled medicine handed over (4) and billed | Return 1 of the billed line | Into the hand-over's batch: sellable 6, quarantine 1; the prescription's dispensed quantity stays 4 | — |

Source: `src/backend/test/returns.e2e-spec.ts` (e2e, `npm run test:e2e`).
The assessment screens (release and reject from UC11) are *Should* (FR-46, FR-47)
and not built yet; the ledger rows above are what they will call.

## Coverage

| Rule | Unit tests | E2E tests | Manual run in `tests/manual/runs.md` |
|---|---|---|---|
| BR01 | 7 (BR01-01…07) | UC06-01 "7 from A=3 (expires first) and B=8 leaves A=0, B=4…" in `test/dispensing.e2e-spec.ts`; BR05-11 "a receipt then a hand-over over two FEFO batches…" in `test/ledger-invariant.e2e-spec.ts` (#123) | TC-04, run 9, 2026-10-20, pass |
| BR02 | 9 (BR02-01…09) | UC06-03 "a batch expiring on or before the business date is never issued"; UC06-10 "preview shows the batches and warnings" — both in `test/dispensing.e2e-spec.ts` | TC-06, run 10, 2026-10-20, pass |
| BR03 | 3 (BR03-U1…U3) | 5 rows (BR03-01…03, UC06-13; UC06-14 is the BR07 check) | TC-09, run 11, 2026-10-20, pass; TC-10, run 18, 2026-10-20, pass; TC-25, TC-26, TC-54 not run |
| BR04 | 6 (BR04-01…06) | 3 rows (UC05-08 "a pharmacist verifies a prescription", UC06-07 "a prescription that is not verified cannot be dispensed", UC07-05 "prescription-only and controlled medicines are refused on their lines") | TC-12, run 28, 2026-10-22, pass; TC-13, run 29, 2026-10-22, pass; TC-14, run 30, 2026-10-22, pass; TC-36, run 21, 2026-10-20, pass; TC-58, run 13, 2026-10-20, pass |
| BR05 | 2 (BR05-U1, U2) | 13 rows (BR05-01…06 in `test/stock-ledger.e2e-spec.ts`, BR05-11…17 in `test/ledger-invariant.e2e-spec.ts`) | TC-16, run 47, 2026-10-27, pass; TC-19, run 35, 2026-10-22, pass; TC-25 not run |
| BR07 | 5 (BR07-01…05) | 4 rows (UC05-10 "a prescription that has been dispensed cannot be edited", UC06-05 "a smaller hand-over needs a note", UC06-06 "a second visit may take the rest", UC06-14 "two pharmacists dispensing the same item at once") | TC-09, run 11, 2026-10-20, pass; TC-37, run 31, 2026-10-22, pass; TC-54 not run |
| BR10 | 5 (BR10-01…05) | 2 rows (UC05-11 "past valid-until cannot be verified", UC06-08 "refused after valid-until, checked again at every visit") | TC-38, run 32, 2026-10-22, pass |
| BR06 | 0 named (no pack-unit test; the ledger guard `refuses an empty or fractional movement as a programming error` in `src/backend/src/stock/stock-deltas.spec.ts` covers code, not input) | 4 rows (UC03-03, UC07-11, UC09-08, UC01-13) | TC-02, run 25, 2026-10-21, pass; no case for pack → base conversion (BR06 is *Could*) |
| BR08 | 0 (no spec for `src/backend/src/stocktake/`) | 6 rows (UC09-02, UC09-06, UC09-11, UC09-11b, UC09-11c, UC09-11d) | TC-20, run 37, 2026-10-22, pass; TC-19, run 35, 2026-10-22, pass; TC-51 not run |
| BR09 | 0 (the rule is one SQL query; see the database rows) | 8 rows (BR09-01…06 in `test/price-book.e2e-spec.ts`; UC01-05, UC07-03) | TC-40, TC-41 not run |
| BR11 | 0 (ledger commands are tested end to end) | 8 rows (LEDGER-W7-03, 06, 07, 08; UC08-01, 04, 05, 06) | TC-50, run 48, 2026-10-27, pass; TC-16, run 47, 2026-10-27, pass; TC-61 not run (assessment screens are *Should*) |

After every test that moves stock, `findLedgerMismatches` must find nothing
(BR05).
