# Course requirements — what we are measured against

Taken from `Course-Guidelines.pdf`, `Suggested-Project-Titles.pdf` and
`Self-study-Materials.pdf`. Section references are to those documents.

## Scope calibration for a three-person team

From Suggested Project Titles, Table 2 (page 2). **These are the numbers a
three-person team is expected to hit** — higher than the Course Guidelines
§4.1 minimums, which state only what is needed to pass.

| Dimension | Minimum to pass (§4.1) | Expected for 3 students | Where we are |
|---|---|---|---|
| Use cases implemented end-to-end | 6 | **13–16** | 0 built, 16 planned |
| Meaningful domain classes | 8 | **16–22** | 25 defined |
| User roles with distinct permissions | 2 | **3+** | 3 planned |
| Non-trivial business rules | 3 | **6+** | 10 identified |
| Documented test cases | 10 | **20+** | 34 planned |
| Catalogue topic level | — | Substantial or Ambitious | Topic 12 is Substantial |

> "A topic that fails the calibration in either direction is a risk: too small
> and there is nothing to design, too large and nothing will be finished."

## Other technical requirements (Guidelines §4.1)

| # | Requirement | Minimum |
|---|---|---|
| 4 | Architecture | Separation of presentation / business logic / data access. No business rules inside event handlers. |
| 5 | Persistence | Relational database or structured files with a documented schema. Data survives restart. |
| 7 | Input validation | Every input validated; invalid input gives a clear message, never a crash. |
| 8 | Exception handling | Structured handling of at least data-access and input-parsing failures. |
| 9 | Testing | 10+ documented cases with expected and actual results. **Automated unit tests for the business rules are what the Excellent band describes.** |
| 10 | User interface | Consistent GUI. Console-only needs prior written approval. |

## What will not be accepted (§4.2)

- A tutorial project reproduced with cosmetic changes, or a fork of an existing application.
- A single-file script, a static website with no persistent data, or a UI prototype with no working logic.
- **A project whose entire commit history appears in the last few days of the term.**
- Any submission the team cannot explain when asked.

## Milestones (§2)

| Week | Deliverable | Graded |
|---|---|---|
| 1 | Team & Topic Registration form (Appendix A) + repository URL | No — mandatory |
| 2 | Draft proposal (optional review) | No |
| 3 | **Project Proposal — PDF + DOCX** | **Yes — 20%** |
| 4 | Design artefacts committed to the repository | No |
| 5 | Tagged release `v0.1` | No |
| 6 | Test-case table | No |
| 7 | Tagged release `v0.2`; rubric self-check (Appendix D) | No — checkpoint |
| 8 | Updated design documentation | No |
| 9 | Tagged release `v1.0`; draft report | No |
| 10 | **Final Project Report (PDF + DOCX) + source + repository link + run guide** | **Yes — 80%** |

Exact submission dates and times are published on E-learning/CTE.

## How the Final Report is marked (§6.2)

Five criteria, 2.0 points each.

| Criterion | CLO | What the marker looks for |
|---|---|---|
| Requirements Analysis & Specifications | CLO1 | Complete, measurable functional and non-functional specifications; detailed use cases matching what was built. |
| Collaborative Development & Version Control | CLO2 | Frequent, logical commits **from every member across the whole term**; branches, pull requests, clear messages. |
| System Design & User Interface | CLO3 | Clean architecture; correct UML class, use-case and sequence diagrams; an ERD; a consistent, usable interface documented with wireframes and screenshots. |
| Implementation & Testing | CLO4 | Robust implementation using OOP principles; rigorous validation; comprehensive exception handling; thorough, documented testing. |
| Report Writing Quality & Documentation | CLO5 | Strict adherence to the template; logical organisation; technical accuracy; correct figures, tables, citations and references; clear English. |

The Project Proposal is marked on two criteria of 5.0 each: *Problem Definition
& Requirement Analysis* (CLO1) and *Documentation Quality & Work Plan* (CLO5).

## The five mistakes that cost the most marks on the Proposal (§5.3)

- Requirements written as topic headings ("manage students") instead of testable statements.
- No non-functional requirements at all, or unmeasurable ones ("the system must be fast").
- A scope either enormous (a full ERP) or trivial (a contact list).
- **A work plan copied unchanged from the template, with no names and no outputs.**
- Not following the template: missing declaration form, missing table of contents, chapters renamed.

## Version control requirements (§7)

- One repository per team, named `261_72ITSE41704_<TeamLeaderID>_<ShortTopic>`. **Add the lecturer as a collaborator, or make it public, in Week 1.**
- Structure: `/src`, `/docs`, `/tests`, `README.md`, `.gitignore`. No build artefacts, dependency folders or large database dumps.
- `main` always builds; short-lived feature branches merged through pull requests.
- Tags `v0.1` (week 5), `v0.2` (week 7), `v1.0` (week 9).
- Commits small, frequent, imperative mood. **Aim for commits in at least 5 of the 10 weeks.**
- **Every member commits their own work under their own account. One member pushing everyone's code destroys the evidence and costs the whole team marks under CLO2.**

## Submission rules (§8)

| Item | Rule |
|---|---|
| Where | E-learning (proposal), CTE (final report). **Nothing is accepted by email.** |
| Formats | Report as **both** PDF and DOCX. Source as ZIP or repository link. Run guide as PDF or Markdown in the repository. |
| File naming | `StudentID_FullName_ApplicationProgrammingProject` — e.g. `2474802010391_VoVietTien_ApplicationProgrammingProject.pdf` |
| Cover page | Course code and name, class group, topic title, all members with student IDs and roles, lecturer's name, submission date. |
| Declaration | Non-plagiarism declaration form from the template, signed by every member. |
| Technical failure | Keep the submission receipt. **A corrupted or unopenable file is a non-submission** — verify by downloading it again. |

If E-learning/CTE is down at the deadline: screenshot it, email the lecturer
immediately with the files attached, and upload as soon as the system is back.

## Evidence standards (§6.3)

- **Figures.** Numbered and captioned, and referred to in the text. A diagram nobody refers to earns nothing.
- **Screenshots.** Cropped, readable, with **realistic sample data — never lorem ipsum, never 'aaa' or 'test123'**. Seed 50–200 realistic records.
- **Code excerpts.** 5–25 lines illustrating a design decision, with an explanation. Never whole files.
- **Test cases.** One table: ID, purpose, precondition, input, expected result, actual result, pass/fail. **Include the failures you found and fixed — that is evidence of testing, not weakness.**
- **Diagrams.** Class diagrams must match the submitted code. A diagram that contradicts the repository is worse than no diagram.

## Academic integrity and AI (§10)

- AI assistants are allowed. Use must be declared in **Appendix B**: which tool, for what, and how the output was verified. Declared, verified use is not penalised.
- Undeclared AI-generated content, a purchased project, or a fabricated repository history are academic dishonesty.
- **The lecturer may ask any student to explain any part of their submission online.** Inability to explain your own work is treated as academic dishonesty.
- Third-party libraries must be listed in the report with their licence and purpose.

## Marks and individual adjustment (§9)

- Course grade = 20% Proposal + 80% Final Report, on the 10-point scale.
- A team normally receives one mark per deliverable.
- **Individual marks are adjusted — up or down — where the repository history and the Appendix C contribution table show materially unequal contribution.**
- A member with no commits and no documented contribution may receive zero for the Collaborative Development criterion.
- Proposal feedback is returned within one week. **The Final Report is marked partly on whether the team acted on it.**

## The four failure patterns (Self-study Module 0)

| Pattern | What it looks like | Antidote |
|---|---|---|
| The silent middle | Busy weeks 1–3, nothing in 4–7, panic in 8–10. | Tagged releases in weeks 5, 7 and 9. If there is nothing to tag, you have found the problem early. |
| The single hero | One member commits everything; the others "help". | Assign modules, not chores. Each member owns a vertical slice and commits it themselves. |
| The infinite framework | Three weeks lost choosing and learning a stack. | Choose in week 1 what most of the team already knows. **The stack earns no marks.** |
| Documentation last | Diagrams and report written in week 10 from memory. | Keep `/docs` beside the code and update it in the same commit as the change. |

## Working rhythm (Module 0)

- 200 hours of learning activity per student, of which **roughly 12 hours a week is project work** — a three-person team has about **500–600 person-hours** of actual project work across the term.
- Fix two slots a week that never move: a whole-team session (2–3 hours) and an individual block per member.
- **Vertical slices, not layers.** Build one feature end-to-end through UI, service and storage before starting the next. Do not build "all the database", then "all the logic", then "all the screens".
- **Definition of done:** the code compiles, the rule is implemented in a service class, there is at least one test, the input is validated, the failure path is handled, and it is merged into `main`. Anything short of that is started, not done.
- End every team session the same way: everything committed and pushed, the next three tasks written down with owners, and one line in `docs/journal.md`.

## Turning any topic into an Excellent project (Titles §5)

- **Model the rules, do not scatter them.** Business rules belong in domain or service classes that can be tested without a user interface. Rules inside button handlers are the single most common reason a project scores in the Average band for design.
- **Two roles, two journeys.** Implement at least two genuinely different user journeys end-to-end, rather than one journey plus a login screen.
- **Make the invariants explicit.** Stock never negative, a ledger that balances — state them in the report, enforce them in code, prove them with tests.
- **Use realistic data.** Seed 50–200 realistic records.
- **Finish and polish.** A smaller system that is complete, validated, tested and honestly documented outscores a larger one that crashes on the second click.

## Reading schedule (Self-study Materials, Table 1)

| Module | Title | Read in |
|---|---|---|
| 0 | Working without classes: how to run your own project | Week 1 |
| 1 | Requirements engineering | Week 2 |
| 2 | Use cases, scope and planning | Weeks 2–3 |
| 3 | Software architecture and UML | Week 4 |
| 4 | Data modelling and persistence | Weeks 4 and 8 |
| 5 | User interface design | Week 4 |
| 6 | Object-oriented implementation | Week 5 |
| 7 | Version control with Git | Week 1, used all term |
| 8 | Testing and validation | Week 6 |
| 9 | Refactoring, errors and robustness | Weeks 7–8 |
| 10 | Writing the technical report | Weeks 9–10 |

The modules use a running example, CampusLib, which is deliberately not one of
the thirty catalogue topics.

## Useful answers from the FAQ (§13)

- **Language:** any, as long as the solution shows object-oriented design and a layered architecture.
- **Mobile/web/desktop:** all acceptable.
- **Public deployment:** not required. A documented local build and run procedure is enough.
- **Code generators/frameworks:** allowed, but then the marks come from what the generator did not write — the domain model, business rules, validation, tests and design documentation. Say clearly in the report what was generated.
- **Report language:** English only. Both deliverables.
- **Report length:** no target. Typically 35–60 pages plus appendices. Padding is visible and is marked down.
- **If you cannot finish everything proposed:** finish and polish a smaller coherent system, and report honestly what was not implemented and why. **An honest, complete report on 80% of the plan outscores a confused report claiming 100%.**

## Contact

Lecturer: Dr. Nguyen Tri Hai — `hai.nguyentri@vlu.edu.vn`.
Put `72ITSE41704` and the team name in the subject. Answered within two working
days. **When stuck for more than a day, ask.**
