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

- Project Proposal submitted on E-learning: first version 04/10, version 1.1
  dated 11/10 (cover page). Receipts: _(fill in, and attach to #19–#21)_.
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
- Each large pull request was reviewed read-only by Codex before review by a
  team member; its findings were fixed in the same pull request with a test.
  AI tools used today: Claude Code (implementation, tests, documentation) and
  Codex (review) — to be declared in Appendix B of the Final Report.
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

- Branch protection on `main` must be switched on by the repository admin.
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
