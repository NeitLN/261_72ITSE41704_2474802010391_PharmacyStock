# Chapter 1 — Introduction

> **W09-A1 (#73), written by Tiến.** Updated from Chapter 1 of Proposal v1.1
> (11/10/2026) to what was built, on `main` at `9063509` (22/11/2026).
> Citations use the Proposal's numbering (list at the end); the editor merges
> them into the report's reference list. Table numbers are set when the
> chapters are joined.

## 1.1 Background and rationale

### Reasons for selecting the topic

Members of our team have bought medicine at small private pharmacies many
times, and more than once we were sold a product that had already expired; we
noticed only later, reading the box at home. We also saw pharmacists look a
medicine up in a printed list or walk along the shelves to find it. Small
pharmacies like these usually record stock per medicine in a notebook or a
simple spreadsheet, not per batch, so nobody knows exactly which box expires
first. The catalogue entry for our topic describes the same problem: expired
stock is found only when a customer is already at the counter, and batch
tracking is done by hand [3].

The people affected are:

- **The pharmacy manager**, who does not know which batches will expire soon,
  finds expired goods late and throws them away, and whose paper stock figures
  do not match the shelves.
- **The pharmacist**, who finds the right box and checks its expiry and the
  prescription by hand, often while customers wait, and has no record of which
  batch was given out if something goes wrong.
- **The cashier**, who records sales and returns on paper; a wrong number is
  crossed out, so the history is lost.
- **The customer**, who takes the final risk of going home with an expired
  medicine.

We chose the topic for three reasons. It is a problem we have experienced
ourselves, and an unsafe one: Vietnamese retail pharmacies must keep records
and check the quality and expiry of their medicines under the Good Pharmacy
Practices circular [1], the Law on Pharmacy has special rules for controlled
medicines [6], and WHO storage guidance says the batch that expires first
should leave first (FEFO) [2]. It has many business rules beyond CRUD to
analyse, implement and test: FEFO batch selection, no expired batches, no
negative stock, a valid prescription for controlled medicines, and a stock
ledger corrected only by a new opposite entry [3], [4]. And its size, rated
*Substantial* for two to three students [3], fits our team of three.

### Importance and practical significance

With the system, a pharmacy can (1) stop selling expired medicine, because the
system refuses to issue it; (2) waste less, because older batches leave first;
(3) explain every stock number from its movements; and (4) answer "who gave out
what, from which batch, and when". This is a student project with simulated
data: it gives no medical advice, does not check drug interactions and is not
certified against any regulation.

## 1.2 Objectives of the project

### General objective

To analyse, design, build and test, in ten weeks, a web application that helps
one pharmacy track every medicine by batch from the moment it is received
until it is dispensed, sold or returned, so that the system, not the memory of
the staff, stops expired stock from being issued and every change in stock can
be traced to a person and a document.

### Specific objectives and how far they were met

Table 1.1 keeps the objectives and measures of the Proposal and adds the
result. The evidence is in the repository: requirements in
`docs/requirements/`, test runs in `tests/manual/runs.md`, and the weekly
reports in `docs/progress/`.

*Table 1.1 — Specific objectives, measures and results*

| ID | Objective | Measure of success (Proposal) | Result |
|---|---|---|---|
| SO1 | Specify the system as numbered, testable requirements | 48 FR and 13 measurable NFR; every Must FR traced to a use case and a test case; decisions reviewed by a practising pharmacist | Met. 48 FR and 13 NFR in `functional-requirements.md`, each traced in `traceability-matrix.md`; DEC-01–10 reviewed in week 4 and followed up in week 5 |
| SO2 | Implement the Must use cases end to end | 13/13 Must use cases from UI to database, surviving a restart | Met, and beyond: 13 Must and all 3 Should use cases (UC13–UC15) are built |
| SO3 | Enforce the business rules in the business layer | BR01–05, BR07, BR10, BR11 in domain/service classes, each with ≥ 3 automated tests | Met. Each rule has `BRxx-*` tests (`docs/design/business-rule-scenarios.md`); BR08 and BR09 (Should) too |
| SO4 | Separate three roles | 0 forbidden calls succeed in the role × endpoint test (TC-53) | Met. TC-53: 77 routes × 3 roles, 233 checks pass (run 91) |
| SO5 | Test the system and document the results | Every Must-rule test case incl. TC-26, TC-54, TC-62, plus ≥ 45 of 63 test cases run by a member other than the author | Met. 65 test cases (TC-64 and TC-65 added during the project); the concurrency cases pass (runs 77–78); see Ch.3 *Testing* for the final count |
| SO6 | Meet the quality targets | NFR-01–03 measured on the reference machine and with two outside users | NFR-01, 02 and 13 met with a wide margin (TC-29, run 83: 22 ms, 71 ms and 258 ms against 1 s, 3 s and 2 s). NFR-03 (TC-32, two outside users) — see Ch.3 *Testing* |
| SO7 | Deliver a system others can run | 50–200 realistic seed records; a fresh clone runs from the README in ≤ 30 min | Seed: 60 medicines, 10 suppliers, 12 patients, 7 prescribers, 120 batches from 24 receipts and two months of sales. Run guide `docs/run-guide.md`; a dry run took 5 minutes. TC-33 on another machine — see Ch.3 *Testing* |
| SO8 | Work as a team with visible evidence | Weeks 4–9: every member merges a reviewed PR for their own slice and reviews another member's PR each week | Partly met. Duy Anh and Minh made no commits in weeks 2–4, and nobody committed in week 4; from week 5 all three merged reviewed pull requests for their own slices (exact counts per week in Appendix C) |

## 1.3 Scope of the project

### Research scope

The part of a retail pharmacy's work that concerns stock and dispensing:
batches and expiry dates, goods receipts, prescriptions and dispensing,
over-the-counter sales and returns, stock takes, alerts and stock reports.
Regulations [1], [6], [17] and WHO guidance [2] were used only to understand the
domain; pharmacology and clinical decisions were not studied.

### System scope as built

The scope was prioritised with MoSCoW in the Proposal so that we would know
what to cut. Table 1.2 shows what came of each part.

*Table 1.2 — Scope proposed and scope built*

| Priority | Proposed | Built |
|---|---|---|
| Must (13 use cases) | UC01–UC12 and UC16: catalogue with price and classification, suppliers, goods receipts, stock lookup and batch history, prescriptions with pharmacist verification, dispensing, sales, returns into quarantine, stock take, low-stock and expiry alerts with write-off, stock movement report, sign in/out; BR01–05, BR07, BR10, BR11; three roles | All built |
| Should (3 use cases and extras) | UC13 price history, UC14 customers and prescribers, UC15 users and roles; quarantine assessment and destruction records (FR-46, FR-47); BR08, BR09; backup and restore | All built after the Must-core gate in week 7, except one part of FR-41: price changes are not written to the audit log (Ch.3, *functions not implemented*) |
| Could | Unit-of-measure conversion (BR06, FR-42); export of reports to Excel or PDF (FR-43) | BR06 not built (cut first, as planned). FR-43 built as CSV export of the expiry and stock movement reports, plus printing of receipts, return slips and hand-over records |
| Added | — | A role-aware overview page as the start page for managers and cashiers; the LotOrder visual identity |

*Table 1.3 — Size against the expectation for three students [3]*

| Dimension | Expected | Proposed | Built |
|---|---|---|---|
| Use cases end to end | 13–16 | 16 | 16 |
| Meaningful domain classes | 16–22 | 25 | 29 entity classes in `src/backend/src/entities/` |
| Roles with distinct permissions | 3+ | 3 | 3 (Manager, Pharmacist, Cashier), 14 permissions checked in the service layer |
| Non-trivial business rules | 6+ | 11 | 10 (BR06 not built) |
| Documented test cases | 20+ | 63 | 65, plus 126 unit, 646 end-to-end and 36 web-client automated tests (on `b807fd7`) |

The out-of-scope list of the Proposal still holds: one branch and one storage
location only; no link to the national pharmacy data system, e-prescriptions,
insurance or e-invoices; no online payment; no barcode scanning or automatic
reordering; no clinical checks; no purchase orders or supplier accounts; no
mobile app or public deployment (a documented local run procedure is
delivered [4]); only simulated data; no special dates for narcotic ("N")
prescriptions.

### Time and organisational scope

Ten weeks, Monday 14/09/2026 (week 1) to Sunday 22/11/2026 (week 10), about 12
hours per member per week. Supervised online by Dr. Nguyen Tri Hai. One
pharmacy, prices in VND, every date rule in Vietnam time (Asia/Ho_Chi_Minh).

## 1.4 Research methodologies

**Information collection.** Requirements came mainly from documents: the
catalogue entry for topic 12 [3], the course guidelines and self-study
materials [4], [5], the Law on Pharmacy [6], the GPP circular [1], the
prescription circular [17] and WHO storage guidance [2]. From these we took the
business rules, key terms and roles, and wrote requirements and use cases
following standard practice [7]–[9].

**Observation and practical investigation.** Informal observation as customers
of small pharmacies. In week 4 a practising pharmacist reviewed our ten business
decisions in a recorded conversation; the written summary is
`docs/requirements/pharmacist-review-week4.md`, and the two points left open
(DEC-09, DEC-10) were followed up in week 5
(`pharmacist-followup-week5.md`). The reviewer is a relative of the team
leader and the only reviewer, so this is an informal validation.

**Data analysis.** The domain was turned into an entity model and an ERD
generated from the code (`docs/design/`). Each open business question got a
decision table with options, choice and reason
(`docs/requirements/business-decisions.md`, `decisions/`). Every requirement
has a MoSCoW priority and is traced to use case, code and test.

**Comparative and statistical methods.** Desktop and web, and several
frameworks, were compared before the stack was chosen (Ch.2). Performance was
measured as the median of 10 runs on one recorded machine with a separate,
large database (TC-29); backup and restore were checked by comparing balance
checksums before and after (TC-30).

**Engineering method.** Vertical slices per use case, three releases (`v0.1`
in week 5, `v0.2` in week 7, `v1.0` in week 9), tests first for every business
rule, and every change through a feature branch and a pull request reviewed by
another member under a protected `main` with required CI. Work packages are
GitHub Issues under weekly milestones; meetings and decisions are in
`docs/journal.md`, and weekly reports for the lecturer in `docs/progress/`.

## 1.5 Outcomes

**Knowledge and skills.** Requirements engineering, UML, layered architecture,
object-oriented TypeScript, PostgreSQL transactions and locking, automated
testing, Git teamwork and technical English. Each member describes what they
gained in Chapter 4.

**Products delivered.**

- *Reports:* the Project Proposal (week 3, v1.1 in week 4) and this Final
  Project Report, in PDF and DOCX.
- *Software:* LotOrder, a web application with a React and Ant Design client
  and a NestJS REST API, in the team repository, tagged `v0.1`, `v0.2` and
  `v1.0`.
- *Database:* a PostgreSQL 18 schema built only by migrations, with a seed of
  realistic simulated data for all three roles.
- *Documentation:* README and run guide; use-case, class and sequence diagrams;
  ERD and data dictionary generated from the code; wireframes; the test-case
  table and run log; the journal and weekly reports.

## 1.6 Structure of the report

The report follows the course template [4]. Chapter 2 presents the theoretical
background (the layered architecture, the persistence technology, FEFO), the
current manual process and the requirement analysis. Chapter 3 is the core:
system design (use cases, data flow, ERD, interface design), every implemented
function with inputs, outputs and screenshots, the functions not implemented
and why, and the testing process and results. Chapter 4 compares what was
completed with what was proposed and gives the limitations, future work and
the skills each member gained. The references and appendices follow: the full
test log, the AI-use declaration (Appendix B), the contribution table
(Appendix C) and the rubric self-check (Appendix D).

## References (this chapter)

Numbering follows the Proposal; the editor merges it into the report's list.

[1] Ministry of Health of Vietnam, "Circular No. 02/2018/TT-BYT on Good
Pharmacy Practices," Hanoi, Vietnam, Jan. 22, 2018.

[2] World Health Organization, "Annex 9: Guide to good storage practices for
pharmaceuticals," in *WHO Expert Committee on Specifications for
Pharmaceutical Preparations: Thirty-seventh Report*, WHO Technical Report
Series, no. 908. Geneva, Switzerland: WHO, 2003.

[3] N. T. Hai, "Application Programming Project: Suggested Project Titles,"
Faculty of Information Technology, Van Lang University, Ho Chi Minh City,
Vietnam, 2026.

[4] N. T. Hai, "Application Programming Project: Course Guidelines for
Students," Faculty of Information Technology, Van Lang University, Ho Chi Minh
City, Vietnam, 2026.

[5] N. T. Hai, "Application Programming Project: Self-study Materials Pack,"
Faculty of Information Technology, Van Lang University, Ho Chi Minh City,
Vietnam, 2026.

[6] National Assembly of Vietnam, "Law on Pharmacy No. 105/2016/QH13," Hanoi,
Vietnam, Apr. 6, 2016 (amended in 2024).

[7] I. Sommerville, *Software Engineering*, 10th ed. Boston, MA, USA: Pearson,
2016.

[8] K. Wiegers and J. Beatty, *Software Requirements*, 3rd ed. Redmond, WA,
USA: Microsoft Press, 2013.

[9] A. Cockburn, *Writing Effective Use Cases*. Boston, MA, USA:
Addison-Wesley, 2001.

[17] Ministry of Health of Vietnam, "Circular No. 26/2025/TT-BYT on
prescriptions and the prescribing of chemical and biological medicines in
outpatient treatment," Hanoi, Vietnam, Jun. 30, 2025.
