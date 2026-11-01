# Project Progress Dashboard — progress

Status of the dashboard work itself, phase by phase. Plan:
[`INTEGRATION_PLAN.md`](INTEGRATION_PLAN.md).

| Phase | Status | Evidence |
|---|---|---|
| 1. Repository audit | Done 28/10 | Audit table in INTEGRATION_PLAN §1; licences in OPEN_SOURCE_INTEGRATION |
| 2. Working MVP | Done 28/10 | `project-dashboard/` (overview, weekly progress, task views) |
| 3. Visualisations | Done 28/10 | Burndown, cumulative flow, tasks per week, Kanban, roadmap |
| 4. GitHub data pipeline | Done locally 28/10; first run in Actions after the merge | `scripts/`, `.github/workflows/project-dashboard.yml` |
| 5. Lecturer features | Done 28/10 | Team, Evidence Center, Weekly Reports with print, Markdown and CSV |
| 6. Deployment | Waiting for the merge, Pages and the token (below) | — |
| 7. Final verification | Local checks done; the public URL is not checked yet | Below |

## Checked so far (28/10/2026)

- `npm test` in `project-dashboard/`: 54 tests pass. They cover:
  - status rules, including closed, not planned, reopened and a stale board;
  - week mapping, planned dates and overdue;
  - completion with an empty denominator;
  - burndown replay across time zones and milestone moves;
  - health bands, snapshots, pagination and retries, CSV escaping;
  - every page rendered from a small model, with an HTML-injection title.
- The collector ran against this repository with the board token: 116 issues,
  108 pull requests, 181 issue events, 102 board items, status `ok`, in about
  30 s.
- The figures on the page match GitHub: 50 issues closed as completed, 7
  closed as not planned, 109 tasks in scope, and 18 tasks whose board column
  disagrees with the issue state.
- The built site was served under a sub-path, the way Pages serves it, and
  opened in Chromium. Every view was checked:
  - at 1366 px and 390 px, in light and dark themes;
  - no console errors, no failed requests, no horizontal page scroll.
- The snapshot steps were run against a local bare repository:
  - the first run creates the orphan branch;
  - a second run on the same day changes nothing;
  - a rejected push recovers and keeps the other writer's snapshot.

## Not checked yet

- The workflow itself on GitHub Actions. It runs on the pull request (tests
  only) and after the merge (collect, snapshot, deploy).
- The public URL
  `https://neitln.github.io/261_72ITSE41704_2474802010391_PharmacyStock/project-dashboard/`.
  The README link is added only after it has been opened and works.

## Needed from the repository owner

1. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. Create a classic personal access token with only `read:project`, then add
   it in Settings → Secrets and variables → Actions as `PROJECT_READ_TOKEN`.
   Without it the dashboard still works from issues and milestones.
3. After the merge: Actions → Project dashboard → Run workflow.
