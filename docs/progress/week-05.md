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
| Prescription intake and dispensing (UC05, UC06), BR01–BR03 tests | Duy Anh | — | Not started in the repository |
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

## Open risks

- `v0.1` needs UC05/UC06 (Duy Anh) and sign-in (Minh) by Saturday 17/10.
  If it slips, the missed gate and the real release date are recorded here,
  not a redefined goal.
- Every pull request needs a real review by its rotation reviewer.

## Contribution check — Wednesday 14/10

_(to be filled in at the meeting: each member's merged and open pull
requests, reviews given, blockers, next dated commitment)_
