# Week 10 — Final Report (16/11–22/11/2026)

> Living report. Last updated **22/11/2026**. The Final Report is due on CTE on
> **30/11/2026** (confirmed on 22/11; the plan had assumed 22/11), so the
> submission work continues into the following week.
> Process: [CONTRIBUTING — the weekly cycle](../../CONTRIBUTING.md#the-weekly-cycle).

## Planned

From [`tuan-10.md`](../plan/tuan-10.md), milestone *Week 10 — Final Report
(80%)*: edit the report against the template (#82); Ch.4 and Appendix B (#83);
export PDF and DOCX and submit on CTE (#84); reconcile documents with the code
and write the "functions not implemented" section (#85); references, libraries
and licences (#86); Appendix C with signatures (#87); a last fresh-clone run on
the submitted build (#88); check files and links (#89); checklists 12.2 and
12.3 (#90).

## Delivered so far

| Item | Owner | Evidence | Status |
|---|---|---|---|
| Final checklist against the course requirements; username index in the data dictionary | Minh | #295 (#90, #71) | Awaiting review |
| Week-8 review queue: main merged into #280; #273 and #278 re-reviewed and approved; #275–#277 merged | Tiến | #274 | Done 22/11; #280 waits for Minh's re-approval |
| Ch.1, Ch.3 functions of A with ten screenshots, Ch.4 | Tiến | #296 (#73, #83) | Awaiting Minh's review |
| As-built wireframes: sign in, stock take, alerts, quarantine and pending destruction, users and roles | Tiến | #297 (#156) | Awaiting Duy Anh's review |
| Weekly reports for weeks 8–10 | Tiến | this pull request | Awaiting review |

**Still open:** tag `v1.0` (#81); TC-32 (#79) and TC-33 (#80); Appendix B
(Tiến) and Appendix C (#87); the Proposal feedback table (#75); the editing
pass (#82) and export (#84); reconciliation and §3.3.3 (#85); references
(#86); file and link checks (#89).

## Repository activity (16/11–22/11)

| Member | Commits | Pull requests opened · merged | Reviews given | Test runs recorded |
|---|---|---|---|---|
| Tiến (A) | 5 | 3 opened (#296, #297, this one) · 3 merged (#275–#277) | 2 (#273, #278) | 0 |
| Duy Anh (B) | 0 | 0 · 0 | 0 | 0 |
| Minh (C) | 2 | 1 opened (#295) · 0 | 0 | 0 |

## Risks

| Risk | Owner | Trigger | Mitigation | Next review |
|---|---|---|---|---|
| The final template (`Template_Final-Project-Report.docx`) is not in the team folder | Tiến | Not found by 24/11 | Download it from E-learning; the chapters in `docs/report/` follow the course's chapter guidance until then | 24/11 |
| `v1.0` not tagged, so the report cannot name its build | Minh, Tiến | Not tagged by 25/11 | Merge the test-log pull requests, run the final regression, tag | 25/11 |
| Duy Anh has no commit on `main` after week 8, so his commits span only four course weeks | Duy Anh | None by 27/11 | Merge his week-10 parts (#85, #87) through his own pull request this week | 27/11 |

## Self-report and leader's weekly review

| Member | Delivered (self-report, with links) | Reviewer's findings | Revisions (issue, severity, due) |
|---|---|---|---|
| Duy Anh (B) | _(to be filled in by Duy Anh)_ | Tiến (22/11): nothing on GitHub yet this week. Still to come from B: #85 reconciliation and §3.3.3 (note: password reset, FR-40, *is* built), #86 references, #87 Appendix C with signatures, and a commit on `main` for the fifth course week. | — |
| Minh (C) | **20/11:** the final checklist against the course requirements (#295, #90), which found the missing `v1.0` tag and the four-week commit gap; the data dictionary's username index, by teaching the diagram generator to read expression indexes from their migration (#71); the final regression script for TC-01, TC-03 and TC-31, dry-run on a freshly seeded database, all Pass; the blockers and their order posted on #81. **23/11:** re-approved #280; *Overview* added to the run guide as asked (#273); #278 and #281–#283 stacked so they merge without conflicts, with the final testing counts (61 of 65 cases Pass, 106 runs); #295 merged; reviewed and approved #296, #297 and #298 with factual corrections; filed #299 (S4). | Tiến (22/11): #295 is a clear map of what's left before submission, checked row by row against the course requirements. It found the commit-weeks problem early enough to fix. Approved 22/11, with the 12.2 and 12.3 wording added. Still to come: re-approve #280, `v1.0` (#81), TC-32 and TC-33, #88 and #89. | — |
| Tiến (A) | Cleared the review queue in #274: merged #275–#277, merged `main` into #280, approved #273, #278 and #281–#283, and #295 (22/11). Report: Ch.1, Ch.3 functions of A with ten screenshots, Ch.4 and the Proposal feedback table (#296; #73, #75, #83). As-built wireframes for five screens (#297, #156). Weekly reports for weeks 8–10 (this pull request). | Minh: the weekend of 21–22/11 cleared most of the queue (#275–#277 merged; #273, #278, #281–#283 and #295 approved; `main` merged into #280) and produced Ch.1, A's functions, Ch.4 and the Proposal feedback table (#296), five as-built wireframes (#297) and these reports (#298). I reviewed all three on 23/11 and approved them. The corrections I listed there are SO8 and week 9, #299 in Table 4.D, the TC-32 pilot, and two texts that are not as-built. To change: `v1.0` was still not tagged on 23/11. | |
