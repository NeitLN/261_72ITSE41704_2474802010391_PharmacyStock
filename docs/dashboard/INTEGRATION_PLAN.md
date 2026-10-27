# Project Progress Dashboard — integration plan

A static, read-only website that shows this repository's progress: the weekly
plan, tasks, burndown, roadmap, team and evidence. GitHub Actions collects the
data and GitHub Pages serves it at
`https://neitln.github.io/261_72ITSE41704_2474802010391_PharmacyStock/project-dashboard/`.
Nothing in `src/` changes, and the dashboard works whether or not the
application is running.

Status of each phase: [`PROGRESS.md`](PROGRESS.md). Reused open-source code:
[`OPEN_SOURCE_INTEGRATION.md`](OPEN_SOURCE_INTEGRATION.md).

## 1. Audit (28/10/2026)

| Item | Finding | Kind |
|---|---|---|
| Repository | `NeitLN/261_72ITSE41704_2474802010391_PharmacyStock`, public, default branch `main` | Verified |
| `main` | Ruleset `protect-main`: no deletion, no force push, pull request and status checks required | Verified |
| Workflow token | Read-only by default | Verified |
| Workflows | `ci.yml` (backend, frontend), `assign-reviewer.yml` | Verified |
| GitHub Pages | Not enabled, no existing site | Verified |
| Milestones | `Week 01` … `Week 10`, one per week, each with a due date and a description of the form `Deliverable: … Done when: …` | Verified |
| Issues / PRs | About 115 issues and 107 PRs. PRs reference issues with `Refs #n`, not closing keywords | Verified |
| Project board | `users/NeitLN/projects/1` (Projects V2, public, 102 items). Fields: Status (Todo, In Progress, In review, Done), Start, Due, Week, Hours | Verified |
| Board vs issues | 20 closed issues still show Todo, In Progress or In review on the board; 13 issues are not on the board | Verified |
| Labels | `S1`–`S4` are bug severities, plus `testing`, `docs`, `release`, `business-rule`, `stock-integrity` and others | Verified |
| Releases | `v0.1` on 20/10/2026 | Verified |
| Team, dates, weekly plan | README, `docs/plan/`, `docs/progress/week-NN.md` | Configured (team-reported) |
| Earlier history of task status | Not recorded anywhere | Missing |

The board is owned by a user, so the workflow's `GITHUB_TOKEN` cannot read it.
The board is read with a classic personal access token that has only the
`read:project` scope, stored as the secret `PROJECT_READ_TOKEN`. Without that
secret the dashboard falls back to issues, labels and milestones.

## 2. Architecture

```
Issues, PRs, milestones, releases, issue events   (GITHUB_TOKEN)
Projects V2 board                                  (PROJECT_READ_TOKEN, optional)
        │
        ▼
project-dashboard/scripts/collect.mjs   Node 20, no dependencies
        │  normalised data: tasks, weeks, members, evidence, meta
        ▼
branch dashboard-data (orphan)          snapshots/YYYY-MM-DD.json, append only
        │
        ▼
Pages artifact  ─ index.html → ./project-dashboard/
                └ project-dashboard/ (site + data/*.json)
```

- **Front end:** plain HTML, CSS and ES modules, with no build step. Chart.js
  4.4.1 (MIT) is vendored, so nothing loads from a CDN. A hash router switches
  between the eight views.
- **Core logic:** `project-dashboard/js/core/*.mjs` holds normalisation,
  progress and burndown as pure functions. The browser and `node --test` run
  the same files.
- **Configuration:** `project-dashboard/config/project.json`. Nothing about
  this project is written into the HTML or JavaScript. To reuse the dashboard
  in another repository, change this file and the workflow.

### Workflow `.github/workflows/project-dashboard.yml`

| Trigger | What runs |
|---|---|
| `schedule` every 6 hours (`17 */6 * * *`) | Collect, snapshot, deploy |
| `workflow_dispatch` | Collect, snapshot, deploy |
| push to `main` touching `project-dashboard/**` or the workflow | Collect, snapshot, deploy |
| `pull_request` touching the same paths | Tests only: no secrets, no write permission |

- Board changes do not fire repository events, so the schedule picks them up.
  The dashboard shows the time of the last collection, not a promise of real
  time.
- One concurrency group (`project-dashboard`) with `cancel-in-progress: false`,
  so a snapshot push or a deploy is never cut off halfway.
- Permissions are set per job: collecting is read only, the snapshot job has
  `contents: write`, and the deploy job has `pages: write` and `id-token: write`.
- The workflow is separate from `ci.yml` and is not a required check.

## 3. Data rules

### Tasks

A task is an issue in this repository. Pull requests are evidence, not tasks.

| GitHub state | Dashboard status |
|---|---|
| Closed as completed | **Done** |
| Closed as not planned | Removed from scope (shown as *Dropped*) |
| Open, board Status *In review* | **Review** |
| Open, board Status *In Progress* | **In Progress** |
| Open, board Status *Todo* | **Todo** |
| Open, not on the board or with no Status | **Backlog** |

A closed issue whose board Status is not *Done* is flagged *board status
stale*, so the team can tidy the board. The issue state wins.

- **Week:** from the milestone, matched against `weeks[].milestone` in the
  config. If the issue has no milestone, the board's `Week` field is used.
- **Planned dates:** the board's `Start` and `Due`. If they are empty, the
  week's dates are used and marked as such.
- **Overdue:** open, and the due date (board `Due`, else the milestone due
  date) is before today in the project's time zone.
- **Severity:** labels mapped in the config (`S1` … `S4`). Issues without a
  mapped label show "—". The board has no priority field.
- **Blocked:** a configured label, or a configured blocker entry in the week.
  No such label exists today, so the count shows as missing until the team
  adds one.

### Progress

- **Task completion** = Done ÷ (all tasks − Dropped). This is the default
  measure of overall progress, and the page says so.
- **Planned-hours completion** (optional, `progress.method = "hours"`) = board
  `Hours` of Done tasks ÷ board `Hours` of tasks in scope. The page labels it
  "planned hours", not time actually spent.
- **Weekly completion** = Done ÷ in scope, among the tasks of that week.
- When the denominator is 0 or unknown, the page shows "—" with the reason,
  never 0 %.
- Every figure carries its source: **verified** (read from GitHub),
  **configured** (from `project.json`) or **missing**.
- Commit counts and lines of code are never used for progress or for judging
  a member.

### Burndown

Two series, each labelled where it is shown:

1. **Reconstructed from GitHub events.** Replays each issue's `closed`,
   `reopened`, `milestoned` and `demilestoned` events. For each day:
   scope = issues in the chosen milestone(s) at the end of that day, minus those
   closed as not planned; remaining = scope − issues closed as completed. A
   change in scope is plotted on its own line, so moving an issue between
   weeks is not read as finished work. These are GitHub records, so the series
   can start at week 1. The limit is stated on the page: it follows the issue's
   open or closed state, not the board's columns.
2. **Observed snapshots.** One snapshot per UTC day (the first successful
   collection of that day, never overwritten), starting on the day the
   dashboard goes live. A day with no snapshot is a gap, never 0.

The ideal line runs from the scope at the start of the period to 0 at its end
date. The end date comes from the config (week dates) or the milestone due
date.

**Project health** is computed from the reconstructed series at today's date:
- Gap from the ideal line ≤ `health.onTrackGap` (default 5 % of scope): **On Track**.
- Gap ≤ `health.atRiskGap` (default 20 %): **At Risk**.
- Otherwise: **Delayed**.
- All tasks Done after the final deadline: **Completed**.
- No scope, or fewer than `health.minDataPoints` days of data: **Insufficient
  Data**.

### Snapshots

Each `dashboard-data/snapshots/YYYY-MM-DD.json` holds:

- `schemaVersion`, `observedAt` (UTC), `source` (`projects-v2` or `issues`),
  `collectionStatus` and any errors
- the totals (scope, done, dropped, remaining)
- one row per task: number, milestone, state, state reason, status, assignees

The job fetches the branch, adds today's file only if it does not exist,
commits as `github-actions[bot]`, pulls with rebase and retries if the push is
rejected, and never force-pushes. The branch is never merged into `main`. If
the collection fails, the last good data is kept with its original timestamp
and the error is shown on the page.

## 4. Views

| View | Content |
|---|---|
| Overview | Name, description, repository, leader, members, dates, current week, days left, KPI cards (completion, total, done, in progress, pending, overdue), health with its rule, next milestone, last collected |
| Weekly Progress | A week selector. For each week: dates, goal (milestone description, overridable in config), planned, done and open tasks, members, deliverables, completion, blockers, notes, next week, evidence links (`docs/progress/week-NN.md`, `docs/plan/tuan-NN.md`, PRs) |
| Burndown & Analytics | Burndown for the project or one week (ideal, reconstructed, observed, scope), cumulative flow, and done tasks per week |
| Kanban | Backlog → Todo → In Progress → Review → Done, read only. Card: title, summary, assignees, severity, week, labels, due date, issue link, linked PRs, stale flag. Filters: member, status, week, severity, label |
| Roadmap | A CSS timeline by week or day: weeks, milestones, tasks with Start–Due bars, close date, overdue tasks, a today line. Dependencies show as "not tracked" |
| Team | One card per configured member: role, assigned, done, open, overdue, authored PRs merged, tasks per week. A note says these are not contribution scores |
| Evidence | Per week and per milestone: closed tasks, the PRs that reference them, releases, workflow runs on `main`, documents and screenshots in `docs/` |
| Reports | A weekly report: project, period, goal, planned, done, not done, burndown summary, milestone status, members, blockers, evidence, next week. It can be printed or saved as PDF, and exported as Markdown and CSV. Each export shows when the data was collected |

Every view has loading, empty and error states and a warning when the data is
older than `staleAfterHours`. The site has light and dark themes and is read on
desktop, tablet and phone.

## 5. Security

- The collector refuses to publish when the repository is private, unless the
  config says `allowPrivate: true`.
- Only fields on an allow list are written to JSON: number, title, a summary
  cut from the issue body, labels, assignees, dates, URLs, state and board
  fields.
- No token appears in the site, the JSON or the logs.
- All external text is escaped before it goes into the page.
- CSV cells that start with `=`, `+`, `-` or `@` are neutralised.
- The page has no control that looks as if it edits a task.

## 6. Tests

- `node --test` on the core modules with fixtures covering:
  - completed, not-planned and reopened issues
  - a milestone change mid-week
  - a closed issue still on a non-Done board column
  - missing board fields
  - pagination
  - an empty denominator
  - a missing snapshot day
- A dry run of the collector against the live repository, writing to a temp
  folder.
- A browser check at desktop and phone widths, light and dark: no console
  errors, every view renders, the links resolve.

## 7. Delivery

1. Branch `feature/project-dashboard`, then a PR reviewed by Minh under the
   review rotation.
2. After the merge, enable Pages with GitHub Actions as the source, then run
   the workflow once by hand.
3. Add the README link only after the URL has been opened and works.

Not in scope: a calendar view, earned value, notifications, writing back to
GitHub.
