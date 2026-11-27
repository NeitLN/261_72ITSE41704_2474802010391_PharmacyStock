# Final submission checklist (#90)

Checked against the repository on Fri 20/11/2026 (`b807fd7`) and again on
Fri 27/11/2026 (`main` at `d9376a6`, the release `v1.0.2`), by Minh. Each row says where the evidence is. *Open* means it is not in the
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
| 6 | Run guide in the repository | `docs/run-guide.md` (#273), step 6 brought to the `v1.0.2` start pages and menu labels on 27/11 | Done | — |
| 7 | Submission receipt kept; the files downloaded again open | TC-34 | Open | Minh, after the upload |
| 8 | Links in the report open while logged out | #89 | Open | Minh, after export |

### Version control (§7)

| # | Requirement | Evidence / where | Status | Owner |
|---|---|---|---|---|
| 9 | Repository name `261_72ITSE41704_<LeaderID>_<Topic>` | `261_72ITSE41704_2474802010391_PharmacyStock` | Done | — |
| 10 | `/src`, `/docs`, `/tests`, `README.md`, `.gitignore`; no build output or dependency folders | All present; no `node_modules`, `dist` or dump is tracked | Done | — |
| 11 | `main` always builds | CI passes on every PR into `main`, and on the `v1.0.2` commit (`3c08d41`: Backend, Frontend) | Done | — |
| 12 | Tags `v0.1`, `v0.2`, `v1.0` | `v0.1`, `v0.2`, `v1.0` (`19374ba`, 26/11), then `v1.0.1` and `v1.0.2` (`3c08d41`) after the final code review. The report names `v1.0.2`. The manual final regression (runs 108–123) ran on the `v1.0` code; `v1.0.2` changed 106 source files and is covered by CI (131 unit, 673 end-to-end, 45 web client), not by a manual re-run | Done; see the note | — |
| 13 | Commits in at least 5 of the 10 weeks, from every member | On `main`: Tiến weeks 2, 5–8 and 10, Duy Anh 5–8 and 10, Minh 5–8 and 10 | Done | — |
| 14 | Every member commits their own work under their own account | Three accounts; Duy Anh's two author names share one address | Done | — |

### Report content (§6.2, §6.3, `outline.md`)

| # | Requirement | Evidence / where | Status | Owner |
|---|---|---|---|---|
| 15 | Ch.1 Introduction | `ch1-introduction.md` (#296) | Done | Tiến |
| 16 | Ch.2 Background, with sources | `ch2-background.md`, `ch2-requirements.md`; WHO FEFO citation merged (#277) | Done | Tiến |
| 17 | Ch.3 Architecture and data, ERD, class diagram | `ch3-architecture-data.md`; the ERD, class diagram and data dictionary regenerated from `v1.0.2` on 27/11 (they gained `users.tokenVersion` and the stock-take line index) | Done | Tiến, Minh |
| 18 | Ch.3 Functions of A (UC01–04, UC13) | `ch3-functions-a.md` (#296) | Done | Tiến |
| 19 | Ch.3 Functions of B, with a 5-25 line code excerpt | `ch3-functions-b.md`, brought to `368ae91`; four figures named, two code excerpts of 17 lines | Done | Duy Anh |
| 20 | Ch.3 Functions of C (UC09–12, UC15, UC16) | `ch3-functions-c.md`, brought to `v1.0.2` on 27/11 (one open stock take per medicine, the start pages, token version and sign-in throttle) | Done | Minh |
| 21 | Ch.3 Interface design: wireframes, screenshots, use-case and sequence diagrams | `ch3-interface-design.md` | Draft | Tiến, Duy Anh |
| 22 | Test table: ID, purpose, precondition, input, expected, actual, pass/fail, with the failures found and fixed | Appendix E prints `test-cases.md` (case, data, expected, latest result) and `runs.md` (every run with its actual result and verdict); the defects found and fixed are in `ch3-testing.md` | Done | Minh |
| 23 | Figures and tables numbered, captioned and referred to | `build_report.py` numbers every caption per chapter and logs any unnumbered reference to `out/build-log.md`; check that log at export | At export | Tiến |
| 24 | Screenshots readable, with realistic data, taken on the submitted build | 26 screenshots in `docs/report/figures/`, all committed before the UI changes of #316 (date fields, status tags, start pages, layout), so they show `v1.0`, not `v1.0.2` | **Open** | Each writer, or say in Ch.3 which build they show |
| 25 | Class diagrams match the submitted code | `npm run diagrams` on `v1.0.2` (27/11): `users.tokenVersion` and `uq_stock_take_lines_take_batch` added; otherwise unchanged | Done | Minh |
| 26 | Traceability FR → UC → code → test → status | `docs/requirements/traceability-matrix.md`: FR-41 built in full since `v1.0.1` (price changes write `price.changed`) | Done | Duy Anh |
| 27 | Proposal feedback table: feedback → action → evidence | `proposal-feedback.md` (#296, #311) | Done | Tiến |
| 28 | Ch.4: built against proposed, limitations with **every open bug**, future work | `ch4-conclusion.md`; no bug issue is open on 27/11 (#209, #299 closed) | Done | Tiến |
| 29 | Ch.4: a skills paragraph from each member | `ch4-skills-duy-anh.md`, `ch4-skills-minh.md` (#309); **`ch4-skills-tien.md` missing**, so the build prints a to-do in 4.2 | **Open** | Tiến |
| 30 | Appendix B: AI tools, for what, how the output was checked | Still a to-do in `build_report.py`; `docs/ai-use-log.md` has rows for Duy Anh only | **Open** | Tiến; each member adds their AI-use rows |
| 31 | Appendix C: contributions from Git and GitHub, typed signatures of all three | `appendix-c.md`, C.4 corrected; Duy Anh (#315) and Minh signed, typed and handwritten (Figures C.1, C.2; the build also places both on the declaration page); Tiến to sign | **Open** | Tiến |
| 32 | Appendix D: rubric self-check | `docs/appendix-d-self-check.md`: the 31/10 scores, with the final evidence of §4 (23/11, `368ae91`) | Done | Duy Anh |
| 33 | Third-party libraries with licence and purpose; generated code named | `docs/report/references.md`: 42 direct dependencies with licence and purpose, licence summary, the migrations and the initial scaffold, the AI-use pointer | Done | Duy Anh (W10-B2) |

### Technical minimums (§4.1)

| # | Requirement | Evidence / where | Status |
|---|---|---|---|
| 34 | Layers: presentation, business logic, data access | NestJS controllers → services → TypeORM; rules in services and the stock ledger | Done |
| 35 | Data survives a restart | PostgreSQL; TC-24 | Done |
| 36 | Every input validated with a clear message | DTO validation and the error table; `error-handling.e2e-spec.ts` (121 tests) | Done |
| 37 | Structured exception handling | Domain errors mapped to HTTP codes; TC-25 rollback | Done |
| 38 | 10+ documented test cases with expected and actual results; automated unit tests for the rules | 65 cases, 62 Pass; 131 unit, 673 end-to-end (12 skipped) and 45 web-client tests pass on `v1.0.2` | Done |
| 39 | Consistent GUI | React + Ant Design, one UI kit | Done |

## C. Order of work to submit by Sat 21/11

1. Merge the approved PRs: #275–#277, #280 (needs `main` merged in), #278, #281–#283 (need Duy Anh's re-approval), #273 (Tiến), then this one.
2. Final regression on a freshly seeded database (#81): Minh runs TC-01, TC-03 and TC-31 (script dry-run passed on 20/11), Tiến runs B's cases, Duy Anh runs C's cases.
3. Tag `v1.0` on that commit.
4. Screenshots on `v1.0`, fill in Ch.1, Ch.3 A, Ch.4, the appendices and the test table; number the figures and tables.
5. Export PDF + DOCX, upload to CTE, download again, keep the receipt (TC-34); check the links (#89).
