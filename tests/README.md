# Testing

Two kinds of tests are kept for this project.

## Automated tests

Unit and end-to-end tests live beside the backend code and run with Vitest:

```bash
cd src/backend
npm test         # unit tests
npm run test:e2e # end-to-end tests
```

Every Must business rule (BR01–BR05, BR07, BR10, BR11) is covered by
automated tests named `BRxx-…`, and every use case by e2e tests named
`UCxx-…`, because these are where a regression is both most likely and
hardest to notice by hand. The e2e tests run on their own `_test` database.

### Known issue: "Worker exited unexpectedly" on Windows

**Symptom.** A local `npm run test:e2e` sometimes ends with
`Error: [vitest-pool]: Worker forks emitted error … Caused by: Error: Worker
exited unexpectedly`. No test is reported as failed, but the summary counts
fewer tests than exist (e.g. `273 passed` instead of `292`) and one or more
files show as not passed. It happens in roughly one long run in three.

**What it is not** (checked on 24/10/2026, Node 24.15.0 on Windows 11,
Vitest 4.1.11):

| Checked | Result |
|---|---|
| Our code | It happens on `main` too (`af2712f`): 1 of 3 long runs of six e2e files crashed. Longer runs make it more likely; no single file or endpoint does. |
| Running out of memory | Still happens with `--execArgv=--max-old-space-size=8192`. |
| A JavaScript error, `process.exit`, `abort` or a signal | Handlers for all of them, writing to a file, logged nothing when the worker died. |
| The forks pool | With `--pool=threads` the whole Vitest process died silently instead, right after `RUN`. |
| CI | The same suite passes on GitHub Actions (Linux, Node 24). |

So Node itself dies at the native level on this machine; nothing in the
tests or the application triggers it. The project was developed on Node
24.12.0; trying that version on Windows would tell whether 24.15.0 is the
cause.

**What to do.** If a local run ends with this error, rerun it, or run the
files that did not finish on their own
(`npx vitest run --config ./vitest.config.e2e.ts test/<file>.e2e-spec.ts`).
A run only counts when the summary shows every file passed. CI on the pull
request is the authority.

## Manual test cases

`manual/test-cases.md` holds the 63 test cases of Proposal v1.1 (Appendix C) and TC-64
with author, runner and expected result; `manual/runs.md` is the append-only
log of every run. Screenshots and other evidence go in `manual/evidence/`,
named after the test case ID.

## Rules for recording results

- Fill in the actual result only after running the case. An empty actual result
  means the case has not been run.
- The runner is never the author of the feature under test.
- Business decisions are settled (`docs/requirements/business-decisions.md`);
  if a run shows a decision is wrong, raise it in the journal rather than
  changing the expected result silently.
- Record real defects found, with the fix and the retest. Do not invent defects
  to show that testing happened.
