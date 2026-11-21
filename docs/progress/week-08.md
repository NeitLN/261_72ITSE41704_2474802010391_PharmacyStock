# Week 8 — Hardening (02/11–08/11/2026)

> Written on **22/11/2026** from the repository and GitHub, two weeks after the
> week ended: the report was not kept during the week. Counts are from Git and
> GitHub for 02/11–08/11. The meeting notes, the retrospective and the
> members' own self-reports were not recorded at the time and are left for the
> members to fill in; nothing below is backdated.
> Process: [CONTRIBUTING — the weekly cycle](../../CONTRIBUTING.md#the-weekly-cycle).

## Planned

From [`tuan-08.md`](../plan/tuan-08.md), milestone *Week 08 — Hardening*:
all four Should items if the Must-core gate passed (UC13 prices, UC14
customers and prescribers, FR-46/47 quarantine assessment and destruction,
UC15 users and roles); hardening (TC-25 rollback, TC-26/54 forced races, TC-27
duplicate submission, TC-29 performance, TC-30 backup and restore, TC-53
access audit); the UX walk-through and the S3/S4 fixes it finds; the TC-32
pilot; regression of the changed parts; report drafts of Ch.2, Ch.3
architecture and data, and each member's functions.

The Must-core gate had passed on 30/10 (#233), so all four Should items went
ahead.

## Delivered

| Item | Owner | Evidence | Status |
|---|---|---|---|
| UC13 price scheduling: design gate, then schedule, cancel and list prices | Tiến | #253, #259 (#103) | Merged 02/11; TC-41 Pass (run 82), TC-40 Pass (run 92) |
| TC-29 data load and timings, TC-30 backup and restore check | Tiến | #260 (#65) | Merged 02/11; runs 83–84 by Minh in #282 |
| Report drafts: Ch.2 background, Ch.3 architecture and data, Ch.3 interface design | Tiến | #261, #277 (#66) | Merged 02/11 and 21/11 |
| Price field keeps every digit typed key by key (bug #244, S2) | Tiến | #249 | Merged 02/11; re-tested in runs 75–76 (#271) |
| UX walk-through of every screen against `ui-design.md` §4–§5 | Tiến | comment on #157 (01/11), issues #254–#258 | Done; issues fixed by Duy Anh |
| TC-26 and TC-54 forced races, UC14 acceptance | Tiến | runs 77–79, #280 | Awaiting review (re-approval after a merge from `main`) |
| Progress dashboard and its redesign | Tiến | #225, #248 (#242) | Merged 02/11 |
| UC14 screens accepted; UX fixes from the walk-through (#254–#258) | Duy Anh | #262, #266, #268 | Merged 02/11 |
| Customer phone search ignores spaces and dashes (bug #279) | Duy Anh | #284 | Merged 04/11 |
| As-built wireframes of prescriptions, dispensing and sales | Duy Anh | #267 (#156) | Merged 02/11 |
| Traceability matrix to week 8 | Duy Anh | #265 (#78) | Merged 02/11 |
| Customer prescription history; print receipts, return slips, hand-over records; CSV export (FR-43); overview page; refresh permissions on focus | Duy Anh | #286, #288, #290–#292, #294 | Merged 04/11 |
| UI consistency: confirm removing a cart line, empty text on every table | Duy Anh | #287 (#158) | Merged 04/11 |
| Specs, `ui-design.md` and access-control notes brought up to the new features | Duy Anh | #293 | Merged 04/11 |
| TC-44 (run 74), TC-61 (run 90), TC-53 (run 91) | Duy Anh | #264, #285, #289 | Merged |
| FR-46/47 quarantine assessment and destruction | Minh | #235 (#105) | Merged 02/11; TC-61 Pass (run 90) |
| UC15 users, roles and audit log; usernames unique without case; audit names the user | Minh | #236, #269, #272 (#105, #263) | Merged 02/11 |
| Report draft: UC15 section | Minh | #270 (#72) | Merged 02/11 |
| Run guide for a new computer | Minh | #273 (#80) | Awaiting merge (approved 22/11 with one change asked) |
| TC-42/43 after the identity, TC-41, TC-29/30, week-8 regression (runs 80–89, 92–106) | Minh | #278, #281, #282, #283 | Awaiting review |

**Not delivered in week 8:** the TC-32 pilot with one person outside the team
(#159); TC-27 duplicate submission (#68); the as-built wireframes of A's
screens, moved to week 9 by the plan and drawn on 22/11 (#156, #297).

## Repository activity (02/11–08/11)

| Member | Commits (all branches) | Pull requests opened · merged | Reviews given | Test runs recorded |
|---|---|---|---|---|
| Tiến (A) | 13 | 4 opened (#275–#277, #280) · 8 merged (#225, #248, #249, #252, #253, #259–#261) | 6 (#235, #269–#273) | 3 (runs 77–79) |
| Duy Anh (B) | 29 | 17 opened · 18 merged (#246, #262, #264–#268, #284–#294) | 4 (#236, #253, #276, #277) | 3 (runs 74, 90, 91) |
| Minh (C) | 21 | 9 opened (#269–#273, #278, #281–#283) · 6 merged (#235, #236, #269–#272) | 21 (#248, #252, #262, #265–#268, #276, #277, #284–#294) | 27 (runs 75–76, 80–89, 92–106) |

Duy Anh's pull requests this week were reviewed by Minh, not by Tiến as the
rotation says; Tiến made no reviews after 03/11.

## Meetings

**Wednesday 04/11 — early-warning check.** _(not recorded; to be filled in by
the members if it took place)_

**Saturday 07/11.** _(not recorded)_

## Risks

| Risk | Owner | Trigger | Mitigation | Next review |
|---|---|---|---|---|
| Test-log pull requests waiting for review (#278, #280–#283) leave `runs.md` and the test-case statuses behind the real results | Tiến | Still open at the freeze | Review and merge before `v1.0`; the report's testing figures wait for them | Week 9 |
| TC-32 needs people outside the team | Minh | Pilot (#159) not run by 08/11 | Run it with the final users in week 9 (#79) | Week 9 |
| Leader inactive after 03/11 | Tiến | No review or merge from Tiến for a week | Minh and Duy Anh review each other; Tiến's queue in #274 | Week 9 |

## Retrospective

_(not recorded)_

## AI use this week

Rows for this week are in [`../ai-use-log.md`](../ai-use-log.md).

## Self-report and leader's weekly review

| Member | Delivered (self-report, with links) | Reviewer's findings | Revisions (issue, severity, due) |
|---|---|---|---|
| Duy Anh (B) | _(to be filled in by Duy Anh)_ | Tiến: _(to be filled in)_ | |
| Minh (C) | _(to be filled in by Minh)_ | Tiến: _(to be filled in)_ | |
| Tiến (A) | _(to be filled in by Tiến)_ | Minh: _(to be filled in)_ | |

Revisions from last week: #251 (Minh) closed 04/11; #242 (Tiến) open, its
work done (#225 and #248 merged 02/11), waiting for Minh to close it.
