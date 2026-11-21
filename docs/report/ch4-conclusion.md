# Chapter 4 — Conclusion

> **W10-A2 (#83), written by Tiến.** Describes `main` at `9063509`
> (22/11/2026). §4.3 must be re-checked against the open issues on the day
> `v1.0` is tagged: every defect still open then is listed there. §4.5 is
> written by each member in their own words.

## 4.1 What was completed against what was proposed

The Proposal committed to 13 Must use cases and named three Should use cases
that would start only if the Must core was finished by week 7. All 16 were
built, with the eight Must business rules (BR01–05, BR07, BR10, BR11) and the
two Should rules (BR08, BR09) enforced in the service layer and covered by
named tests. Table 4.1 sums up each part.

*Table 4.1 — Proposed against completed*

| Part of the Proposal | Proposed | Completed |
|---|---|---|
| Must use cases | 13 (UC01–UC12, UC16) | 13, each from screen to database, surviving a restart |
| Should use cases | UC13, UC14, UC15 after the week 7 gate | All three, after the gate passed; the audit log does not cover price changes (§4.3) |
| Should extras | Quarantine assessment and destruction (FR-46, FR-47); backup and restore | Built; TC-61 (release, reject, destroy) and TC-30 (restore gives identical balance checksums) pass |
| Could | BR06 unit conversion; report export | BR06 not built; report export built as CSV, plus printed receipts, return slips and hand-over records |
| Requirements | 48 FR, 13 NFR, all traced | 48 FR, 13 NFR, traced FR → UC → code → test → status in `traceability-matrix.md` |
| Releases | `v0.1` week 5, `v0.2` week 7, `v1.0` week 9 | `v0.1` and `v0.2` on time; `v1.0` later than planned (§4.3) |
| Tests | 63 test cases, ≥ 45 run by someone other than the author | 65 test cases; 307 automated end-to-end and 109 unit tests run on every pull request in CI |
| Quality targets | NFR-01, 02, 13 on a reference machine | Met by a wide margin: 22 ms, 71 ms and 258 ms against 1 s, 3 s and 2 s (TC-29) |

## 4.2 Achievements

- **The stock rules hold under concurrency, not only in a single session.**
  Every quantity change goes through one class, `StockLedger`, in one
  transaction, after locking the medicines in a fixed order. Twenty rounds of
  two pharmacists or two sessions racing for the last units never produced
  negative stock or more than was prescribed (TC-26, TC-54, TC-62).
- **Every number can be explained.** The ledger is append-only; a batch's
  quantity in each state always equals the sum of its movements, which a test
  checks after every scenario (NFR-08), and the batch history names the
  document behind every movement.
- **Permissions are enforced where they matter.** Each service checks the
  permission before anything else; the automated role × route matrix (TC-53)
  covers all 77 routes for all three roles.
- **The process was real teamwork with evidence.** Protected `main`, one
  approval and green CI per pull request, a review rotation, tests run by a
  member other than the author, weekly reports and a leader's weekly review on
  GitHub.

## 4.3 Limitations

Not built, or built only in part:

- **Audit log coverage** (part of FR-41). Sign-ins, user and role changes,
  password resets and approved stock takes are audited. Price changes are not written to the audit
  log (the price history still records who set each price), and stock-take
  approvals are the only stock decision in it.
- **Unit-of-measure conversion** (BR06, FR-42, Could): all quantities are in the
  base unit.
- **Report export** is CSV only, not Excel or PDF as FR-43 suggested.

Known defects. All are severity S4 (cosmetic). Each has a fix on `main`; the
issue stays open until someone other than the author re-tests it:

| Issue | Defect | Fix |
|---|---|---|
| #209 | Batch history showed an internal id instead of the slip number for returns and stock-take adjustments | #220; re-tested in run 73 (#245) |
| #254 | Dates and times were shown in three formats | #262 |
| #255 | Some forms took "today" from the browser clock instead of the server's business date | #266 |
| #256 | "Cannot reach the server" was shown twice | #266 |
| #257 | A session that expired while the tab was closed returned to sign-in without saying why | #266, #288 |
| #258 | Ant Design 6 deprecation warnings in the browser console | #262 |
| #279 | Customer search by phone matched only when spaces were typed the same way | #284 |

Limitations of the process and the evidence:

- **Late start.** Duy Anh and Minh made no commits in weeks 2–4 and nobody
  committed in week 4, so week 5 carried two weeks of work. The review rotation
  and weekly reviews introduced in week 5 fixed the pattern from then on.
- **`v1.0` was tagged after the planned week 9 freeze**, because the final
  regression and several test-log pull requests waited for review in weeks 8–9.
- **Validation is informal.** The business decisions were reviewed by one
  practising pharmacist, a relative of the team leader; usability was checked
  with people outside the team only at the end (TC-32).
- **Simulated data only**, one pharmacy, one storage location, run locally.

## 4.4 Future work

1. A forced password change at the next sign-in after the manager resets one.
2. Audit entries for price changes and for every manager decision on stock
   (write-off, quarantine assessment, destruction), shown in one audit view.
3. Pack-unit conversion at receipt and dispensing (BR06).
4. Barcode scanning of batch labels at receipt and at the counter.
5. Reorder suggestions from the stock movement history, then purchase orders.
6. More than one storage location, and a hosted deployment with backups on a
   schedule.

## 4.5 Knowledge and skills gained

*Each member writes their own paragraph here (outline: "in their own words").*

**Võ Việt Tiến** — _(to be written by Tiến)_

**Bùi Duy Anh** — _(to be written by Duy Anh)_

**Võ Hoàng Minh** — _(to be written by Minh)_
