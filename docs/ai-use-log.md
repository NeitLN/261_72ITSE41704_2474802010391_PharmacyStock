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
| 5 | Tiến | Claude Code (Anthropic) | Help creating and updating code, tests and documents for the assigned tasks | #93, #94, #95, #96, #97, #99, #100, #101, #102 | Automated: 31 unit and 61 e2e tests, browser checks with Playwright. By Tiến: _(fill in — what you read, ran and can explain)_ | — |
| 5 | Tiến | Codex (OpenAI) | Help reviewing the code: finding issues to check and suggesting how to handle them | #94–#97, #99, #100 | Each finding reproduced or reasoned through before fixing | 18 defects fixed with regression tests (e.g. concurrent ledger writes, a reversal bypassing checks, stale supplier updates) |
| 5 | Tiến | Codex (OpenAI) | Feedback on how the team organises its progress documents and review process | `docs/progress/`, CONTRIBUTING, plan §13 | Recommendations weighed by Tiến | Several suggestions modified or skipped (e.g. no burndown) |
| 5 | Duy Anh | Claude Code (Anthropic) | Work plan for member B; API contract; FEFO allocator and expiry policy; prescription service (UC05); dispensing through the stock ledger (UC06); unit and e2e tests; UC07/UC08 specifications and sequence diagrams; review and integration of opencode's work; drafts of PR descriptions and of the #98 review | #107, #108, #109, #110, #111 | Automated: 74 unit and 97 e2e tests at the tip of #109 (UC05-01…13, UC06-01…14, BR01-*, BR02-*); diagrams rendered with mermaid-cli. By Duy Anh: ran the app and walked UC05 → UC06 in the browser (verify, preview, partial hand-over of ORS by FEFO) | The Verify button spun for ever (one state used for two things): found by Duy Anh in the browser, fixed in #108 |
| 5 | Duy Anh | opencode | Smaller tasks from written task cards: customers and prescribers API and web client, UC05/UC06 specifications, prescription and dispense screens, documentation status, use-case diagram | #107, #108, #109, #111 | Each change reviewed against its card and merged by Claude Code after lint, build and tests; screens used by Duy Anh in the browser | UC05 spec: failure postcondition and four missing flows added at review; e2e moved to the shared helper; README rule count and spec status corrected |
| 5 | Duy Anh | Claude Code (Anthropic) | Draft of the review comment on #98 | #98 | Duy Anh read the three files on GitHub before submitting the review | — |
