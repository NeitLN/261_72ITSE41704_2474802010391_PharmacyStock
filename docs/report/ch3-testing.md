# Ch.3 Testing — draft (W08-C3, #72)

> Draft by Minh, 30/10/2026. Figures are as of `main` on that date and are
> refreshed on `v1.0` in week 9: the case table, the counts and the open
> defects. Sources: [`test-cases.md`](../../tests/manual/test-cases.md),
> [`runs.md`](../../tests/manual/runs.md), [`tests/README.md`](../../tests/README.md),
> the bug issues on GitHub.

## 3.y.1 How the system was tested

Two kinds of tests were kept, for different risks.

**Automated tests** run on every pull request in GitHub Actions, against a
PostgreSQL 18 service. The *Backend* and *Frontend* checks are required on
`main`, and the branch must be up to date with it, so a pull request cannot
merge while they fail. Unit tests cover the rules that need no database:
FEFO allocation, prescription validity, the sign of each movement type, the
error response format, and service rules with the database replaced. The
web client has its own 21 tests, for example for number fields. End-to-end
tests start the real application on its own test database and call the API
as each role. Every Must business rule (BR01–BR05, BR07, BR10, BR11) has
tests named after it (`BR01-…`), and every use case has tests named
`UCxx-…`. On 29/10/2026 there were 125 backend unit tests and 548 end-to-end
tests in 22 files, all passing. Two kinds of end-to-end test go further than
single calls:

- **Races** (`races.e2e-spec.ts`): a sale and a dispensing, or two
  dispensings, fight over the last units, twenty rounds each on fresh data.
  Each round must end with exactly one success, one refusal and no negative
  stock (TC-26, TC-54, TC-62, BR03).
- **The ledger invariant** (`findLedgerMismatches`): after the tests that
  move stock, the cached quantities of every batch must equal the sum of its
  movements (BR05).

**Manual test cases** check what a user sees. The 63 cases of Proposal v1.1
(Appendix C) were extended to 65 (TC-64, receipt expiry; TC-65, the 404 and
403 screens). Each case names its author and a different runner: the person
who built a feature never signs off their own case. Each run is one line in
`runs.md` with the date, the runner, the commit, what was seen and the
verdict, with a screenshot per step in `tests/manual/evidence/`. Runs were
made on a freshly seeded database. Most were driven by Playwright scripts
that click through the web client exactly as a user would, and the database
was then checked directly where the expected result is about stock.

## 3.y.2 Results

*Table 3.y — Manual test cases by result on 05/11/2026.*

| Result | Cases |
|---|---|
| Pass | 56 |
| Fail | 0 |
| Not run yet | 9 |
| **Total** | **65** |

The 9 not run yet are planned for weeks 8 and 9: the race and stress cases
(TC-26, 27, 54), performance and backup (TC-29, 30), the Should feature
TC-41, the outside-user and fresh-clone checks (TC-32, 33) and the
submission check (TC-34). First runs of TC-26, 29, 30, 41 and 54 are
recorded in pull requests still under review on 05/11. *The final version
replaces this table with the full case table and actual results from
`test-cases.md` on `v1.0`.*

By 05/11, 98 runs were recorded, 95 passing and 3 failing (runs 77–84, still
under review, are not counted). Every failure led to a defect that was fixed
and re-run (Table 3.z).

## 3.y.3 Defects found and fixed

*Table 3.z — Defects found by testing and review.*

| Defect | Found by | Severity | Fix | Re-test |
|---|---|---|---|---|
| #125 Receipt form turned an invalid quantity (0, −1, 2.5) into a valid one | TC-02, runs 4–5 | S3 | #126 | Run 14, Pass |
| #183 Price field turned 10.5 into 105 | Exploratory testing (#77) | S3 | #197, #249 | Run 76, Pass |
| #185 Some field errors showed the validator's default text | Exploratory testing (#77) | S4 | #197 | API re-test 31/10 (Duy Anh), Pass |
| #184 A medicine with all batches at 0 could not be counted | Exploratory testing (#77) | S3 | #212 | Run 72 (TC-19), Pass |
| #201 A licence differing only in letter case was accepted | TC-49, run 55 | S3 | #205 | Run 64, Pass |
| #209 Batch history showed return lines by id, not slip number | TC-18, run 60 | S4 | #220 | Run 73 (TC-48), Pass |
| #215 A manager whose count was overwritten could approve it | Code review | S3 | #226 | Runs 69–70 (TC-51, TC-20), Pass |
| #244 A price of five digits or more, typed key by key, was saved much smaller | Re-test of #183 (31/10) | S2 | #249 | Run 75, Pass |
| #263 The audit log's role-change row did not name the user | TC-44, run 74 | S4 | #272 | Pending |

No S1 defect was found. The one S2, #244, was caused by the fix for #183
and found when #183 was re-tested by hand: `100000` typed into the price
field was saved as 10 ₫, with no error. Two lessons were applied in the
process itself:
- `main` stopped building once on 24/10, when two pull requests each passed
  CI but were never tested together. Merging now requires the branch to be up
  to date with `main`.
- Stacked pull requests ran without CI, so CI was turned on for every pull
  request (#193).

*Every defect still open at the `v1.0` tag is listed under Limitations in
Ch.4.*

## 3.y.4 Regression pack R

Sixteen manual cases are re-run before every tag (`v0.1`, `v0.2`, `v1.0`),
on a freshly seeded database. They cover receipts, the dispensing rules,
sales and returns, stock control, access and one end-to-end flow (TC-31,
from receiving to the report). In week 7, B's and C's areas were run on
27/10 (runs 39–53), and A's area on 29/10 (runs 67–68, Duy Anh). In
week 8, once every Should feature was on `main`, the areas they touch were
run again on 03/11 (runs 85–89, `0da5088`): a return into quarantine and the
new release from it, an oversell refused while stock sits in quarantine, a
stock take with a difference, and the low-stock alert. All passed, and the
ledger check found no batch whose quantities differ from its movements. The
automated tests passed on the same commit (126 unit, 644 end-to-end, 29 web
client).

On 04/11 eleven more pull requests were merged (printing, the overview page,
CSV export, a confirmation before removing a cart line, customer history),
and they changed the dispensing, cart, returns and billing screens. So on
05/11 the regression was run again on `b807fd7` (runs 93–105): the
dispensing rules (TC-04, 06, 07, 09, 12), sales and returns (TC-15, 16, 35,
50), stock control (TC-19, 21), the quarantine release and the end-to-end
flow (TC-31). All passed, and the ledger check again found no difference.
Receipts (TC-01, 03) were not re-run, as their screens changed only in an
empty-table text. TC-28 and TC-43 (access) were left to their runner, Duy
Anh, because Minh wrote that code. TC-19 and TC-21 are also Minh's, so those
re-runs check for regressions and do not replace Duy Anh's acceptance runs.
The week-8 runs used the working database, not a fresh one, because TC-40
needed a price scheduled for 04/11. The whole pack is run again on a fresh
database before `v1.0` (#81).

*Table 3.w — Pack R and its result on each tag. To be filled from `runs.md`
for `v0.2` and `v1.0`.*

## 3.y.5 What testing could not show

- **Real users.** The system has not been used by pharmacy staff. TC-32 is a
  short trial with two people outside the team, against the usability
  thresholds; it shows whether the screens can be learned, not whether they
  suit a busy counter.
- **Load.** TC-29 measures search, report and counter times on a seeded
  database of realistic size on one machine, not many users at once beyond
  the twenty-round races.
- **Local crashes on Windows.** Long end-to-end runs on one Windows machine
  sometimes ended with "Worker exited unexpectedly", a native crash of
  Node.js itself. CI on Linux never showed it, so the CI result is the one
  recorded (see `tests/README.md`).
