# Contributing

Working agreement for the team. It exists so that the commit history is usable
as evidence of who built what.

## Branches

- `main` must always build. Do not commit to it directly once feature work starts.
- Branch naming: `feature/uc06-dispensing`, `fix/batch-expiry-boundary`,
  `docs/week2-requirements`.
- Keep branches short-lived. Merge through a pull request.

## Commits

- Commit under your own GitHub account. Never commit another member's work
  under your name, and never push someone else's work on their behalf.
- Small, meaningful commits. Do not batch a week of work into one commit, and
  do not split work artificially to inflate the count.
- Write the subject in the imperative: `Add FEFO batch selection to dispensing
  service`, not `added stuff`.
- Never commit `.env`, credentials, or a database dump.

## Pull requests

- One reviewer, and it must not be the author. Default rotation: A reviewed by
  B, B reviewed by C, C reviewed by A.
- The reviewer checks out the branch and runs it, following the author's
  instructions — not just reading the diff.
- The PR description says what changed, how it was tested, and which use case
  or business rule it belongs to.

## Definition of done

A task is done when all of the following hold:

1. The feature works end to end: UI, business logic, data access.
2. Input is validated and errors are reported clearly.
3. Tests covering the change pass, and any related manual test cases in
   `tests/manual/test-cases.md` have been run and recorded.
4. A reviewer other than the author has approved it.
5. The relevant documentation in `docs/` is updated.

## Releases

| Tag | Week | Contents |
|---|---|---|
| `v0.1` | 5 | One full flow works: receive → dispense → sell, with data persisting |
| `v0.2` | 7 | All twelve use cases run end to end |
| `v1.0` | 9 | Feature freeze; packaged and runnable from a fresh clone |

Do not move an existing tag. If a fix is needed after `v1.0`, tag the fix
separately and say in the report which build was submitted.

## Use of AI tools

The course allows AI assistance when it is declared and verified. Record in
Appendix B of the report which tool was used, for what, on which part of the
work, and how the team verified the output. Everyone must be able to explain
any code submitted under their name.
