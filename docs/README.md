# Documentation

| File / folder | Contents | Due |
|---|---|---|
| [`plan/`](plan/) | **Ten-week plan**: overview (scope, quality process, traceability, risks) and one file per week with tasks, hours, reviewers and acceptance criteria. Written in Vietnamese | Updated when the plan changes |
| [`course-requirements.md`](course-requirements.md) | What the course measures, taken from the three course PDFs. Read this before planning anything. | — |
| [`registration-appendix-a.md`](registration-appendix-a.md) | Content for the Week 1 registration form | Week 1 |
| [`progress/`](progress/README.md) | **Weekly progress reports for the lecturer**: planned vs delivered with evidence links, each member's activity, what slipped | Every week (closed on Sunday) |
| [`journal.md`](journal.md) | Session-by-session record of what changed, who did it and what is next | Every session |
| [`requirements/`](requirements/) | Use cases and their specifications, business rules, business decisions (DEC-01–10) and the pharmacist review, functional and non-functional requirements — all as in Proposal v1.1 | Kept current |
| [`design/`](design/) | Domain model, stock ledger and lock protocol, how to add a module | Kept current |
| [`report/`](report/outline.md) | Final Report outline: each chapter and appendix with its writer and the week of its draft and final version | Week 5, then weeks 8–10 |
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

| Dimension | Target | Planned (Proposal v1.1) | Built (12/10, in open PRs) |
|---|---|---|---|
| Use cases end-to-end | 13–16 | 13 Must + 3 Should | UC01, UC02, UC03 (#95, #97, #99), not yet test-run |
| Domain classes | 16–22 | 25 | 25 in the v1.1 schema (#94) |
| User roles | 3+ | 3 | Permission matrix enforced in services; sign-in not built |
| Business rules beyond CRUD | 6+ | 8 Must + 2 Should + 1 Could (BR01–BR11) | BR03, BR05 in the stock ledger (#96) |
| Documented test cases | 20+ | 63 | 34 written; automated tests per PR, 0 manual runs |

## Business decisions

Decisions 1–9 (business) and 10–18 (data model) are settled by Proposal v1.1
as DEC-01 to DEC-10, reviewed by a practising pharmacist in week 4. Record:
[`requirements/business-decisions.md`](requirements/business-decisions.md).
DEC-09 and DEC-10 are being confirmed with the reviewer in week 5; until then
they are team assumptions.

The week 2 option papers for decisions 4, 6, 8 and 9 are kept as the record of
the options considered; DEC-04, DEC-06 and DEC-08 replace their
recommendations: [`requirements/decisions/options-4-6-8-9.md`](requirements/decisions/options-4-6-8-9.md).
Sources quoted: [`requirements/sources.md`](requirements/sources.md).
