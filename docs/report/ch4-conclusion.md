# Chapter 4 — Conclusion

> **W10-A2 (#83), written by Tiến.** Describes `main` at `9063509`
> (22/11/2026). *Limitations* must be re-checked against the open issues on
> the day `v1.0` is tagged: every defect still open then is listed there.
> §4.2 is written by each member in their own words.

## 4.1 Summary

### Summary of completed work

The Proposal committed to 13 Must use cases and named three Should use cases
that would start only if the Must core was finished by week 7. All 16 were
built, with the eight Must business rules (BR01–05, BR07, BR10, BR11) and the
two Should rules (BR08, BR09) enforced in the service layer and covered by
named tests. Table 4.1 sums up each part. Strengths and weaknesses of the system itself are
weighed in Ch.3 §3.4.2; this section is about the project as a whole.

*Table 4.1 — Proposed against completed*

| Part of the Proposal | Proposed | Completed |
|---|---|---|
| Must use cases | 13 (UC01–UC12, UC16) | 13, each from screen to database, surviving a restart |
| Should use cases | UC13, UC14, UC15 after the week 7 gate | All three, after the gate passed |
| Should extras | Quarantine assessment and destruction (FR-46, FR-47); backup and restore | Built; TC-61 (release, reject, destroy) and TC-30 (restore gives identical balance checksums) pass |
| Could | BR06 unit conversion; report export | BR06 not built; report export built as CSV, plus printed receipts, return slips and hand-over records |
| Requirements | 48 FR, 13 NFR, all traced | 48 FR, 13 NFR, traced FR → UC → code → test → status in `traceability-matrix.md` |
| Releases | `v0.1` week 5, `v0.2` week 7, `v1.0` week 9 | `v0.1` and `v0.2` on time; `v1.0` later than planned (*Limitations* below), then `v1.0.1` with the code-review fixes |
| Tests | 63 test cases, ≥ 45 run by someone other than the author | 65 test cases; 131 unit, 656 end-to-end (12 skipped) and 44 web-client tests, run on every pull request in CI (counts on `v1.0.1`) |
| Quality targets | NFR-01, 02, 13 on a reference machine | Met by a wide margin: 22 ms, 71 ms and 258 ms against 1 s, 3 s and 2 s (TC-29) |

### Achievements and outcomes

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
  covers all 81 routes for all three roles.
- **The process was real teamwork with evidence.** Protected `main`, one
  approval and green CI per pull request, a review rotation, tests run by a
  member other than the author, weekly reports and a leader's weekly review on
  GitHub.

### Limitations

Not built, or built only in part:

- **Audit view coverage.** Sign-ins, user and role changes, password resets,
  price changes and approved stock takes are audited (FR-41). Write-offs,
  quarantine assessments and destructions are in the stock ledger with their
  user, not in the audit view.
- **Sign-in throttling lives in one server process.** The count of wrong
  passwords is kept in memory, so it starts again after a restart and would
  not be shared by a second server; enough for one pharmacy on one machine.
- **Unit-of-measure conversion** (BR06, FR-42, Could): all quantities are in the
  base unit.
- **Report export** is CSV only, not Excel or PDF as FR-43 suggested.

Defects. Every defect found was severity S4 (cosmetic) or fixed (Ch.3,
Table T.2). The S4 defects of the last weeks were all fixed and re-tested by
someone other than the author on `v1.0`, except #299, which was fixed in
`v1.0.1` and not yet re-tested by hand (Table 4.D):

*Table 4.D — The S4 defects of weeks 7–10 and their state at `v1.0`.*

| Issue | Defect | Fix |
|---|---|---|
| #209 | Batch history showed an internal id instead of the slip number for returns and stock-take adjustments | #220; re-tested in run 73 (#245) |
| #254 | Dates and times were shown in three formats | #262; re-tested 26/11 (run 124) |
| #255 | Some forms took "today" from the browser clock instead of the server's business date | #266; re-tested 26/11 (run 125) |
| #256 | "Cannot reach the server" was shown twice | #266; re-tested 26/11 (run 126) |
| #257 | A session that expired while the tab was closed returned to sign-in without saying why | #266, #288; re-tested in run 123 |
| #258 | Ant Design 6 deprecation warnings in the browser console | #262; re-tested 26/11 (run 127) |
| #279 | Customer search by phone matched only when spaces were typed the same way | #284; re-tested 26/11 (run 128) |
| #299 | The Alerts tab's empty text talks about low stock whatever the filter | Fixed in `v1.0.1`; not re-tested by hand |

Limitations of the process and the evidence:

- **Late start.** Duy Anh and Minh made no commits in weeks 2–4 and nobody
  committed in week 4, so week 5 carried two weeks of work. The review rotation
  and weekly reviews introduced in week 5 fixed the pattern from then on.
- **`v1.0` was tagged after the planned week 9 freeze**, because the final
  regression and several test-log pull requests waited for review in weeks 8–9.
- **Validation is informal.** The business decisions were reviewed by one
  practising pharmacist, a relative of the team leader, and the week-5
  follow-up on DEC-09 and DEC-10 was never held, so those two stay team
  decisions (see the Proposal feedback table). Usability with people outside
  the team (TC-32) was left to the end of the project.
- **Simulated data only**, one pharmacy, one storage location, run locally.

### Future work

1. A forced password change at the next sign-in after the manager resets one.
2. Audit entries for every manager decision on stock (write-off, quarantine
   assessment, destruction), shown in the audit view next to price changes.
3. Pack-unit conversion at receipt and dispensing (BR06).
4. Barcode scanning of batch labels at receipt and at the counter.
5. Reorder suggestions from the stock movement history, then purchase orders.
6. More than one storage location, and a hosted deployment with backups on a
   schedule.

## 4.2 Knowledge and Skills Gained

Each member wrote their own paragraph, in their own words, covering the
template's three points: technical skills, professional skills and practical
experience. The paragraphs are kept in `ch4-skills-tien.md`,
`ch4-skills-duy-anh.md` and `ch4-skills-minh.md`, and the report build places
them here.
