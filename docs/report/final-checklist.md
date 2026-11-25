# Final submission checklist (#90)

Checked against the repository on Fri 20/11/2026, `main` at `b807fd7`, by
Minh. Each row says where the evidence is. *Open* means it is not in the
repository yet; work done outside it (the Word report, CTE) is ticked by
the person who did it.

## A. Course checklists 12.2 and 12.3

The ten items of §12.2 and the five of §12.3 are in `Course-Guidelines.pdf`,
which is not in the repository. Copy each item in word for word, then tick it
with the matching evidence from section B.

| # | Item (copied from the Guidelines) | Evidence (section B row) | Done |
|---|---|---|---|
| 12.2-1 … 12.2-10 | *to copy* | | |
| 12.3-1 … 12.3-5 | *to copy* | | |

## B. What the course requires, from `docs/course-requirements.md`

### Submission (§8)

| # | Requirement | Evidence / where | Status | Owner |
|---|---|---|---|---|
| 1 | Report as both PDF and DOCX | Not in the repository | Open | Tiến (W10-A3) |
| 2 | File name `2474802010391_VoVietTien_ApplicationProgrammingProject` | Checked at export | Open | Tiến |
| 3 | Cover: course code and name, class group, topic, members with IDs and roles, lecturer, date | Word report | Open | Tiến |
| 4 | Non-plagiarism declaration signed by all three | Word report | Open | Duy Anh collects (W10-B3) |
| 5 | Source as a repository link | `NeitLN/261_72ITSE41704_2474802010391_PharmacyStock`, public | Done | — |
| 6 | Run guide in the repository | README run steps on `main`; the full guide is #273, waiting for Tiến's re-review | Open | Tiến (review) |
| 7 | Submission receipt kept; the files downloaded again open | TC-34 | Open | Minh, after the upload |
| 8 | Links in the report open while logged out | #89 | Open | Minh, after export |

### Version control (§7)

| # | Requirement | Evidence / where | Status | Owner |
|---|---|---|---|---|
| 9 | Repository name `261_72ITSE41704_<LeaderID>_<Topic>` | `261_72ITSE41704_2474802010391_PharmacyStock` | Done | — |
| 10 | `/src`, `/docs`, `/tests`, `README.md`, `.gitignore`; no build output or dependency folders | All present; no `node_modules`, `dist` or dump is tracked | Done | — |
| 11 | `main` always builds | CI passes on every PR into `main`; the last ones on 05/11 (#273, #278, #281–#283) | Done | — |
| 12 | Tags `v0.1`, `v0.2`, `v1.0` | `v0.1` and `v0.2` exist; **`v1.0` does not** | **Open, blocker** | Tiến tags, after the final regression |
| 13 | Commits in at least 5 of the 10 weeks, from every member | On `main`: Tiến 5 weeks, Minh 5 (weeks 5–8 and 10); **Duy Anh 4 (weeks 5–8)** — his 23/11 commit in #301 adds the fifth | **Open** | Duy Anh |
| 14 | Every member commits their own work under their own account | Three accounts; Duy Anh's two author names share one address | Done | — |

### Report content (§6.2, §6.3, `outline.md`)

| # | Requirement | Evidence / where | Status | Owner |
|---|---|---|---|---|
| 15 | Ch.1 Introduction | Not in `docs/report/` | Open | Tiến |
| 16 | Ch.2 Background, with sources | `ch2-background.md`; #277 (WHO FEFO citation) approved, not merged | Draft | Tiến |
| 17 | Ch.3 Architecture and data, ERD, class diagram | `ch3-architecture-data.md`; diagrams regenerated from code on 20/11 and unchanged | Draft | Tiến |
| 18 | Ch.3 Functions of A (UC01–04, UC13) | **No file in `docs/report/`** | Open | Tiến |
| 19 | Ch.3 Functions of B, with a 5-25 line code excerpt | `ch3-functions-b.md`, brought to `368ae91`; four figures named, two code excerpts of 17 lines | Done | Duy Anh |
| 20 | Ch.3 Functions of C (UC09–12, UC15, UC16) | `ch3-functions-c.md`; brought to 05/11 in #283 (waiting for review) | Draft | Minh |
| 21 | Ch.3 Interface design: wireframes, screenshots, use-case and sequence diagrams | `ch3-interface-design.md` | Draft | Tiến, Duy Anh |
| 22 | Test table: ID, purpose, precondition, input, expected, actual, pass/fail, with the failures found and fixed | `ch3-testing.md` has the results summary and the defect table; the full table with actual results is still to be built from `test-cases.md` and `runs.md` on the submitted tag | Open | Minh |
| 23 | Figures and tables numbered, captioned and referred to | Still `Figure 3.x` / `Table 3.x` placeholders: 6 in `ch3-functions-c.md`, 8 in `ch3-interface-design.md`, 4 in `ch3-testing.md` | Open | Each writer; Tiến numbers them when editing |
| 24 | Screenshots readable, with realistic data, taken on the submitted build | Need `v1.0` | Open | Each writer |
| 25 | Class diagrams match the submitted code | `npm run diagrams` on `b807fd7`: ERD and class diagram unchanged; data dictionary gains the `LOWER(username)` index (this PR) | Done | Minh |
| 26 | Traceability FR → UC → code → test → status | `docs/requirements/traceability-matrix.md`, snapshot 23/11 at `368ae91`: 46 Built, 0 Built-not-run, FR-41 partly built, FR-42 (Could) not built | Done | Duy Anh |
| 27 | Proposal feedback table: feedback → action → evidence | Not found in `docs/` | Open | Tiến (W09-A3) |
| 28 | Ch.4: built against proposed, limitations with **every open bug**, future work | Not in `docs/report/`. Open bugs today: #299 (S4, the alerts empty text; fix in #297), #209 (fixed in #220, re-tested in run 73, issue not closed); #159 has its write-up in `tests/manual/evidence/` but no measurement. The S4 UX set #254-#258, #279 and #158 are closed with their fixes; #104 is closed | Open | Tiến |
| 29 | Ch.4: a skills paragraph from each member | B's paragraph in `ch4-skills-duy-anh.md` (for Tiến to paste); A's and C's still to write | Draft | Each member |
| 30 | Appendix B: AI tools, for what, how the output was checked | `docs/ai-use-log.md` holds the rows; the appendix is not written | Open | Tiến |
| 31 | Appendix C: contributions from Git and GitHub, typed signatures of all three | `docs/report/appendix-c.md`; Duy Anh signed, Tiến's and Minh's signatures to collect | Draft | Duy Anh (W10-B3) |
| 32 | Appendix D: rubric self-check | `docs/appendix-d-self-check.md`: the 31/10 scores, with the final evidence of §4 (23/11, `368ae91`) | Done | Duy Anh |
| 33 | Third-party libraries with licence and purpose; generated code named | `docs/report/references.md`: 42 direct dependencies with licence and purpose, licence summary, the migrations and the initial scaffold, the AI-use pointer | Done | Duy Anh (W10-B2) |

### Technical minimums (§4.1)

| # | Requirement | Evidence / where | Status |
|---|---|---|---|
| 34 | Layers: presentation, business logic, data access | NestJS controllers → services → TypeORM; rules in services and the stock ledger | Done |
| 35 | Data survives a restart | PostgreSQL; TC-24 | Done |
| 36 | Every input validated with a clear message | DTO validation and the error table; `error-handling.e2e-spec.ts` (121 tests) | Done |
| 37 | Structured exception handling | Domain errors mapped to HTTP codes; TC-25 rollback | Done |
| 38 | 10+ documented test cases with expected and actual results; automated unit tests for the rules | 65 cases, 56 Pass; 126 unit and 646 end-to-end tests pass on `b807fd7` | Done |
| 39 | Consistent GUI | React + Ant Design, one UI kit | Done |

## C. Order of work to submit by Sat 21/11

1. Merge the approved PRs: #275–#277, #280 (needs `main` merged in), #278, #281–#283 (need Duy Anh's re-approval), #273 (Tiến), then this one.
2. Final regression on a freshly seeded database (#81): Minh runs TC-01, TC-03 and TC-31 (script dry-run passed on 20/11), Tiến runs B's cases, Duy Anh runs C's cases.
3. Tag `v1.0` on that commit.
4. Screenshots on `v1.0`, fill in Ch.1, Ch.3 A, Ch.4, the appendices and the test table; number the figures and tables.
5. Export PDF + DOCX, upload to CTE, download again, keep the receipt (TC-34); check the links (#89).
