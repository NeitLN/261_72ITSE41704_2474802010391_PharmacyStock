# Appendix C — Contributions from Git and GitHub

> Draft by Duy Anh (W10-B3, #87), 23/11/2026. The numbers come from the
> repository, not from memory: `main` at `368ae91`, read on 23/11/2026 after
> the day's merges. The commands in C.1 reproduce every cell, so the tables can
> be regenerated after the last pull requests merge.

## C.1 What was counted, and how

| Counter | How it is read | Source |
|---|---|---|
| Commits | Commits on `main` whose author is the member, **merge commits excluded** (a merge of `main` into a branch is not work) | `git log` |
| Span | Date of the member's first and last non-merge commit on `main` | `git log --date=short` |
| Files, lines | Sum of the per-file `+/−` of those commits, documentation included; a file touched by ten commits counts ten times | `git log --numstat` |
| Pull requests | PRs the member opened; *merged* and *still open* are the split of that number, so the two closed-without-merge PRs appear in neither | `gh pr list --state all` |
| PRs reviewed | Distinct PRs on which the member submitted at least one review | `gh search prs --reviewed-by` |
| Issues closed | Closed issues whose assignee is the member | `gh issue list --state all` |
| Manual runs | Rows of `tests/manual/runs.md` whose runner is the member | `tests/manual/runs.md` |

```bash
git log --no-merges --format='%ae' origin/main | sort | uniq -c
git log --no-merges --numstat --format='AUTHOR %an' --date=short origin/main
gh pr list --state all --limit 400 --json number,author,state,mergedAt
gh search prs --reviewed-by=<account> --repo <owner>/<repo> --limit 400 --json number
gh issue list --state all --limit 400 --json number,state,assignees
```

Three details decide the totals. Merge commits are left out, so the counts
describe authored work rather than integration. Members are counted by
e-mail address, not by name: Duy Anh committed both as `Duy Anh` and as
`Bùi Duy Anh` with the same address, and both count as his.
The run count includes run 107, logged in the pull request that records
TC-27; runs 77–106 were merged into `main` on 23/11.

## C.2 Counts per member

**Table C.1** Work per member, `main` at `368ae91`, 23/11/2026.

| Member (role) | Commits | Span of commits | Files | Lines added | Lines removed | PRs opened | PRs merged | PRs open | PRs reviewed | Issues closed | Manual runs |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Võ Việt Tiến (A, leader) | 127 | 22/09 – 22/11 | 904 | 43 037 | 3 337 | 51 | 49 | 1 | 45 | 31 | 40 |
| Bùi Duy Anh (B) | 125 | 13/10 – 04/11 | 420 | 16 472 | 1 308 | 75 | 73 | 2 | 59 | 28 | 20 |
| Võ Hoàng Minh (C) | 78 | 12/10 – 23/11 | 359 | 13 292 | 557 | 47 | 46 | — | 93 | 28 | 47 |
| **All three** | **330** | 22/09 – 23/11 | 1 683 | 70 801 | 5 202 | **173** | **168** | **3** | **197** | **87** | **107** |

Two features of the table are worth naming rather than hiding. The written
code stops in early November for A and B, while C's last commit is 23/11:
after the code freeze of 09/11 the repository changed only in documentation,
tests and the report. And the spread between the members is real — A wrote most
of the documentation and set up the data model, B opened the most pull
requests, C reviewed the most and ran the most manual cases.

## C.3 Contribution percentages

Each counter is normalised to its own total, so each column of Table C.2 adds
up to 100 % (the pull-request column shows 100.1 % because three rounded
values cannot sum to 100.0; Table C.3 uses the unrounded shares). No single
counter describes a member's contribution — C has the fewest commits but the
most reviews and runs — so the percentage in Table C.3
is the **mean of the member's five shares**, each counter weighing the same.
The rule is stated here before the numbers, so that no counter a member cannot
influence alone decides the outcome.

**Table C.2** Share of each counter (%).

| Member | Commits | PRs opened | PRs reviewed | Issues closed | Manual runs |
|---|---|---|---|---|---|
| Võ Việt Tiến (A) | 38.5 | 29.5 | 22.8 | 35.6 | 37.4 |
| Bùi Duy Anh (B) | 37.9 | 43.4 | 29.9 | 32.2 | 18.7 |
| Võ Hoàng Minh (C) | 23.6 | 27.2 | 47.2 | 32.2 | 43.9 |

**Table C.3** Contribution, mean of the five shares.

| Member | Mean | **Contribution** |
|---|---|---|
| Võ Việt Tiến (A) | 32.8 % | **33 %** |
| Bùi Duy Anh (B) | 32.4 % | **32 %** |
| Võ Hoàng Minh (C) | 34.8 % | **35 %** |
| **Total** | 100.0 % | **100 %** |

The percentages round to whole numbers, so the column adds to 100 exactly.

## C.4 What each member was responsible for

**Võ Việt Tiến (A, team leader).** Project setup and the parts every module
stands on: the TypeORM data source, the entities and the first migrations, the
seed data, the error format and the stock ledger that writes every movement
(BR03, BR05). His use cases are the medicine catalogue (UC01), suppliers
(UC02), goods receipts (UC03), stock lookup and batch history (UC04) and the
effective-dated prices (UC13, BR09). He drew the UI design, the wireframes
(design and as-built) and the LotOrder identity, wrote the plans, weekly
reports, README and most of the requirement and design documents, and edited
and assembled the final report.

**Bùi Duy Anh (B).** Prescriptions (UC05), dispensing (UC06), sales and the
billing of dispensings (UC07), returns (UC08) and the customer and prescriber
screens (UC14), with the rules behind them: the FEFO allocator and the expiry
policy (BR01, BR02), the prescription validator (BR04, BR07, BR10) and the
idempotent command path (FR-23). He wrote the business-rule scenarios, the
traceability matrix, the self-check appendix, the report chapter of his
functions, the library and licence list and this appendix, and merged most of
the team's pull requests in the last week.

**Võ Hoàng Minh (C).** Stock takes (UC09, BR08), low-stock alerts (UC10),
expiry, batch status and write-off (UC11) with the quarantine assessment and
the destruction record (FR-46/47, BR11), the stock movement report (UC12),
users and roles (UC15) and the sign-in path (UC16). He produced the
access-control matrix and its test (TC-53), regenerated the class diagram and
ERD from the code, wrote the run guide, the final submission checklist and the
testing chapter, ran the performance and backup checks (TC-29, TC-30), and
reviewed the largest number of pull requests.

## C.5 Signatures

We, the members of the group, confirm that the contribution table above
describes the work we did in this project.

**Table C.4** Signatures.

| Member | Role | Student ID | Typed signature | Date |
|---|---|---|---|---|
| Võ Việt Tiến | A, team leader | 2474802010391 | *to be typed by the member* | |
| Bùi Duy Anh | B | 2474802010525 | Bùi Duy Anh | 23/11/2026 |
| Võ Hoàng Minh | C | 2474802010242 | *to be typed by the member* | |

The two remaining signatures are collected on the printed copy before the
submission on 27/11/2026; each member signs after reading C.2 and C.3.
