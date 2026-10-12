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

## Manual test cases

`manual/test-cases.md` holds the 63 test cases of Proposal v1.1 (Appendix C)
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
