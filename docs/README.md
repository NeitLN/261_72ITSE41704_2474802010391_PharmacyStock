# Documentation

| File / folder | Contents | Due |
|---|---|---|
| [`course-requirements.md`](course-requirements.md) | What the course measures, taken from the three course PDFs. Read this before planning anything. | — |
| [`registration-appendix-a.md`](registration-appendix-a.md) | Content for the Week 1 registration form | Week 1 |
| [`journal.md`](journal.md) | Session-by-session record of what changed, who did it and what is next | Every session |
| [`requirements/`](requirements/) | Use cases, business rules, functional and non-functional requirements | Week 2 |
| [`design/`](design/) | Domain model, architecture notes, data dictionary | Week 4 |
| [`diagrams/`](diagrams/) | Use case, class, sequence and ER diagrams; wireframes. Keep the editable source and an exported image. | Week 4 |

Reports submitted for assessment are written in English and follow the course
templates. Working notes may be in Vietnamese; anything that will be quoted in
a report should be written in English from the start.

**Keep `/docs` beside the code and update it in the same commit as the change.**
Documentation written in Week 10 from memory is one of the four named failure
patterns.

## Calendar

Week 1 began Monday 14/09/2026, counted back from the Proposal deadline on
Sunday 04/10/2026. Official deadlines are those published on E-learning/CTE;
dates marked *expected* are the end of the week and may differ.

| Week | Dates | Milestone |
|---|---|---|
| 1 | 14/09 – 20/09 | Team & Topic Registration (Appendix A) |
| 2 | 21/09 – 27/09 | Requirements; open decisions settled |
| 3 | 28/09 – 04/10 | **Project Proposal — due Sun 04/10** (20%) |
| 4 | 05/10 – 11/10 | Design artefacts in the repository |
| 5 | 12/10 – 18/10 | Tag `v0.1` |
| 6 | 19/10 – 25/10 | Test-case table |
| 7 | 26/10 – 01/11 | Tag `v0.2`; Appendix D self-check |
| 8 | 02/11 – 08/11 | Updated design documentation |
| 9 | 09/11 – 15/11 | Tag `v1.0`; draft report |
| 10 | 16/11 – 22/11 | **Final Project Report** (80%) — expected Sun 22/11 |

Every task is a GitHub issue under the milestone for its week, and an item on
the [project board](https://github.com/users/NeitLN/projects/1). See
[`../CONTRIBUTING.md`](../CONTRIBUTING.md#task-tracking).

## Scope targets

From Suggested Project Titles, Table 2 — expected for a **three-person team**.
Full detail in [`course-requirements.md`](course-requirements.md).

| Dimension | Target | Planned | Built |
|---|---|---|---|
| Use cases end-to-end | 13–16 | 16 | 0 |
| Domain classes | 16–22 | 25 | 25 defined |
| User roles | 3+ | 3 | 0 |
| Business rules beyond CRUD | 6+ | 10 | 0 |
| Documented test cases | 20+ | 34 | 0 run |

## Open business decisions

These must be settled in **Week 2**, before the affected use cases are built or
their test cases are given expected results. Each is marked `TODO` at the place
in the code it affects.

| # | Question | Affects |
|---|---|---|
| 1 | Is expiry stored as a full date or year-month? Can a batch be dispensed on its exact expiry date? | BR02, TC-07 |
| 2 | When stock is short, reject the whole request or allow a partial dispense? | BR03, TC-09 |
| 3 | Which fields and statuses make a prescription reference valid? | BR04, TC-13, TC-14 |
| 4 | Which stock state do returned medicines enter, and may they be dispensed again? | UC08, TC-16 |
| 5 | How are dispensing and sales linked so stock is not deducted twice? | UC06, UC07, TC-15 |
| 6 | How is turnover defined — period, and how returns are counted? | UC12, TC-23 |
| 7 | How is a tie broken between batches with the same expiry date? | BR01 |
| 8 | Is the low-stock alert triggered below the threshold, or at and below it? | UC10, TC-21 |
| 9 | What are the performance targets — data volume, reference machine, measurement method? | NFR, TC-29 |
