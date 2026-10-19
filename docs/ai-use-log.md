# AI use log

Kept every week so that Appendix B of the Final Report is written from
records ([CONTRIBUTING](../CONTRIBUTING.md#use-of-ai-tools)). One row per
substantive use: the tool, the work it touched, what a person verified, and
what was corrected. Prompt transcripts are not kept.

| Week | Who | Tool | Used for | Work touched | Verified by a person | Corrected / rejected |
|---|---|---|---|---|---|---|
| 5 | Duy Anh | Claude Code (Anthropic) | Architecture planning, core business logic and tests for member B (API contracts, ExpiryPolicy, FefoAllocator, UC05 Prescription, UC06 Dispensing via StockLedger); UC07/UC08 specs and sequence diagrams; review/integration of opencode branches; draft review for #98 | #107, #108, #109, #110, #111, #98 | Ran app locally; verified 74 unit tests and 97 e2e tests passing at #109 tip; walked through UC05 verify and UC06 FEFO dispense in the browser; read files of PR #98 before submitting review | Found the Verify button spinning indefinitely during manual browser test (fixed in #108) |
| 5 | Duy Anh | opencode | Executing small tasks from written task cards: customers/prescribers API and frontend client, Ant Design screens for UC05/UC06, documentation updates, and system use case diagram with spec coverage table (#23) | #107, #108, #109, #111 | Checked task criteria (lint, build, tests); verified Mermaid diagram rendered valid SVG; exercised form inputs and table flows in browser | Added missing failure postconditions and flows to UC05 spec at review; corrected rule counts and doc status |
