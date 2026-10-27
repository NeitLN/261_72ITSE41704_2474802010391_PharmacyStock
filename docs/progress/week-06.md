# Week 6 — Prescription rules, sales, stock take (19/10–25/10/2026)

> Living report. Last updated **27/10/2026** (leader's review); closed on Sunday 25/10.
> Process: [CONTRIBUTING — the weekly cycle](../../CONTRIBUTING.md#the-weekly-cycle).

## Planned

From [`tuan-06.md`](../plan/tuan-06.md), milestone *Week 06 — Testing and
validation*: prescription rules BR04/BR07/BR10 in a validator; UC07 sales
(over the counter, and billing a dispensing without a second stock movement);
UC04 stock lookup; UC09 stock take; UC10 low-stock alerts; the BR05 invariant
tested; the first round of cross testing, with at least 25 runs in `runs.md`.

## Delivered so far

| Item | Owner | Evidence | Status |
|---|---|---|---|
| UC04 design gate | Tiến | #138 | Merged 22/10 |
| UC04 stock lookup and batch history; movements stamped when written | Tiến | #139 | Approved, re-approval needed after the base changed |
| Consistent error handling, endpoint × invalid-input table | Tiến | #140 | Merged 22/10 |
| Runs of B's cases TC-05, 07, 08, 10, 11, 35, 36, 55 (runs 15–22) | Tiến | #137 | Merged 22/10 |
| Receipt and catalogue number fields (bug #125) | Tiến | #126 | Merged 19/10; TC-02 Pass on re-run (run 14, Minh) |
| TC-64 for the receipt expiry check; FR-42/43 note | Tiến | #130 | Merged 19/10 |
| UC07 design gate | Duy Anh | #121 | Merged 20/10 |
| `PrescriptionValidator` (BR04, BR07, BR10) | Duy Anh | #122 | Merged 20/10 |
| BR05 append-only ledger end to end | Duy Anh | #123 | Merged 20/10 |
| UC07 over-the-counter sale, backend and cart | Duy Anh | #135, #136 | Merged 20/10; TC-35, 36, 55 Pass (runs 20–22) |
| BR worked examples, BR01–03 scenario table, number fields on prescription and dispense forms | Duy Anh | #132, #134, #133 | Merged 20/10 |
| UC07 billing a dispensing, backend | Duy Anh | #141 | Changes requested: rebase after #140, unknown `prescriptionId` as a field error |
| UC07 billing page | Duy Anh | #142 | Approved; goes in after #141 |
| All-zero hand-over message; UC14 specification | Duy Anh | #143, #144 | Merged 22/10 |
| UC09 and UC10 design gate | Minh | #145 | Waiting for Duy Anh's review |
| UC09 stock take | Minh | #146 | Waiting for review |
| UC10 low-stock alerts | Minh | #147 | Approved by Tiến (second reviewer); waiting for Duy Anh |
| Runs of A's cases TC-01, 02, 24, 45, 46; TC-53 role × endpoint e2e | Minh | #148 | Waiting for Duy Anh's review |
| TC-02 re-run after #126 | Minh | #131 | Merged 20/10 |

Not started: Duy Anh's runs of Minh's cases (TC-19, 20, 21, 39), which wait
for UC09 and UC10; Minh's TC-48 run, which waits for #139.

## Repository activity (19/10–22/10)

| Member | Commits on `main` | Pull requests opened · merged | Reviews given | Test runs recorded |
|---|---|---|---|---|
| Tiến (A) | 10 | 7 · 6 | 13 (#121–#123, #132–#136, #141–#144, #147) | 8 (runs 15–22) |
| Duy Anh (B) | 11 | 12 · 10 | 1 (#131) | 0 |
| Minh (C) | 10 | 6 · 6 (#131, #145–#148, #162) | 17 (#113, #124, #126, #137–#141, #149–#151, #161, #163–#167) | 7 (runs 14, 23–27, 34) |

## Meetings

**Wednesday 21/10 — early-warning check (online, Discord).** Present: Tiến,
Duy Anh, Minh. Scope: the week is still realistic — UC04, UC07, UC09 and
UC10 all planned to land this week. Blockers: code conflicts between pull
requests that touch the same files (UC07 billing with the error-handling
changes in `sales.service.ts`), and stacked pull requests waiting for review
one after another (Minh's #145 → #146 → #147). Reviews: the usual rotation —
Minh reviews Tiến, Tiến reviews Duy Anh, Duy Anh reviews Minh — by Friday
23/10.

| Action | Owner | By |
|---|---|---|
| Review UC09/UC10: #145, #146, #147, #148 | Duy Anh | Fri 23/10 |
| Review #141–#144 | Tiến | Fri 23/10 — done 22/10 (#141 changes requested, #142–#144 approved) |
| Run TC-48 once #139 is merged | Minh | Sat 24/10 |
| Run Minh's cases TC-19, 20, 21, 39 once UC09/UC10 are merged | Duy Anh | Sun 25/10 |

**Saturday 24/10.** _(to be filled in)_

## Risks

| Risk | Owner | Trigger | Mitigation | Next review |
|---|---|---|---|---|
| Review queue for Minh's stack (#145 → #146 → #147, #148) | Duy Anh | Not reviewed by Fri 23/10 | Review the design gate first; Tiến has already reviewed #147 | Fri 23/10 |
| Stacked pull requests lose their approval when their base merges | Each author | A merged base retargets the next PR to `main` | Re-approve the same commit, or merge the stack from the top down | Sat 24/10 |
| UC07 billing and UC09/UC10 not on `main` by Sunday | Duy Anh, Minh | Not merged by Sat 24/10 | Plan §8: over-the-counter first (done); billing early in week 7 | Sat 24/10 |
| `runs.md` below 25 | Minh, Duy Anh | Under 25 rows on Sat 24/10 | 22 on `main` now; #148 adds 5, TC-48 adds 1 | Sat 24/10 |

## Retrospective (Saturday 24/10)

_(to be filled in: keep / stop / try, one improvement chosen; did last
week's improvement — every review states the commit and what was run — hold?)_

## AI use this week

Rows for this week are in [`../ai-use-log.md`](../ai-use-log.md).

## Self-report and leader's weekly review — by Sunday 25/10

Members fill *Delivered* by the Saturday meeting; the evidence checker this
week is **Minh**; the reviewer fills the rest by Sunday
([process](../../CONTRIBUTING.md#leaders-weekly-review)).

| Member | Delivered (self-report, with links) | Reviewer's findings | Revisions (issue, severity, due) |
|---|---|---|---|
| Duy Anh (B) | UC07 over-the-counter sales merged (#121, #135, #136; TC-35/36/55 passing); `PrescriptionValidator` (BR04, BR07, BR10) and BR05 append-only ledger test merged (#122, #123); UC07 billing a dispensing (#141, #142) and documentation/form updates (#132–#134, #143, #144). Completed cross-testing for Minh's cases TC-19, 20, 21, 39 in `tests/manual/runs.md`. Reviews given for Minh's UC09/UC10 stack (#145–#148). Early week 7 prep: UI cancel (#164), 20x concurrency harness (#165), living traceability draft (#167), and UI run evidence (#168). | Tiến: a big, useful week. UC07 over-the-counter sale and billing a dispensing (#135, #136, #141, #142), `PrescriptionValidator` (#122) and the BR05 ledger test (#123) all merged; Minh's cases TC-19, 20, 21, 39 run on time with a screenshot per step (runs 35–38); and week 7 started early: the UC08 design gate (#160), cancelling a hand-over (#164), the 20-round races (#165), the traceability draft (#167). To change: 9 reviews against 32 pull requests opened, and only one (#131) before 23/10, so Minh's stack waited; #141 needed a second round (not rebased after #140, an unknown `prescriptionId` was not a field error); and 32 pull requests in a week, many a few lines of documentation, are hard to review and to follow. | #202 (`weekly-review`, S3, Sun 01/11) |
| Minh (C) | 20/10: TC-02 re-run Pass (run 14, #131), bug #125 closed; tag `v0.1` with its release note (#45 closed). 21–22/10: UC09/UC10 design gate and the UC09–12, UC16 specs (#145); UC09 stock take with blind count and strict BR08 (#146); UC10 low-stock alerts evaluated inside `StockLedger.run` (#147); runs 23–27 and 34 (TC-01, 02, 24, 45, 46, 48 all Pass) and the TC-53 role × endpoint matrix, 38 endpoints (#148); UC11/UC12 design gate (#162). Duy Anh's runs of my cases: TC-19, 20, 21, 39 Pass (runs 35–38). Reviews: #113, #124, #126, #137–#141, #149–#151, #161, #163–#167 (and #168–#182, #176, #177, #187 on 23–24/10). In review on 24/10: UC12 report (#189), UC11 expiry (#190), the build fix on `main` (#188). | Tiến: the most reviews in the team (35 this week), several with concrete fixes, including the detailed review of my week; the runs of my cases TC-01, 02, 24, 45, 46, 48 with database checks (runs 23–27, 34) and the TC-53 role × endpoint matrix over 38 endpoints (#148). To change: TC-64, a week-6 case with Minh as the runner, is still Not run; and the stacked pull requests (#145 → #146 → #147 → #148, then UC12/UC11 #189 and #190) waited on each other for re-approval, so only 6 of the 13 opened this week were merged by Sunday. | #203 (`weekly-review`, S3, Fri 30/10 for TC-64) |
| Tiến (A) | #137, #138, #139, #140 (UC04, error-handling table, runs 15–22); #126, #130 (bug #125, TC-64); reviews of #121–#123, #132–#136, #141–#144, #147 | Minh: a strong, well-evidenced week. UC04 went through its design gate first (#138) and the build caught a real ordering bug (`clock_timestamp()` for movements, #139); the endpoint × invalid-input table tests every cell and made errors consistent (#140); 14 runs of Duy Anh's cases with screenshots (runs 15–22, 28–33); the ledger's batch-status and quarantine commands (#178) landed when UC08 and UC11 needed them; and the design baseline (#151: ERD, class diagram, data dictionary, `ui-design.md`), the wireframes (#176) and the UI kit (#177) gave weeks 7–8 something to build to. To change: `main` stopped building on 24/10 because #177 and #179 were each green but never tested together (fixed in #188); and stacked PRs get no CI at all (#139 had none while its base was #138's branch). Both need the checks required and branches up to date before merge. Small: the stale "same timestamp" comment in `stock-lookup.service.ts` is still there. | #191 (`weekly-review`, S3, Wed 28/10) |

Revisions from last week: #125 fixed and re-run (run 14); #127 done (#133);
#129 done (#130); #128 status written, #9 and #18 still partly open; #15
complete with #144 (to be closed by its tester); #23 and #32 — #32 closed, #23 waits for Minh's specs of
UC09–12 and UC16 (#145).
