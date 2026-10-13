# AI use log

Kept every week so that Appendix B of the Final Report is written from
records ([CONTRIBUTING](../CONTRIBUTING.md#use-of-ai-tools)). One row per
substantive use: the tool, the work it touched, what a person verified, and
what was corrected. Prompt transcripts are not kept.

| Week | Who | Tool | Used for | Work touched | Verified by a person | Corrected / rejected |
|---|---|---|---|---|---|---|
| 1–3 | Tiến | ChatGPT / Codex (OpenAI) | First draft of the ten-week plan | `docs/plan/` (week 2) | Checked against the Course Guidelines, revised by the team | — (from Proposal Appendix B) |
| 1–3 | Tiến | Claude Code (Anthropic) | Review of Proposal ideas, structure, weekly planning, language feedback | Project Proposal | The team compared it with its own ideas and the course requirements | — (from Proposal Appendix B) |
| 4 | Tiến | ChatGPT (OpenAI) | Transcribing and summarising the recorded pharmacist review | `docs/requirements/pharmacist-review-week4.md` | Tiến compared the summary with the recording | Summary corrected (Proposal Appendix B) |
| 5 | Tiến | Claude Code (Anthropic) | Writing the code, tests and documents of the leader's tasks of weeks 2–5 | #93, #94, #95, #96, #97, #99, #100, #101, #102 | Automated: 31 unit and 61 e2e tests, browser checks with Playwright. By Tiến: _(fill in — what you read, ran and can explain)_ | — |
| 5 | Tiến | Codex (OpenAI) | Read-only code review of the large pull requests, three rounds | #94–#97, #99, #100 | Each finding reproduced or reasoned through before fixing | 18 defects fixed with regression tests (e.g. concurrent ledger writes, a reversal bypassing checks, stale supplier updates) |
| 5 | Tiến | Codex (OpenAI) | Read-only review of the progress-tracking process, two rounds | `docs/progress/`, CONTRIBUTING, plan §13 | Recommendations weighed by Tiến | Several suggestions modified or skipped (e.g. no burndown) |
| 5 | Duy Anh | Claude Code (Anthropic) | Architecture planning, core business logic and tests for member B (API contracts, ExpiryPolicy, FefoAllocator, UC05 Prescription, UC06 Dispensing via StockLedger); UC07/UC08 specs and sequence diagrams; review/integration of opencode branches; draft review for #98 | #107, #108, #109, #110, #111, #98 | Ran app locally; verified 74 unit tests and 97 e2e tests passing at #109 tip; walked through UC05 verify and UC06 FEFO dispense in the browser; read files of PR #98 before submitting review | Found the Verify button spinning indefinitely during manual browser test (fixed in #108) |
| 5 | Duy Anh | opencode | Executing small tasks from written task cards: customers/prescribers API and frontend client, Ant Design screens for UC05/UC06, documentation updates, and system use case diagram with spec coverage table (#23) | #107, #108, #109, #111 | Checked task criteria (lint, build, tests); verified Mermaid diagram rendered valid SVG; exercised form inputs and table flows in browser | Added missing failure postconditions and flows to UC05 spec at review; corrected rule counts and doc status |
