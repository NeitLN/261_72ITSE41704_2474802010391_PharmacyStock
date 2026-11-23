# Appendix C — Contributions from Git and GitHub

> Draft by Duy Anh (W10-B3, #87), 23/11/2026. The numbers come from the
> repository, not from memory: `main` at `2354426`, read on 23/11/2026. The
> commands in C.1 reproduce every cell, so the tables can be regenerated after
> the pull requests still open on that date merge.

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
git log --no-merges --format='%an' origin/main | sort | uniq -c
git log --no-merges --numstat --format='AUTHOR %an' --date=short origin/main
gh pr list --state all --limit 400 --json number,author,state,mergedAt
gh search prs --reviewed-by=<account> --repo <owner>/<repo> --limit 400 --json number
gh issue list --state all --limit 400 --json number,state,assignees
```

Three details decide the totals. Merge commits are left out, so the counts
describe authored work rather than integration. Each member has one git
identity (`Võ Việt Tiến`, `Duy Anh`, `Jayson135724`), so no aliasing is needed.
The run count includes the runs 77–106 that live in the test-log pull requests
open on the snapshot date (#278, #280–#283); they are recorded, reviewed and
approved, and only wait for their merge.

## C.2 Counts per member

**Table C.1** Work per member, `main` at `2354426`, 23/11/2026.

| Member (role) | Commits | Span of commits | Files | Lines added | Lines removed | PRs opened | PRs merged | PRs open | PRs reviewed | Issues closed | Manual runs |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Võ Việt Tiến (A, leader) | 117 | 22/09 – 03/11 | 840 | 40 680 | 3 205 | 51 | 46 | 4 | 45 | 31 | 40 |
| Bùi Duy Anh (B) | 125 | 13/10 – 04/11 | 420 | 16 472 | 1 308 | 73 | 73 | — | 58 | 27 | 20 |
| Võ Hoàng Minh (C) | 60 | 12/10 – 20/11 | 292 | 12 942 | 472 | 47 | 40 | 6 | 93 | 28 | 47 |
| **All three** | **302** | 22/09 – 20/11 | 1 552 | 70 094 | 4 985 | **171** | **159** | **10** | **196** | **86** | **107** |

Two features of the table are worth naming rather than hiding. The written
code stops in the first days of November for A and B, while C's last commit is
20/11: after the code freeze of 09/11 the repository changed only in
documentation, tests and the report, and much of that text sits in the ten pull
requests still open on the snapshot date. And the spread between the members is
real — A wrote most of the documentation and set up the data model, B opened
the most pull requests, C reviewed the most and ran the most manual cases.

## C.3 Contribution percentages

Each counter is normalised to its own total, so each column of Table C.2 adds
up to 100 %. No single counter describes a member's contribution — C has the
fewest commits but the most reviews and runs — so the percentage in Table C.3
is the **mean of the member's five shares**, each counter weighing the same.
The rule is stated here before the numbers, so that no counter a member cannot
influence alone decides the outcome.

**Table C.2** Share of each counter (%).

| Member | Commits | PRs opened | PRs reviewed | Issues closed | Manual runs |
|---|---|---|---|---|---|
| Võ Việt Tiến (A) | 38.7 | 29.8 | 23.0 | 36.0 | 37.4 |
| Bùi Duy Anh (B) | 41.4 | 42.7 | 29.6 | 31.4 | 18.7 |
| Võ Hoàng Minh (C) | 19.9 | 27.5 | 47.4 | 32.6 | 43.9 |

**Table C.3** Contribution, mean of the five shares.

| Member | Mean | **Contribution** |
|---|---|---|
| Võ Việt Tiến (A) | 33.0 % | **33 %** |
| Bùi Duy Anh (B) | 32.7 % | **33 %** |
| Võ Hoàng Minh (C) | 34.3 % | **34 %** |
| **Total** | 100.0 % | **100 %** |

The percentages round to whole numbers, so the column adds to 100 exactly.

## C.4 What each member was responsible for

**Võ Việt Tiến (A, team leader).** Project setup and the parts every module
stands on: the TypeORM data source, the entities and the first migrations, the seed
data, the error format and the shared configuration. The catalogue (UC01), the
suppliers and goods receipts (UC03), the stock ledger that writes every
movement (BR03, BR05), the effective-dated price book (BR09, UC13) and the
stock-movement reports. Most of the repository's documentation — the plans,
the weekly reports, the README, the run guide, the reference list — and the
final edit of the report are also his.

**Bùi Duy Anh (B).** Prescriptions (UC05), dispensing (UC06), returns (UC08)
and the customer and prescriber screens (UC14), with the rules behind them:
the FEFO allocator and the expiry policy (BR01, BR02), the prescription
validator (BR04, BR07, BR10) and the idempotent command path (FR-23). He wrote
the design of the business-rule scenarios, the traceability and the
self-check appendix, and the report chapters for his functions and the
references.

**Võ Hoàng Minh (C).** Stock takes (UC09, BR08), the quarantine assessment and
the destruction record (UC11, FR-46/47, BR11), users and roles (UC15) and the
sign-in path (UC16), with the later migrations the stock-take counters needed.
He produced the access-control matrix and its test (TC-53), the as-built
wireframes of his screens, the testing chapter and the code map of his
functions, and he reviewed the largest number of pull requests.

## C.5 Signatures

We, the members of the group, confirm that the contribution table above
describes the work we did in this project.

**Table C.4** Signatures.

| Member | Role | Typed signature | Date |
|---|---|---|---|
| Võ Việt Tiến | A, team leader | *to be typed by the member* | |
| Bùi Duy Anh | B | Bùi Duy Anh | 23/11/2026 |
| Võ Hoàng Minh | C | *to be typed by the member* | |

The two remaining signatures are collected on the printed copy before the
submission on 27/11/2026; each member signs after reading C.2 and C.3.
