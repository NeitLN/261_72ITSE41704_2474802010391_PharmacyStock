# Project journal

One entry per team working session. Module 0 of the Self-study Materials asks
for this file and for it to be updated in the same commit as the work it
describes — it costs five minutes a week and supplies the material for
Chapter 4 of the final report.

Each entry records what changed, who did it, and what is next. Record blockers
honestly; a blocker written down on the day it appeared is evidence of managing
the project, while one discovered in Week 10 is not.

**Calendar.** Week 1 began Monday 14/09/2026, counted back from the Proposal
deadline on Sunday 04/10/2026 (end of week 3). Weeks run Monday to Sunday.

**Weekly summaries** for the lecturer, with evidence links and each
member's activity, are in [`progress/`](progress/README.md). This journal
keeps the session-by-session detail.

---

## Week 2 — Session 1

**Date:** 22/09/2026
**Present:** _(fill in)_

**Done**

- Chose catalogue topic 12, Pharmacy Stock and Prescription Dispensing System.
- Created the Git repository and the `/src`, `/docs`, `/tests` structure.
- Chose the technology stack: React + Vite + Ant Design, NestJS + TypeORM,
  PostgreSQL, TypeScript throughout.
- Scaffolded both applications; backend and frontend build, lint and pass their
  initial test.
- Drafted the domain model: 25 entities covering catalogue, purchasing,
  prescriptions, sales, stock control and access control.

**Decided**

- Stock is held per `Batch`, not per `Medicine`, because expiry is tracked per
  delivered lot.
- `StockMovement` is append-only; corrections post a compensating movement
  rather than editing history.
- Roles and permissions are data, not an enum, so access control can be shown
  as a real feature rather than a hard-coded check.

**Not done / blocked**

- Nothing blocked at the end of this session.

**Next**

| Task | Owner | By |
|---|---|---|
| Read Module 1 — Requirements engineering | All | Week 2 |
| Settle the nine open business decisions | All | Week 2 |

---

## Week 2 — Session 2

**Date:** 24/09/2026
**Present:** _(fill in)_

**Done**

- Started PostgreSQL 18 through `docker compose` and ran the backend against it
  for the first time. The schema was created: 26 tables, 41 foreign keys.
- Checked that data survives a database restart.

**Defects found and fixed**

- `docker-compose.yml` mounted the volume at `/var/lib/postgresql/data`. The
  PostgreSQL 18 image refuses to start with that layout and expects
  `/var/lib/postgresql`. Fixed the mount path.
- The backend crashed on start with `Cannot access 'GoodsReceipt' before
  initialization`. Cause: under ES modules, `emitDecoratorMetadata` emits a
  direct reference to the related class, and entities that import each other
  hit it before it is defined. Build, lint and unit tests all passed, so only
  booting the application revealed it. Fixed by typing every single-valued
  relation as `Relation<T>`, the approach TypeORM documents for ESM.

- Week 1 registration milestone complete (reported by Tiến, 24/09/2026; the
  week 1 deadline was Sunday 20/09):
  - Team & Topic Registration form (Appendix A) submitted on E-learning.
  - Topic 12 confirmed still free in the class group when registered.
  - Lecturer added as a collaborator; repository is also public. Verified on
    GitHub: `nguyentrihai93` is listed as a collaborator.

**Decided**

- The team uses the Docker database (port 5433), not a PostgreSQL installed on
  each machine, so everyone runs the same configuration.

**Not done / blocked**

- Nothing blocked. Duy Anh and Minh have not yet made their first commits —
  every member needs commits under their own account from early in the term
  (CLO2).

**Next — week 2: requirements**

| Task | Owner | By |
|---|---|---|
| Clone the repo, run it locally with `docker compose`, make a first commit (e.g. own journal entry) | Duy Anh (B), Minh (C) | Early week 2 |
| Read Self-study Modules 1 and 2 | All | Early week 2 |
| Settle the nine open business decisions in `docs/README.md` | All | Mid week 2 |
| Functional requirements and use-case specs for UC01–04, UC13 | Tiến (A) | End of week 2 |
| Functional requirements and use-case specs for UC05–08, UC14; write up BR01–BR04, BR07, BR10 | Duy Anh (B) | End of week 2 |
| Functional requirements and use-case specs for UC09–12, UC15–16; measurable non-functional requirements | Minh (C) | End of week 2 |
| Assemble the Proposal draft (Chapters 1–2) for optional lecturer review | Tiến (A) | End of week 2 |

---

## Weeks 3–4 — summary written on 12/10/2026

**Recorded by:** Tiến (A). Nothing was committed to the repository between
25/09 and 12/10, so this entry is written afterwards from the files that
exist. Points marked _(fill in)_ need the team's own account.

**Done**

- Project Proposal submitted on E-learning: first version 04/10; version 1.1
  submitted to "Project Proposal Resubmission (After Review/Update)" on
  11/10 at 23:54 (PDF and DOCX, named Project-Proposal-VoVietTien-2474802010391),
  status "Submitted for grading", before the 23:59 deadline. Receipt:
  `docs/evidence/proposal-resubmission-receipt-2026-10-11.png`; #19–#21 closed.
  Who wrote which part: _(fill in)_.
- Week 4: a practising pharmacist (a relative of the team leader) reviewed
  decisions DEC-01 to DEC-10 in a recorded conversation. Summary:
  `docs/requirements/pharmacist-review-week4.md`; resulting decisions:
  `docs/requirements/business-decisions.md`.

**Not done / blocked**

- No week 4 task was finished on time. Duy Anh and Minh made no commits or
  pull requests in weeks 2–4 (risk R1, "single hero").
- Lecturer feedback on the Proposal not received yet.

---

## Week 5 — Session 1

**Date:** 12/10/2026
**Present:** Tiến

**Done** (all in open pull requests waiting for review; nothing merged)

- Review rotation changed: Minh reviews Tiến, Tiến reviews Duy Anh, Duy Anh
  reviews Minh; PR template, CODEOWNERS and a workflow that requests the
  reviewer automatically (#93).
- Schema rebuilt to Proposal v1.1 with migrations, CHECK constraints and an
  append-only ledger trigger (#94); UC02 reference slice with the permission
  matrix, a temporary dev sign-in, one error format and the e2e test setup
  (#95); `StockLedger` with the lock protocol (#96); UC01 (#97); UC03 (#99);
  demo seed (#100); requirements and plan aligned with Proposal v1.1 (this
  pull request).
- Tests at the tip of the stack: 31 unit, 61 e2e, all passing; UC02, UC01 and
  UC03 also tried in a browser with Playwright.
- Minh opened his first pull request, #98 (decision option papers, W02-C2).

**Decided** (team leader; details in `docs/plan/00-tong-quan.md` §13)

- Proposal v1.1 is the source of truth for requirements.
- `StockLedger` moves from Duy Anh (W04-B3) to Tiến, as in Proposal v1.1
  module M3. Duy Anh keeps `FefoAllocator`/`ExpiryPolicy` and dispensing.
- Until sign-in exists, services check permissions through a temporary
  `DevAuthGuard`; Minh replaces it with JWT (#43) without changing services.
- Should items (UC13, UC14 screens, UC15, FR-46/47) start only after the
  Must-core gate in week 7.

**Not done / blocked**

- Branch protection: the ruleset `protect-main` was switched on 12/10 (pull
  request and one approval required; a new commit dismisses an approval).
- No pull request has a review yet. Under the new rotation Minh reviews
  Tiến's pull requests.
- v0.1 still needs UC05/UC06 (Duy Anh) and sign-in (Minh).
- Risk R1: on GitHub only Tiến's pull requests and Minh's first one (#98)
  exist so far. The team leader confirms that all three are working and
  decides not to report to the lecturer; contributions are checked every
  Wednesday from the pull-request list and the contributor graph.

**Next — rest of week 5**

| Task | Owner | By |
|---|---|---|
| Review and run #91, #92, #93–#97, #99, #100 | Minh (C) | As soon as possible |
| Review #98 | Duy Anh (B) | Wed 14/10 |
| UC05, UC06 on the ledger API; BR01–03 tests | Duy Anh (B) | Sat 17/10 |
| Sign-in (JWT) replacing `DevAuthGuard`; CI with PostgreSQL | Minh (C) | Thu 15/10 |
| Follow up DEC-09, DEC-10 with the pharmacist | Tiến (A) | Sun 18/10 |
| Weekly contribution check (PR list and contributor graph) at the Wednesday meeting | Tiến (A) | Wed 14/10 |

---

## Week 5 — Session 2

**Date:** 13/10/2026
**Present:** Duy Anh

**Done** (in open pull requests waiting for review; nothing merged)

- First work in the repository under my own account. Set up the project
  locally with Claude Code's help: Docker database, migrations and demo seed,
  backend and web client running; opencode works in a separate git worktree
  with its own ports and test database so the two tools do not overwrite
  each other.
- Customers and prescribers API for the quick-create of UC05, with the web
  client (#107).
- UC05 take in a prescription and verify it: computed valid-until (BR10),
  the DEC-03 patient checks, edit returns to RECEIVED (#108).
- UC06 dispense: `FefoAllocator` and `ExpiryPolicy` as pure classes (BR01,
  BR02), the hand-over through `StockLedger` with the prescription locked
  first, partial supply with a note (DEC-02) and the request ID (FR-23)
  (#109, label `stock-integrity`).
- UC05 and UC06 specifications (#108); UC07 and UC08 specifications as the
  design for weeks 6–7 (#110, task #15 from week 2, late); sequence diagrams
  for dispensing, billing and returns and a use-case diagram (#111, tasks
  #31 and #23 from weeks 3–4, late).
- Tests: 74 unit and 97 e2e passing at the tip of #109, including two
  hand-overs racing for the last units (exactly one wins).
- Tried the whole flow in the browser: verified a prescription for 100 ORS
  with 23 in stock; the preview showed the shortage; a partial hand-over took
  11 from ORS27052 then 12 from ORS28091 (FEFO), the status became
  PARTIALLY_DISPENSED and the ledger still balanced. Clicking found a bug —
  the Verify button spun for ever — fixed in #108.
- Reviewed #98 (Minh): request changes — a merge conflict in `docs/README.md`
  and three recommendations that DEC-04, DEC-06 and DEC-08 have replaced.
- AI tools used today: Claude Code and opencode — recorded in my own words
  in `docs/ai-use-log.md` (Appendix B).

**Decided**

- UC05 and UC06 go to review as three stacked pull requests (#107 → #108 →
  #109) so each stays reviewable; merge in that order and delete each branch
  so the next one retargets to `main`.
- FEFO and expiry are pure domain classes in `src/backend/src/issuing/`, so
  the sale in UC07 reuses them.

**Not done / blocked**

- Weeks 1–4 tasks were not done on time; #15, #23 and #31 are done late
  today (#110, #111), and #5 and #6 are closed after reading the pharmacist
  review of week 4. #14 waits for Tiến's view. I did not write Proposal
  sections 2.1–2.3; #22 and #24 are closed as not done.
- #106 ("Revert stock ledger") looks like an accidental click after #96 was
  merged; it should be closed — to raise with Minh.
- #107, #108, #109 and #111 were reviewed and merged by Tiến on 13/10; #110
  and this entry wait for the requested fixes.

**Next — rest of week 5**

| Task | Owner | By |
|---|---|---|
| Review and merge #107 → #108 → #109, then #110 and #111 | Tiến (A) | Fri 16/10 |
| Fix review comments on #107–#110 within a day | Duy Anh (B) | As they come |
| Re-review #98 after the fixes; review Minh's next pull requests | Duy Anh (B) | Fri 16/10 |
| Week 5 row in `docs/progress/week-05.md` and `docs/ai-use-log.md` | Duy Anh (B) | Sat 17/10 |

---

## Week 5 — Session 3

**Date:** 14/10/2026
**Present:** Minh

**Done**

- Sign-in (UC16) and CI are committed on their own branches, each waiting for
  review by Duy Anh: backend sign-in with bcryptjs and an 8-hour JWT (#43),
  the sign-in page with a menu filtered by role (#44), and the CI workflow
  with a PostgreSQL 18 service (#35). Tests at the tip of #44: 79 unit and
  110 e2e passing; the sign-in page was also tried in Chromium with all three
  roles.
- First manual test runs (W05-C3, #45), as the runner of Tiến's week 5 cases,
  on `main` at `8c535ec` after `docker compose down -v` and `npm run seed`.
  The runs were driven by a Playwright script that clicks through the web
  client as the sample manager; I checked the database with psql and kept
  the screenshots. Six lines in `tests/manual/runs.md`:
  TC-01 Pass, TC-03 Pass, TC-45 Pass, TC-46 Pass, TC-02 Fail (twice).
- Data survived a restart: after `docker compose restart` and restarting the
  API, the TC-01 receipt and its batch were unchanged.
- Regression pack R defined in `tests/manual/test-cases.md` (#36): the
  fifteen cases of plan §6.5 plus TC-50 for BR11.

**Defect found**

- **TC-02, goods receipt quantity (S3, proposed).** In the receipt form,
  typing `0` or `-1` turns the quantity into `1`, and `2.5` into `3`, when the
  field is left; no error is shown and the receipt saves with the changed
  number. The API refuses all of these values, so only the form is wrong: it
  corrects the number instead of rejecting it (FR-07, NFR-04). Proposed S3
  because the corrected number is visible before saving; Tiến may raise it to
  S2 since a wrong quantity can reach stock unnoticed. Owner: Tiến (UC03).
  Issue to be opened with the evidence `TC-02-*-2026-10-14.png`; it is
  retested by me after the fix.

**v0.1 sign-off (W05-C3) — not signed yet**

| v0.1 criterion | State on 14/10 |
|---|---|
| Sign in | Built and tested on #43/#44; not merged |
| Receive stock (UC03) | Merged; TC-01, 03, 46 pass; TC-02 fails (S3) |
| Take in a prescription (UC05) | Merged; TC-47, TC-58 not run yet (runner Tiến) |
| Dispense it (UC06) | Merged; TC-04, 06, 09 not run yet (runner Tiến) |
| Data survives a restart | Checked for a goods receipt |
| No S1 or S2 open | None known; TC-02 is proposed S3 |

The tag waits for #43 and #44 to merge and for Tiến's runs of the UC05/UC06
cases. The S3 defect does not block it (plan §6.4) and goes into the release
note.

**Next**

| Task | Owner | By |
|---|---|---|
| Review #43, #44 and the CI pull request | Duy Anh (B) | Thu 15/10 |
| Turn on the required CI checks once CI is on `main` | Tiến (A) | After merge |
| Run TC-04, 06, 09, 47, 58 on `main` | Tiến (A) | Fri 16/10 |
| Fix the TC-02 form defect | Tiến (A) | Week 6 |
| Re-run TC-02; run the sign-in cases TC-42, TC-43 | Minh (C); Duy Anh (B) | After the fixes merge |
| Tag `v0.1` with the release note | Minh (C) | When the above pass |

## Week 7 — Must-core gate pre-check

**Date:** 27/10/2026
**Present:** Minh

The gate (W07-C3, #63; Proposal §2.4) decides whether the Should use cases
open in week 8. It is planned for Friday 30/10; this pre-check on `main`
`0a66d12` lists what is still missing, so the gaps can close before then.

**Criteria**

| Criterion (plan, week 7) | State on 27/10 | Met |
|---|---|---|
| The 13 Must use cases run end to end on `main` | Every Must use case has at least one passing run in `runs.md` (UC01–UC11, UC16). UC12 has no dedicated case passed yet: TC-23 is not run; the report was used end to end only inside TC-31 (run 53) | Not yet |
| Every test case of a Must rule passes | BR01, 02, 04, 05, 07, 10, 11: every case run passes. BR03: TC-62 passes in run 61 (#210, in review); TC-26 is a week 8 case. BR07: TC-54 is a week 8 case | Yes, once #210 merges |
| CI green | *Backend* and *Frontend* green on the last three merges (#197, #199, #208) | Yes |
| Ledger invariant | `findLedgerMismatches` query on the seeded dev database after today's runs: 0 mismatches over 123 batches and 145 movements, nothing negative | Yes |
| TC-26, 54, 62 pass | `races.e2e-spec.ts`, 20 rounds each: RACE-01 (TC-62), RACE-02 (TC-54), RACE-03 (TC-26) all pass (run 61, 14:17 and 14:19). The manual lines for TC-26 and TC-54 are #67, week 8 | Yes |

Open defects: none S1 or S2. S3: #184 (stock take drops a medicine at 0;
fix #212) and #201 (prescriber licence case; fix #205). S4: #209 (batch
history shows return lines by id).

**Verdict:** not passed yet. Four items are left, all small.

**Next**

| Task | Owner | By |
|---|---|---|
| Review and merge #210 (TC-17, 18, 59, 62, 64) and #212 (#184) | Duy Anh (B) | Thu 29/10 |
| Merge #198, then run TC-23 (UC12, two periods) | Tiến (A); Duy Anh (B) | Thu 29/10 |
| Run TC-63 (UC10, monitoring off; expired and quarantined units) | Duy Anh (B) | Thu 29/10 |
| Copy run 51 (TC-28 Pass) into `test-cases.md`; it still says Not run | Tiến (A) | Fri 30/10 |
| Final gate check on the tag commit, verdict recorded here | Minh (C) | Fri 30/10 |

## Week 7 — Must-core gate: result

**Date:** 30/10/2026
**Present:** Minh

The final gate check (W07-C3, #63) on `main` `ce58623`, against the same
criteria as the pre-check of 27/10. All four items left that day are closed:
#210 and #224 merged; TC-23 ran (run 63, #198 merged); TC-63 ran (run 65);
TC-28 is copied into `test-cases.md`.

| Criterion (plan, week 7) | State on 30/10 | Met |
|---|---|---|
| The 13 Must use cases run end to end on `main` | Every one has passing cases in `runs.md`. UC12 has TC-23 (run 63), with the hand calculation in the evidence | Yes |
| Every test case of a Must rule passes | BR01, 02, 04, 05, 10, 11: every case passes. BR03: TC-09, 10, 55, 62 pass. BR07: TC-09, 37 pass. TC-26 (BR03) and TC-54 (BR07) are week 8 manual cases (#67); their automated rounds pass, see below | Yes |
| CI green | *Backend* and *Frontend* green on the last five merges (#226–#229, #231); both are required checks on `main`, with branches up to date | Yes |
| Ledger invariant | `findLedgerMismatches` query on the seeded dev database: 0 mismatches over 120 batches and 139 movements | Yes |
| TC-26, 54, 62 pass | `races.e2e-spec.ts` on `ce58623` at 04:33: RACE-01 (TC-62), RACE-02 and RACE-05 (TC-54), RACE-03 and RACE-04 (TC-26, forced overlap from #229), 20 rounds each, 5/5 pass | Yes |

Open defects: none S1 or S2. S3: #184 (fix #212, in review) and #183
(fixed in #197, waiting for its re-test). S4: #185 (fixed in #197) and #209
(fixed in #220), both waiting for their re-tests.

**Verdict: passed.** The Should items open in week 8 as planned: UC13 price
history (#103, Tiến), the UC14 screens (#104, Duy Anh), and UC15 with the
quarantine assessment and destruction records, FR-46 and FR-47 (#105, Minh).

**Next**

| Task | Owner | By |
|---|---|---|
| Design gate for UC15, FR-46 and FR-47 (spec, API, sequence, wireframe), then build | Minh (C) | Week 8 |
| Re-run TC for #183, #185, #209 and, once #212 merges, #184 | Duy Anh (B) | Tue 03/11 |
| Tag `v0.2` with Appendix D | Duy Anh (B) | Sat 31/10 |
