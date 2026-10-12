# Test runs

Append one line per run of a manual test case; never edit an earlier line. A
re-run after a fix is a new line that links the bug. The latest verdict per
case is copied to [`test-cases.md`](test-cases.md).

Before a run: `docker compose down -v`, `npm run seed` in `src/backend`, then
start the API and the web client (README). Record the commit you ran.

| Run | Date | TC | Runner | Commit | Actual result | Verdict | Bug / evidence |
|---|---|---|---|---|---|---|---|
