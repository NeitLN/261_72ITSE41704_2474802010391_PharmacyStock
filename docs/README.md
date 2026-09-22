# Documentation

| Folder | Contents | Due |
|---|---|---|
| `requirements/` | Functional and non-functional requirements, use case specifications | Week 2 |
| `design/` | Architecture notes, design decisions, data dictionary | Week 4 |
| `diagrams/` | Use case, class, sequence and ER diagrams; wireframes. Keep both the editable source and an exported image. | Week 4 |
| `meeting-notes/` | Weekly meeting notes, decisions and blockers | Weekly |

Reports submitted for assessment are written in English and follow the course
templates. Working notes in this folder may be in Vietnamese.

## Open business decisions

These must be settled in week 2, before the affected use cases are built or
their test cases are given expected results.

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
