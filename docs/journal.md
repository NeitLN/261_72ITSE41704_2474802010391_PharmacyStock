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

- Team & Topic Registration form (Appendix A) not yet submitted on E-learning.
- Lecturer not yet added as a repository collaborator.
- Backend not yet run against PostgreSQL — needs database credentials.

**Next**

| Task | Owner | By |
|---|---|---|
| Submit Appendix A registration form | Tiến (A) | End of week 1 |
| Add lecturer as repository collaborator | Tiến (A) | End of week 1 |
| Verify backend boots against PostgreSQL | Tiến (A) | Week 1 |
| Read Module 1 — Requirements engineering | All | Week 2 |
| Settle the nine open business decisions | All | Week 2 |

---

## Week 1 — Session 2

**Date:** _(fill in)_
**Present:** _(fill in)_

**Done**

**Decided**

**Not done / blocked**

**Next**

| Task | Owner | By |
|---|---|---|
|  |  |  |
