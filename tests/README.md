# Testing

Two kinds of tests are kept for this project.

## Automated tests

Unit and end-to-end tests live beside the backend code and run with Vitest:

```bash
cd src/backend
npm test         # unit tests
npm run test:e2e # end-to-end tests
```

Business rules BR01–BR05 are to be covered by automated unit tests, because
they are the part of the system where a regression is both most likely and
hardest to notice by hand.

## Manual test cases

`manual/test-cases.md` holds the manual test case table, with expected result,
actual result and a pass/fail outcome for each case. Screenshots and other
evidence go in `manual/evidence/`, named after the test case ID.

## Rules for recording results

- Fill in the actual result only after running the case. An empty actual result
  means the case has not been run.
- A case whose expected result depends on an open business decision cannot be
  marked pass or fail until that decision is settled. Leave it as *not run* and
  note which decision blocks it.
- Record real defects found, with the fix and the retest. Do not invent defects
  to show that testing happened.
