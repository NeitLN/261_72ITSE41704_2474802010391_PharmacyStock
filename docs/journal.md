# Project journal

One entry per team working session. Module 0 of the Self-study Materials asks
for this file and for it to be updated in the same commit as the work it
describes — it costs five minutes a week and supplies the material for
Chapter 4 of the final report.

Each entry records what changed, who did it, and what is next. Record blockers
honestly; a blocker written down on the day it appeared is evidence of managing
the project, while one discovered in Week 10 is not.

---

## Week 1 — Session 1

**Date:** _(fill in)_
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

## Week 1 — Session 2

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

- Week 1 administrative milestone complete (reported by Tiến, 24/09/2026):
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
