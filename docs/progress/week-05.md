# Week 5 — Iteration 1, release `v0.1` (12/10–18/10/2026)

> Living report. Last updated **12/10/2026**; closed on Sunday 18/10.

## Planned

Release `v0.1`: sign in → record a goods receipt → take in a prescription →
dispense by FEFO, with data surviving a restart
([plan](../plan/tuan-05.md), milestone *Week 05 — Iteration 1*).

## Delivered so far

| Item | Owner | Evidence | Status |
|---|---|---|---|
| Review rotation, PR template, automatic reviewer requests; `main` protected by a ruleset | Tiến | #93 | Awaiting review (ruleset active) |
| v1.1 schema built by migrations, database safety nets | Tiến | #94 | Awaiting review |
| UC02 suppliers (reference slice), permission checks, error format, e2e set-up | Tiến | #95 | Awaiting review |
| Stock ledger with the lock protocol (BR03, BR05) | Tiến | #96 | Awaiting review |
| UC01 medicine catalogue | Tiến | #97 | Awaiting review |
| UC03 goods receipts | Tiến | #99 | Awaiting review |
| Demo seed (60 medicines, 120 batches, patients, prescribers) | Tiến | #100 | Awaiting review |
| Requirements and plan aligned with Proposal v1.1; UC01–UC04 specifications | Tiến | #101, #92 | Awaiting review |
| 63 test cases; README; screens aligned with v1.1 | Tiến | #102 | Awaiting review |
| First journal entry; decision options (DEC 4, 6, 8, 9); NFRs; UC09–12, UC16 specs; access-control design | Minh | #98 and branches `docs/w02-c1…`, `docs/w02-c3…`, `docs/w04-c1…` | #98 awaiting review; others not yet in pull requests |
| Customers and prescribers API for the UC05 quick-create | Duy Anh | #107 | Merged (13/10) |
| UC05 prescription intake and verification | Duy Anh | #108 | Merged (13/10) |
| UC06 dispensing by FEFO through the ledger; BR01–BR03 tests incl. concurrent hand-overs | Duy Anh | #109 | Merged (13/10) |
| Late week 2–4 task: use-case and sequence diagrams (#23, #31) | Duy Anh | #111 | Merged (13/10) |
| Late week 2 task: UC07/UC08 specifications (#15) | Duy Anh | #110 | Awaiting review |
| Sign-in (UC16), CI, integration test, tag `v0.1` | Minh | — | Not started in the repository |

Automated tests at the tip of Tiến's pull requests: 31 unit and 61 end-to-end,
all passing. Each large pull request was reviewed by Codex (read-only) before
team review; the defects it found were fixed in the same pull request with a
regression test. Manual test runs: none yet (`tests/manual/runs.md`).

## Repository activity (12/10)

| Member | Commits | Pull requests opened | Reviews given |
|---|---|---|---|
| Tiến (A) | 34 | 10 (#93–#97, #99–#102) | 0 |
| Duy Anh (B) | 0 | 0 | 0 |
| Minh (C) | 6 | 1 (#98) | 0 |

## Decisions this week

Recorded in `docs/plan/00-tong-quan.md` §13.2: Proposal v1.1 is the source of
requirements; review rotation Minh → Tiến → Duy Anh → Minh; the stock ledger
moves to Tiến (Proposal module M3); a temporary development sign-in until
UC16; Should items only after the week 7 gate.

## Meetings

**Wednesday 14/10 — early-warning check.** _(to be filled in: present; is
`v0.1` by Saturday still realistic; blockers; who reviews which open PR;
actions with owner and date)_

**Saturday 17/10.** _(to be filled in: present, decisions, actions)_

## Risks

| Risk | Owner | Trigger | Mitigation | Next review |
|---|---|---|---|---|
| R1 uneven contribution | Tiến | A member still has no pull request of their own | Pairing session; weekly early-warning check; report to the lecturer if unchanged | Wed 21/10 |
| `v0.1` slips | Minh (release), Duy Anh (UC05/UC06) | UC05/UC06 or sign-in not merged by Fri 16/10 | Cut to the minimal flow of the plan; record the missed date honestly | Sat 17/10 |
| Review backlog on Tiến's 10 PRs | Minh | No review by Wed 14/10 | Review in dependency order (#91 → #94 → …); Duy Anh cross-checks one | Wed 14/10 |
| Code that its author cannot explain (heavy AI use) | Each owner | A member cannot walk through a merged change | AI-use log; owners explain their PR at the Saturday meeting | Sat 17/10 |

## Retrospective (Saturday 17/10)

_(to be filled in: keep / stop / try, one improvement chosen)_

## AI use this week

Recorded in [`../ai-use-log.md`](../ai-use-log.md): Claude Code wrote the code
and documents of #93–#102 under Tiến's direction; Codex reviewed the large
pull requests and the process read-only, and the defects it found were fixed
with regression tests.

## Self-report and leader's weekly review — by Sunday 18/10

Members fill *Delivered* by the Saturday meeting; the evidence checker this
week is **Duy Anh**; the reviewer fills the rest by Sunday
([process](../../CONTRIBUTING.md#leaders-weekly-review)).

| Member | Delivered (self-report, with links) | Reviewer's findings | Revisions (issue, severity, due) |
|---|---|---|---|
| Duy Anh (B) | 13/10: #107, #108, #109 (UC05, UC06, BR01–BR03 tests — 74 unit, 97 e2e passing; flow tried in the browser); #110, #111 (late tasks #15, #23, #31); review of #98 (changes requested); first journal entry (this PR); my AI-use rows, written by me. #22, #24 closed as not done by me. | Tiến: | |
| Minh (C) | | Tiến: | |
| Tiến (A) | #93–#102 (see *Delivered so far*) | Minh: | |

Revisions from the previous week: none (first weekly review).
