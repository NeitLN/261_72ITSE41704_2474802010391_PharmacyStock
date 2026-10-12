# Contributing

Working agreement for the team. It exists so that the commit history is usable
as evidence of who built what.

## Task tracking

Every work package in the ten-week plan is a GitHub issue:

- The title starts with its task id, e.g. `[W05-B2]` — week 5, member B, slot 2.
- It is assigned to its owner, names a reviewer, and sits under the milestone
  for its week. The milestone due date is the Sunday that ends the week.
- The body states the definition of done.

Workflow:

1. Move the card to *In Progress* and branch from `main` for the issue.
2. Open a pull request whose description contains `Refs #<issue number>`, the
   use case / business rule / test case IDs, and how you tested it.
3. The reviewer runs it and approves; CI must be green; then merge.
4. The tester — **not the author** — runs the related test cases on `main` and
   records each run in `tests/manual/runs.md`. When they pass, the tester
   closes the issue and the card moves to *Done*.
5. A failed run becomes a `bug` issue with severity S1–S4. The fix PR uses
   `Refs #<bug>` and adds a test that reproduces it; the label `needs-retest`
   stays until the original tester reruns it and closes the bug.

`Refs` is used instead of `Closes` so that nothing is marked done before it has
been tested by someone other than its author. Full process:
[`docs/plan/00-tong-quan.md`](docs/plan/00-tong-quan.md) §6.

If a task turns out to be blocked, comment on the issue saying why. If the plan
changes, edit the issue rather than working around it silently.

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

- One reviewer, and it must not be the author. Rotation (from week 5):

  | Author | Reviewer | Stand-in when the reviewer is away |
  |---|---|---|
  | Tiến (A, `NeitLN`) | Minh (C, `Jayson135724`) | Duy Anh |
  | Duy Anh (B, `anh7032`) | Tiến (A, `NeitLN`) | Minh |
  | Minh (C, `Jayson135724`) | Duy Anh (B, `anh7032`) | Tiến |

  The workflow `.github/workflows/assign-reviewer.yml` requests the reviewer
  automatically when the pull request is opened. A PR labelled
  `stock-integrity` also needs Tiến as a second reviewer unless Tiến wrote it.
- Approve only from your own account, and only after running the branch.
- The reviewer checks out the branch and runs it, following the author's
  instructions — not just reading the diff.
- `main` is protected: a pull request and one approval are required, and a new
  commit dismisses an earlier approval. The repository admin can still merge
  without an approval; if that is ever done, the PR must say why and who was
  asked to review, and the journal records it.
- The PR description says what changed, how it was tested, and which use case
  or business rule it belongs to.

### What a review records

A review is evidence for the Collaborative Development criterion, so it says
what the reviewer actually did:

1. The head commit reviewed (short SHA).
2. The commands run and their result, e.g. `npm run test:e2e` → 61 passed.
3. The test cases or flows tried by hand (TC IDs), and the outcome.
4. Real observations: questions, defects, suggestions — or "checked X against
   Y, no change needed".
5. The verdict: *Approve* only after running the branch; *Request changes*
   names what must change.

A one-word "LGTM" is not a review. A new commit dismisses the approval, so
re-run before approving again.

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
| `v0.1` | 5 | One full flow works: sign in → receive → take in a prescription → dispense, with data persisting |
| `v0.2` | 7 | All 13 Must use cases run end to end (Must-core gate) |
| `v1.0` | 9 | Feature freeze; packaged and runnable from a fresh clone |

Do not move an existing tag. If a fix is needed after `v1.0`, tag the fix
separately and say in the report which build was submitted.

## Use of AI tools

The course allows AI assistance when it is declared and verified. Record in
Appendix B of the report which tool was used, for what, on which part of the
work, and how the team verified the output. Everyone must be able to explain
any code submitted under their name.
