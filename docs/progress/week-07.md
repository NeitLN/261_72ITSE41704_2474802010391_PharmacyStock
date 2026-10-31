# Week 7 — Iteration 2: v0.2 (26/10–01/11/2026)

> Living report. Last updated **27/10/2026**; closed on Sunday 01/11.
> Process: [CONTRIBUTING — the weekly cycle](../../CONTRIBUTING.md#the-weekly-cycle).

## Planned

From [`tuan-07.md`](../plan/tuan-07.md), milestone *Week 07 — Iteration 2 —
v0.2*: the 13 Must use cases end to end, adding UC08 returns into quarantine,
UC11 expiry alerts and write-off, and UC12 the stock movement report; the
ledger's batch-status and quarantine commands; the Must-core gate (Should items
open in week 8 only if it passes); regression pack R from Thursday 29/10 and
the first TC-31 run; Appendix D and tag `v0.2` on Saturday 31/10.

## Delivered so far

| Item | Owner | Evidence | Status |
|---|---|---|---|
| Wireframes of UC08, UC11, UC12 for the design gate | Tiến | #176 (#154) | Merged 23/10 |
| Shared UI kit: theme tokens, status and class tags, formats | Tiến | #177 (#155) | Merged 23/10 |
| Batch status and quarantine commands in `StockLedger` | Tiến | #178 (#55) | Merged 23/10 |
| UC08 design gate | Duy Anh | #160 | Merged 22/10 |
| UC08 returns: find the sale, return into quarantine | Duy Anh | #174, #179 (#58) | Merged 23/10; TC-16, 50 Pass (runs 47, 48, in #199) |
| Cancel a previewed hand-over; TC-62/54/26 races × 20 | Duy Anh | #164, #165 (#59) | Merged 22/10 |
| UC11 and UC12 design gate | Minh | #162 (#153) | Merged 22/10 |
| UC12 stock movement report through `ReportGenerator` | Minh | #189 (#62) | Merged 26/10 |
| UC11 expiry list, write-off, batch status, expiry alerts | Minh | #190 (#61) | Merged 26/10 |
| Build fix on `main`; CI on every pull request; Windows e2e note | Minh | #188, #193, #194 | Merged 26/10 |
| TC-53 role × endpoint matrix, every endpoint | Minh | #195 | Merged 26/10 |
| Run steps for the UC06–UC08 cases still to run | Duy Anh | #196 | Approved by Tiến |
| Price field keeps a typed decimal; every field error worded (bugs #183, #185) | Tiến | #197 | Waiting for Duy Anh's review |
| Seed: sales, returns, release and reject over two months for TC-23 | Tiến | #198 (#57) | Waiting for Minh's review |
| Regression pack R, B's and C's areas, and TC-31 | Tiến | #199 (#56), runs 39–53 | Waiting for Duy Anh's review |

Not run yet: TC-17, 18, 22, 23, 56, 59, 60, 62 and 49. Not started: the
Must-core gate (#63, Minh), the regression of A's area (Duy Anh), Appendix D
and tag `v0.2` (#60, Duy Anh).

## Repository activity (26/10–27/10)

| Member | Pull requests opened · merged | Reviews given | Test runs recorded |
|---|---|---|---|
| Tiến (A) | 3 · 0 (#197–#199) | 5 (#189, #190, #192, #195, #196) | 15 (runs 39–53, in #199) |
| Duy Anh (B) | 1 · 0 (#196) | 7 (#188–#190, #192–#195) | 0 |
| Minh (C) | 0 · 7 (#188–#190, #192–#195, opened earlier) | 0 | 0 |

## Meetings

**Wednesday 28/10 — early-warning check.** _(to be filled in at the meeting)_
Points to raise: UC08 is on `main` (plan deadline 28/10); is the Must-core
gate (#63) on track for Friday; who runs TC-17, 18, 59, 62 (plan: Minh) and
TC-22, 23, 56 (Duy Anh); reviews of #197, #198, #199; required CI checks on
`main` (#191).

**Saturday 31/10.** _(to be filled in: demo of the 13 Must use cases, Appendix
D scoring, sign-off and tag `v0.2`)_

## Risks

| Risk | Owner | Trigger | Mitigation | Next review |
|---|---|---|---|---|
| Pack R ran on `8c013a1`; code merged before the tag is not covered | Tiến | A code PR merges before Sat 31/10 | Re-run pack R on the tag commit; the data setup is scripted | Fri 30/10 |
| TC-23 needs the seeded two-month history | Minh (review), Duy Anh (run) | #198 not merged by Wed 28/10 | Review #198 first; the hand calculation can start from its SEED-05 figures | Wed 28/10 |
| Required CI checks still not enforced on `main` (#191) | Tiến | Another red `main` after a merge | Enable *Backend*, *Frontend* and *branches up to date* in the `protect-main` ruleset | Wed 28/10 |
| Must-core gate not checked before the tag | Minh | #63 not started by Thu 29/10 | Start from the runs already in `runs.md`; list only the gaps | Thu 29/10 |

## Retrospective (Saturday 31/10)

_(to be filled in: keep / stop / try, one improvement chosen; did last week's
improvement — required checks before merge — hold?)_

## AI use this week

Rows for this week are in [`../ai-use-log.md`](../ai-use-log.md).

## Self-report and leader's weekly review — by Sunday 01/11

Members fill *Delivered* by the Saturday meeting; the reviewer fills the rest
by Sunday ([process](../../CONTRIBUTING.md#leaders-weekly-review)).

| Member | Delivered (self-report, with links) | Reviewer's findings | Revisions (issue, severity, due) |
|---|---|---|---|
| Duy Anh (B) | | Tiến: | |
| Minh (C) | **Built:** UC12 report (#189) and UC11 expiry, write-off and batch status (#190) merged 26/10; bug fixes #184 (#212) and #215 (#226); diagrams regenerated from code (#227, #71, a week early). **Tests:** TC-17, 18, 59, 62, 64 Pass (runs 58–62, #210); TC-65 Pass (run 66, #224); TC-53 matrix over every endpoint (#195). Found bug #209 (fixed in #220). **Gate:** Must-core pre-check 27/10 (#213) and final check 30/10, passed (#233). **Week 8 started early:** #105 design gate (#234); FR-46/47 quarantine and destruction (#235) and UC15 users, roles and audit log (#236) built, as drafts waiting for #234; report drafts Ch.3 Functions of C and Testing (#232); TC-32 pilot sheets (#237). **Reviews (12):** #198, #200, #204, #208, #216, #219, #221, #222, #225, #228, #229, #231. Issues: filed #209, #223; closed #18, #53. | Tiến: | |
| Tiến (A) | | Minh: a big week that carried the tag. Pack R for B's and C's areas with TC-31 (runs 39–55, #199, #56); the two-month seed that made TC-23 possible (#198, #57); the LotOrder identity (#216); the ledger commands (#178) and the UI kit (#155) were already in place when UC08 and UC11 needed them. Bugs fixed fast: #183 and #185 (#197), and #209 the same day it was filed (#220). README brought up to week 7 (#217) and weeks 8–10 replanned (#218). 13 reviews, several with real findings, most usefully the `ON DELETE CASCADE` on the new join table in #212, which would have let deleting a medicine drop it from past stock takes. Last week's revision is done: CI required on `main` with branches up to date (#191, closed 26/10). To change: work added in the tag week, beyond the plan (the identity, 5.5 h, and the dashboard #225); #225 was approved on 27/10, then reworked on the same PR (`da55e5a`), so it needs a second full review and is still open; #183, #185 and #209 are fixed but still open, waiting for their re-tests. | #242 (`weekly-review`, S4, Wed 04/11) |

Revisions from last week: #191 open (required checks, needs the repository
settings); the stale comment in `stock-lookup.service.ts` is fixed in #197.
