# Project progress dashboard

A static, read-only website that shows this repository's progress: weekly
plan, tasks, burndown, roadmap, team and evidence. A GitHub Actions workflow
collects the data from GitHub every 6 hours and publishes the site on GitHub
Pages. Viewers need no account, no token and no install.

Design and data rules: [`docs/dashboard/INTEGRATION_PLAN.md`](../docs/dashboard/INTEGRATION_PLAN.md).
Reused open-source code: [`docs/dashboard/OPEN_SOURCE_INTEGRATION.md`](../docs/dashboard/OPEN_SOURCE_INTEGRATION.md).

## Layout

| Path | What it is |
|---|---|
| `index.html`, `css/`, `js/app.js`, `js/views/`, `js/ui/` | The site |
| `js/core/` | Status rules, progress, burndown and report logic. Shared by the site, the scripts and the tests |
| `config/project.json` | Everything specific to this project |
| `scripts/collect.mjs` | Reads GitHub and writes `data/dashboard.json` |
| `scripts/snapshot.mjs` | Adds today's snapshot to the history branch and rebuilds `history.json` |
| `scripts/build-site.mjs` | Assembles the Pages artifact in `_site/` |
| `tests/` | `node --test` suites |
| `vendor/chart.umd.js` | Chart.js 4.4.1, unchanged |
| `data/` | Generated; not committed |

The workflow is `.github/workflows/project-dashboard.yml`. History lives on the
data-only branch `dashboard-data`, which is never merged.

## Weekly routine for the team leader

1. Members keep their issues current: they assign themselves, set the
   milestone of the week, move the card on the project board, and close the
   issue when done ("not planned" if it was dropped).
2. Pull requests reference their issue with `Refs #n` or `Closes #n`; that is
   how the Evidence Center links them.
3. If something blocks a task, add the `blocked` label to the issue, or add a
   line under `weeks[n].blockers` in `config/project.json`. Notes and the
   plan for next week go in `weeks[n].notes` and `weeks[n].nextWeek`.
4. The workflow refreshes the data every 6 hours. To refresh now, open
   **Actions → Project dashboard → Run workflow**.
5. The lecturer reloads the same URL. The page shows when the data was
   collected.

## Common changes

- **A member:** edit `team.members` (`login`, `name`, `role`, `code`).
- **A week, sprint or break:** add or change an entry in `weeks`, with its
  `start`, `end` and the `milestone` number it maps to. Weeks do not have to
  be back to back. The weekly goal is read from the milestone description
  (`Deliverable: …` / `Done when: …`); set `goal` to override it.
- **A milestone:** create it on GitHub with a due date, then point a week at
  its number.
- **Health thresholds or progress method:** `health` and `progress.method`
  (`tasks` or `hours`).
- **Board columns:** `github.projectV2.statusMap` maps board Status values to
  `todo`, `in_progress`, `review` and `done`.

## Running it locally

```bash
cd project-dashboard
npm test
GITHUB_TOKEN=$(gh auth token) PROJECT_READ_TOKEN=$(gh auth token) node scripts/collect.mjs
npm run preview  # http://127.0.0.1:8765/project-dashboard/
# Or assemble the static deployment artifact:
node scripts/build-site.mjs --out ../_site
npx http-server ../_site   # or any static server, then open /project-dashboard/
```

`PROJECT_READ_TOKEN` is optional. Without it the board is skipped and open
issues are placed by milestone.

The preview also accepts the repository-prefixed URL used by GitHub Pages.
Set `PORT` to change the default local port (8765). It listens only on localhost.
The interface supports light and dark themes, keyboard navigation, compact
mobile layouts, and the original Markdown, CSV and print/PDF report exports.

## Checking the dashboard

- The **Actions** tab shows each run of *Project dashboard*. A failed run
  keeps the previous site online.
- The header shows when the data was collected. A yellow banner appears when
  the data is older than `publishing.staleAfterHours`, or when a source could
  not be read.
- Tasks marked **Board out of date** are open or closed on GitHub but sit in
  another column on the board. Move the card to fix it.

## Using it in another repository

1. Copy `project-dashboard/` and `.github/workflows/project-dashboard.yml`.
2. Rewrite `config/project.json`:
   - `project`, `team`, `weeks`, `labels`, `evidence`;
   - `github.projectV2`: set `enabled: false` if there is no board.
3. Delete `data/` if it was copied.
4. Under **Settings → Pages → Build and deployment**, choose the source
   **GitHub Actions**.
5. Optional: for a board owned by a user, create a classic personal access
   token with only the `read:project` scope, and add it as the repository
   secret `PROJECT_READ_TOKEN`. A board owned by an organisation can use a
   fine-grained token with read access to projects.
6. Run the workflow once from the Actions tab. The site appears at
   `https://<owner>.github.io/<repository>/project-dashboard/`.

The collector refuses to publish a private repository's data unless
`publishing.allowPrivate` is `true`, because the Pages site is public.
