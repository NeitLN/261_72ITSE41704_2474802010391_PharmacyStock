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
