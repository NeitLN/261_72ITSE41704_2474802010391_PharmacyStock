# Open-source integration

The dashboard reuses selected parts of four MIT-licensed repositories and one
library. Nothing was copied wholesale. Each repository solved a different part
of the problem, and each needed changes for a read-only dashboard that reads
real GitHub data. The licence texts and copyright lines are in
[`project-dashboard/THIRD_PARTY_NOTICES.md`](../../project-dashboard/THIRD_PARTY_NOTICES.md).

Reviewed on 28/10/2026. All four repositories and Chart.js are under the MIT
licence. No third-party fonts, icon sets or images are bundled.

## Summary

| Source | Licence | Used for | Form |
|---|---|---|---|
| [13wejay/seemple-tracker](https://github.com/13wejay/seemple-tracker) | MIT | Kanban board, task cards, timeline | Pattern, rewritten |
| [Hefrock/PM-charts](https://github.com/Hefrock/PM-charts) | MIT | Burndown configuration, health bands, theme-aware chart colours | Logic adapted |
| [vstorm-co/oss-dashboard](https://github.com/vstorm-co/oss-dashboard) | MIT | Actions collector, Pages deployment, freshness warning, CSV export | Logic adapted |
| [thehale/github-projects-burndown-chart](https://github.com/thehale/github-projects-burndown-chart) | MIT | Projects V2 query, burndown formula | Logic adapted |
| [Chart.js](https://www.chartjs.org) 4.4.1 | MIT | Drawing the charts | Bundled unchanged |

## 13wejay/seemple-tracker

**Taken:**
- The Kanban column and card layout (`renderKanban`, `createTaskCard`).
- The CSS timeline (`renderTimeline`): each bar is placed by the
  left and width percentages of its date range, with headers per day or week
  and a line for today.

**Changed:**
- **Read only.** The drag-and-drop handlers, column editing, the task modal and
  every create, update and delete path were dropped, so a viewer cannot move a
  card and believe it was saved.
- **No local storage.** The original keeps its state in `localStorage` and
  seeds demo tasks. Here the views are functions of the shared model and do
  not store anything.
- **Escaping.** The original puts titles into `innerHTML` unescaped. Issue
  titles are untrusted input, so every value now goes through
  `escapeHtml`.
- **Filters and grouping.** Filters by member, week, status, severity and
  label were added. The timeline is grouped by week, and milestones, close
  dates and overdue tasks are marked.

**Not used:** the calendar view (it adds nothing that the weekly view does not
already show), the sample data and the project switcher.

Files: `js/views/kanban.js`, `js/views/roadmap.js`, the Kanban and Gantt
parts of `css/dashboard.css`.

## Hefrock/PM-charts

**Taken:**
- From `charts/07-burn-down.html`: the ideal, actual and forecast line setup
  and the status bands (on track when the gap from the ideal line is at most
  5 %, at risk up to 20 %, delayed beyond that).
- From `charts/13-cumulative-flow.html`: the cumulative flow idea.
- The `readColors()` pattern, which reads CSS custom properties when a chart
  is drawn and redraws on a theme change.

**Changed:**
- **Real data.** The charts were hard-wired to demo constants (50 points, a
  10-day sprint). They now take series built from GitHub data.
- **Bands are configurable.** They live in `health` in `project.json`.
- **No forecast line.** The burndown has none, because a projection from a few
  days of task closures would look more certain than it is.
- **Two bands in the flow chart.** It shows only Done and Open, the only two
  states GitHub history records. The board columns have no history.

**Not used:** the other twelve charts (RACI, earned value and others), the
scenario sliders, the navigation, the Tabler icon font and the hand-off notes.

Files: `js/core/burndown.js` (`health`), `js/ui/charts.js`.

## vstorm-co/oss-dashboard

**Taken:**
- The pipeline shape: a scheduled GitHub Actions job collects data with the
  REST API, writes static JSON and deploys with
  `upload-pages-artifact` / `deploy-pages`.
- From `scripts/collect.py`:
  - retry on 429 and 5xx with `Retry-After`;
  - pagination that fails instead of returning a partial list;
  - the atomic JSON write;
  - keeping the last good data when a source fails.
- The freshness warning when the data is old or a source failed.
- CSV export that neutralises formulas and adds a UTF-8 BOM.

**Changed:**
- **Different data.** The collector reads issues, pull requests, milestones,
  issue events, releases, CI runs and the Projects V2 board of *this*
  repository, instead of stars, forks and package downloads.
- **History stays off `main`.** The original commits its history back to
  `main`. Here `main` is protected, so history goes to a separate data-only
  branch, `dashboard-data`, with one immutable file per day.
- **Node, not Python.** The collector was ported from Python to Node with no
  dependencies, so the browser and the collector share the same calculation
  modules.

**Not used:** the PyPI and stars logic, the hand-drawn SVG chart, the Google
Fonts stylesheet and the branding.

Files: `scripts/lib/github.mjs`, `scripts/collect.mjs`, `scripts/snapshot.mjs`,
`scripts/build-site.mjs`, `js/core/escape.js`, `js/app.js` (freshness banner),
`.github/workflows/project-dashboard.yml`.

## thehale/github-projects-burndown-chart

**Taken:**
- The Projects V2 GraphQL query shape: `projectV2(number)` items with
  paginated `fieldValues`, read by field name.
- The burndown arithmetic: remaining work on a day = total − work closed by
  the end of that day; the ideal line is a straight line from the total to 0.

**Changed:**
- **Scope per day.** The original takes the total at query time, so moving an
  issue between sprints changes the whole history. Here each day's scope is
  rebuilt from `milestoned`, `demilestoned`, `closed` and `reopened` events.
  Scope changes and finished work are therefore kept apart, and issues closed
  as "not planned" leave the scope instead of counting as done.
- **Projects V2 only.** Classic projects were retired by GitHub, so only V2 is
  read. The board is optional; without it the dashboard falls back to issues
  and milestones.
- **Story points.** These came from labels in the original. This project has
  no story points, so progress is counted in tasks. Planned hours (the board's
  `Hours` field) can be chosen in the config and are labelled as planned, not
  spent.

**Not used:** the matplotlib chart, the Discord upload, the configuration
system and the Classic queries.

Files: `scripts/collect.mjs` (`readBoard`), `js/core/burndown.js`
(`reconstruct`, `idealLine`).

## Written for this dashboard

- **The normalised model** (`js/core/model.js`, `tasks.js`, `progress.js`).
  It holds the task status rules, week mapping, provenance labels and stale
  data handling.
- **The pages.** Overview, Weekly Progress, Team, Evidence Center and Weekly
  Reports, with Markdown and print export.
- **Snapshot storage.** The daily snapshot rules and the `dashboard-data`
  branch handling.
- **The tests** in `project-dashboard/tests/`.
