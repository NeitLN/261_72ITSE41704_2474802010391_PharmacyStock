# Week 5 — Iteration 1, release `v0.1` (12/10–18/10/2026)

> Closed on 20/10/2026 (two days late). Process:
> [CONTRIBUTING — the weekly cycle](../../CONTRIBUTING.md#the-weekly-cycle).

## Planned

Release `v0.1`: sign in → record a goods receipt → take in a prescription →
dispense by FEFO, with data surviving a restart
([plan](../plan/tuan-05.md), milestone *Week 05 — Iteration 1*).

## Delivered

| Item | Owner | Evidence | Status |
|---|---|---|---|
| Review rotation, PR template, automatic reviewer requests; `main` protected by a ruleset | Tiến | #93 | Merged 12/10 |
| v1.1 schema built by migrations, database safety nets | Tiến | #94 | Merged 12/10 |
| UC02 suppliers (reference slice), permission checks, error format, e2e set-up | Tiến | #95 | Merged 12/10 |
| Stock ledger with the lock protocol (BR03, BR05) | Tiến | #96 | Merged 12/10 |
| UC01 medicine catalogue | Tiến | #97 | Merged 12/10; TC-45, TC-46 Pass (Minh) |
| UC03 goods receipts | Tiến | #99 | Merged 12/10; TC-01, TC-03 Pass, **TC-02 Fail** (Minh) → bug #125 |
| Demo seed (60 medicines, 120 batches, patients, prescribers) | Tiến | #100 | Merged 12/10 |
| Requirements and plan aligned with Proposal v1.1; UC01–UC04 specifications; 63 test cases | Tiến | #92, #101, #102 | Merged 12/10 |
| Decision options (DEC 4, 6, 8, 9) and sources | Minh | #98 | Merged 15/10 after changes requested by Duy Anh |
| Sign-in backend (JWT, real guard, role seed) and sign-in UI | Minh | #117, #116 | Merged 15/10; TC-42, TC-43 Pass (Duy Anh) |
| CI: migrations, seed and all tests on PostgreSQL 18 | Minh | #115 | Merged 15/10; green on `main` |
| `v0.1` test runs: TC-01, 02, 03, 45, 46 | Minh | #118, runs 1–6 | Merged 15/10 |
| Access-control design | Minh | #119 | Merged 15/10 |
| Customers and prescribers API for the UC05 quick-create | Duy Anh | #107 | Merged 13/10 |
| UC05 prescription intake and verification | Duy Anh | #108 | Merged 13/10; TC-47, TC-58 Pass in #124 (Tiến) |
| UC06 dispensing by FEFO through the ledger; BR01–BR03 tests incl. concurrent hand-overs | Duy Anh | #109 | Merged 13/10; TC-04, 06, 09 Pass in #124 (Tiến) |
| Late tasks: UC07/UC08 specifications (#15), use-case and sequence diagrams (#23, #31) | Duy Anh | #110, #111 | Merged 13/10; #15 and #23 still miss parts of their definition of done |
| TC-42, TC-43 sign-in runs | Duy Anh | #120, runs 7–8 | Merged 18/10 |
| Tag `v0.1` | Minh | #45 | **Not done** — planned 17/10; follows #124 |

Plan §8 acceptance: the flow runs in the UI ✅ · CI green ✅ · at least 8 test
cases passed by someone other than the author ✅ (6 on `main` + 5 in #124) ·
tag `v0.1` ❌ · every member at least 2 merged pull requests and 2 reviews ✅.

## Repository activity (12/10–18/10)

| Member | Commits | Pull requests opened · merged | Reviews given | Test runs recorded |
|---|---|---|---|---|
| Tiến (A) | 43 | 11 · 11 (#91, #93–#97, #99–#102 merged; #113 open) | 6 (#107–#112) | 0 (5 on 20/10, #124) |
| Duy Anh (B) | 23 | 8 · 8 (#107–#112, #114, #120) | 6 (#98, #115–#119) | 2 (runs 7–8) |
| Minh (C) | 13 | 7 · 6 (#98, #115–#119; #106 closed) | 12 (#91, #94–#97, #99–#102, #113, #114, #120) | 6 (runs 1–6) |

## Decisions this week

Recorded in `docs/plan/00-tong-quan.md` §13.2: Proposal v1.1 is the source of
requirements; review rotation Minh → Tiến → Duy Anh → Minh; the stock ledger
moves to Tiến (Proposal module M3); a temporary development sign-in until
UC16, now replaced by the real sign-in (#116, #117); Should items only after
the week 7 gate.

## Meetings

**Wednesday 14/10 — early-warning check.** Not held as a separate meeting;
covered on Saturday.

**Saturday 17/10 — online (Discord).** Present: Tiến, Duy Anh, Minh. Reviewed
the work of week 5 and the progress of each task, updated the board for
week 6, discussed proposals for the problems of week 5, and agreed the
direction of the week 6 build.

## Risks

| Risk | Owner | Trigger | Mitigation | Next review |
|---|---|---|---|---|
| R1 uneven contribution | Tiến | A member has a week with no merged pull request | Weekly early-warning check; report to the lecturer if unchanged | Wed 21/10 |
| `v0.1` late | Minh | No tag by Wed 21/10 | Merge #124, tag with an honest release note (#125 open, S3) | Wed 21/10 |
| Reviews that do not check anything | Each reviewer | An approval without the commit and what was run | Retro *Try* below; leader's weekly review looks at it | Sat 24/10 |
| Code that its author cannot explain | Each owner | A member cannot walk through a merged change | Owners explain their PR at the Saturday meeting | Sat 24/10 |

## Retrospective

Proposed by the leader from the week's records; to be confirmed at the
Wednesday 21/10 meeting.

Keep: reviewers who run the tests and write specific findings (Duy Anh on
#98, Tiến on #107–#112) · Stop: approving and merging a whole stack within
minutes; an approval of 10 pull requests in 7 minutes on 12/10 does not show
a review · Try: every review states the commit and what was run, and a failed
run is filed as a `bug` issue the same day (TC-02 waited six days) ·
**Improvement chosen:** the review rule above.

## AI use this week

Rows for this week are in [`../ai-use-log.md`](../ai-use-log.md).

## Self-report and leader's weekly review

Members fill *Delivered* by the Saturday meeting; the evidence checker this
week is **Duy Anh**; the reviewer fills the rest by Sunday
([process](../../CONTRIBUTING.md#leaders-weekly-review)).

| Member | Delivered (self-report, with links) | Reviewer's findings | Revisions (issue, severity, due) |
|---|---|---|---|
| Duy Anh (B) | 13/10: #107, #108, #109 (UC05, UC06, BR01–BR03 tests — 74 unit, 97 e2e passing; flow tried in the browser); #110, #111 (late tasks #15, #23, #31); review of #98 (changes requested); first journal entry (this PR); my AI-use rows, written by me. #22, #24 closed as not done by me. | Tiến: UC05/UC06 are the strongest code of the week — lock order, all-or-nothing on shortage and a concurrent test; all five dispensing cases passed (#124). The #98 review was specific and correct. Late tasks still miss parts of their definition of done (#15 worked examples and UC14, #23 specs for UC09–12 and UC16, #32 BR01–03 scenario table). The prescription and dispense forms likely have the TC-02 number bug. | #15, #23, #32 (`weekly-review`, S4, Wed 21/10) · #127 (S3, Wed 21/10) |
| Minh (C) | Filled in 20/10 (late). 15/10: #117 sign-in backend and #116 sign-in UI (#43, #44); #115 CI with migrations, seed and all tests on PostgreSQL 18; #119 access-control design; #98 decision options, merged after Duy Anh's requested changes. 14/10: runs 1–6 in #118 (TC-01, 03, 45, 46 Pass; TC-02 Fail). Reviews: #91, #94–#97, #99–#102, #113, #114, #120; on 20/10 #124 and #126 with the commit and what was run. Closed #28, #29, #30, #33, #37, #39 after checking the evidence. Not done: tag `v0.1` (#45), waiting for #124; I did not file the TC-02 bug (Tiến filed #125). | Tiến: Sign-in backend and UI, CI and the first `v0.1` runs all merged on 15/10, and the runs found a real bug (TC-02). Reviews of #91–#102 on 12/10 approved ten pull requests in seven minutes without the commit or a test run, and an accidental revert of the ledger (#106) was opened; both handled since. TC-02 was marked "bug to be filed" but not filed (filed by Tiến as #125). The `v0.1` tag (#45) was not made on 17/10. Old issues #8–#36 have no status. | #45 (`weekly-review`, S2, Wed 21/10) · #128 (S4, Wed 21/10) |
| Tiến (A) | #91–#102 merged 12/10 (see *Delivered*); reviews of #107–#112; TC-02 bug #125 with the fix in #126; TC-04, 06, 09, 47, 58 run on 20/10 (#124). | Minh: W05-A1 to A3 all merged on 12/10 with thorough e2e tests (16 UC03 cases, including the rollback); filed the TC-02 bug (#125) and fixed it with a test (#126); the five dispensing runs in #124 match their screenshots; this report and the retro are honest about what slipped. To change: the dispensing runs came on 20/10, after the week; the 12/10 pairing session has no record; #93–#101 were merged within seven minutes of the approvals on 12/10, so the fast review is shared; #12 and the other old issues were closed by the author and reopened, and #12's note cites #92, which was never merged. Traceability: TC-49 means two different things, and FR-42/43 have no test case. | #129 (`weekly-review`, S4, Wed 21/10) |

Evidence checked by: Duy Anh (to confirm). Revisions from the previous week:
none (first weekly review).
