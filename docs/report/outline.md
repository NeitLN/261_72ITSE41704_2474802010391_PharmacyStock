# Final Report — outline and writers

The Final Report (80%) is written in English on the course template and
submitted as PDF and DOCX on CTE in week 10
([course requirements](../course-requirements.md)). This page fixes who
writes which part, so nobody waits for it in week 8. Each writer owns their
section; the editor only makes the parts consistent and sends content
comments back to the writer.

Task IDs refer to the weekly plans in [`../plan/`](../plan/).

| Part | Content | Writer | Draft | Final |
|---|---|---|---|---|
| Cover, declaration | Course, class group, topic, members with IDs and roles, lecturer, date; signed non-plagiarism form | Tiến | — | W10-A1 |
| Ch.1 Introduction | Problem and who is affected (sourced), measurable objectives, scope with Must/Should/Could, method, report structure — updated to what was built | Tiến | Proposal v1.1 | W09-A1 |
| Ch.2 Background | Layered NestJS architecture, TypeORM, FEFO, how a pharmacy works today (sourced) | Tiến | W08-A3 | W09-A1 |
| Ch.3 Architecture and data | ERD and tables, data flow, the stock ledger | Tiến | W08-A3 | W09-A2 |
| Ch.3 Functions of A | UC01–UC04, UC13: description, input/output, screenshots on `v1.0` | Tiến | — | W09-A1 |
| Ch.3 Functions of B | UC05–UC08, UC14: description, input/output, a 5–25 line FEFO / `StockLedger` excerpt with explanation | Duy Anh | W08-B3 | W09-B1 |
| Ch.3 Interface design | Navigation, screens, wireframes; use-case and sequence diagrams numbered and captioned | Duy Anh | W08-B3 | W09-B1 |
| Ch.3 Functions of C | UC09–UC12, UC15, UC16 | Minh | W08-C3 | W09 |
| Ch.3 Testing | Test process, the test-case table with actual results, failures found and fixed, regression pack R | Minh | W08-C3 | W09 |
| Traceability | FR → UC → service → test → status (done / partly / not, with reason) | Duy Anh | — | W09-B3 |
| Proposal feedback | Feedback → action → evidence | Tiến | — | W09-A3 |
| Ch.4 Conclusion | Built against proposed, limitations including every open bug, future work | Tiến | — | W10-A2 |
| Ch.4 Skills gained | One paragraph each, in their own words | Each member | — | W10-A2 |
| Appendix B | Declaration of tools used | Tiến | — | W10-A2 |
| Appendix C | Contribution table from Git and GitHub (commits, PRs, reviews, closed issues, test runs); typed signatures of all three | Duy Anh | — | W10-B3 |
| Appendix D | Rubric self-check | Duy Anh | W07-B3 | W10 |
| Checklist 12.2 and 12.3 | Every item ticked; proposal feedback present | Minh | — | W10-C3 |
| Editing | Chapter order, contents, lists of figures and tables, cross-references, terms | Tiến | W09-A2 | W10-A1 |

## Rules for every writer

- Write about **what was built**; a part not built says so and why.
- Figures and tables are numbered, captioned and referred to in the text.
- Screenshots use the seeded data, cropped and readable.
- Code excerpts are 5–25 lines and explain a design decision.
- Every open bug at the `v1.0` tag appears under *Limitations* in Ch.4.

Sources for the evidence: [`../progress/`](../progress/) (weekly reports),
[`../../tests/manual/`](../../tests/manual/) (test runs),
[`../journal.md`](../journal.md) (meetings and decisions).
