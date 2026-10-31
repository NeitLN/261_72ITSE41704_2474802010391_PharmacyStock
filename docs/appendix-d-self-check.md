# Appendix D — Rubric self-check at `v0.2`

**Date:** Sat 31/10/2026 (week 7 checkpoint) · **Build checked:** `main` at `197b460` (31/10; the tag `v0.2` goes on the commit that merges this page) · **Scored by:** Tiến, Duy Anh, Minh
together in the meeting; **recorded by:** Duy Anh. The criteria are the five of the Final Report (Guidelines §6.2,
2.0 points each, `course-requirements.md`) and the technical minimums of §4.1. Each score is the team's own
judgement against the evidence linked; the *gap* column is what the team agreed to do before the freeze (09/11).

## 1. Final Report criteria (2.0 each)

| Criterion | CLO | Evidence on `main` | Gap seen | Team score /2.0 | Agreed actions (owner, date) |
|---|---|---|---|---|---|
| Requirements Analysis & Specifications | CLO1 | 48 FR and 13 NFR, measurable (`functional-requirements.md`); 11 business rules with worked examples (`business-rules.md`, #132); DEC-01…10 reviewed by a pharmacist; use-case specs for all 13 Must use cases and UC13, UC14, UC15 (#234); scenario tables per use case; traceability matrix FR → UC → code → test → run (#167, #207: on 27/10, 31 of 48 FRs Built and 9 Must waiting only for a manual run) | Specs must match what was built — recheck each "Status" row at v0.2 | | |
| Collaborative Development & Version Control | CLO2 | Branch per issue, PR template, review rotation, protected `main` with a ruleset (#93); CI on every PR (#115). Non-merge commits on `main` (31/10 at `197b460`): Tiến 97, Duy Anh 90, Minh 49; merged PRs: Tiến 35, Duy Anh 52, Minh 33; PRs reviewed: Tiến 33, Duy Anh 46, Minh 59; required CI and up-to-date branches before merge (#191); weekly reports `docs/progress/` | Commits must stay spread across the term for every member, not bunched at the end | | |
| System Design & User Interface | CLO3 | Layered NestJS (controller → service → `StockLedger`); class diagram, ERD and data dictionary generated from the entities (#151, regenerated and checked against the code in #227); use-case diagram (#111, «extend» in #160); sequence diagrams 1–8; `ui-design.md` with inventory, state matrix, conventions and motion (§5.1, #163); wireframes (#151, #154) | Wireframes of B's and C's screens are *as-built* only from week 8; screenshots at v1.0 | | |
| Implementation & Testing | CLO4 | Rules in services and domain classes (`FefoAllocator`, `ExpiryPolicy`, `PrescriptionValidator`, `StockLedger`); one error format with field errors (#140); unit (125) and e2e (562, 23 files) tests in CI, both required checks, named after the rules (`BRxx-*`, `UCxx-*`); races tested 20 rounds each, two of them with the overlap forced by a held lock (#165, #229); manual runs (31/10: 71 runs; 52 of 65 TCs Pass, none Fail) with evidence and a database check; Must-core gate passed on 30/10 (#233); exploratory testing of A and C raised #183–#185 (#186) | 13 TCs not run yet (week 8–9 cases: stress, performance, backup, Should features, outside users); four fixed bugs wait for their re-test (#183, #184, #185, #209) | | |
| Report Writing Quality & Documentation | CLO5 | Report outline with a writer per part (#113); drafts of Ch.3 Functions of B (#230), Functions of C and Testing (#232); docs kept with the code (specs, design, diagrams, journal, AI-use log) | Ch.1–3 parts of A start in week 8 (W08-A3); figures and screenshots only on `v1.0` | | |

**Total** (team's estimate): ___ / 10

## 2. Technical minimums (Guidelines §4.1)

| # | Requirement | Met? | Evidence |
|---|---|---|---|
| 4 | Architecture: presentation / business logic / data access separated; no rules in event handlers | | `how-to-add-a-module.md`; services hold every rule; controllers are thin |
| 5 | Persistence; data survives restart | | PostgreSQL 18 with migrations; TC-24 Pass (run 27) |
| 7 | Every input validated, clear message, never a crash | | DTOs + `numberRules` on the forms (#126, #127); error table #140; TC-02, TC-11, TC-47 Pass |
| 8 | Structured exception handling (data access, parsing) | | `DomainError` hierarchy, the exception filter mapping PostgreSQL errors (ERR-07…10) |
| 9 | 10+ documented cases with expected and actual results; automated tests for the rules | | `test-cases.md` (65), `runs.md` (71 runs), unit and e2e in CI |
| 10 | Consistent GUI | | Ant Design throughout; `ui-design.md` conventions |

## 3. What would cost marks now (agreed in the meeting)

- …
- …

## 4. Sign-off

| Member | Agrees with the scores |
|---|---|
| Võ Việt Tiến (A) | |
| Bùi Duy Anh (B) | |
| Võ Hoàng Minh (C) | |
