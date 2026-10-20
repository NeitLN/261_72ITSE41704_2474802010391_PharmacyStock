# Business rule scenarios — BR01, BR02, BR03

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

## Coverage

| Rule | Unit tests | E2E tests | Manual run in `tests/manual/runs.md` |
|---|---|---|---|
| BR01 | 7 (BR01-01…07) | UC06-01 "7 from A=3 (expires first) and B=8 leaves A=0, B=4…" in `test/dispensing.e2e-spec.ts`; BR05-01 "a receipt then a hand-over over two FEFO batches…" in `test/ledger-invariant.e2e-spec.ts` (#123) | TC-04, run 9, 2026-10-20, pass |
| BR02 | 9 (BR02-01…09) | UC06-03 "a batch expiring on or before the business date is never issued"; UC06-10 "preview shows the batches and warnings" — both in `test/dispensing.e2e-spec.ts` | TC-06, run 10, 2026-10-20, pass |
| BR03 | 3 (BR03-U1…U3) | 5 rows (BR03-01…03, UC06-13; UC06-14 is the BR07 check) | TC-09, run 11, 2026-10-20, pass; TC-10, TC-25, TC-26, TC-54 not run |

After every test that moves stock, `findLedgerMismatches` must find nothing
(BR05).
