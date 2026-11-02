# Third-party notices

The project progress dashboard bundles one library and adapts code and ideas
from four MIT-licensed repositories. What was taken from each is described in
[`docs/dashboard/OPEN_SOURCE_INTEGRATION.md`](https://github.com/NeitLN/261_72ITSE41704_2474802010391_PharmacyStock/blob/main/docs/dashboard/OPEN_SOURCE_INTEGRATION.md).

| Component | Used in | Copyright | License |
|---|---|---|---|
| [Chart.js](https://www.chartjs.org) v4.4.1, bundled unchanged as `vendor/chart.umd.js` | All charts | © 2014-2022 Chart.js Contributors | MIT |
| [13wejay/seemple-tracker](https://github.com/13wejay/seemple-tracker) | Kanban columns and cards, timeline layout (`js/views/kanban.js`, `js/views/roadmap.js`, `css/dashboard.css`) | © 2025 Muhammad Ramadhani Wijayanto | MIT |
| [Hefrock/PM-charts](https://github.com/Hefrock/PM-charts) | Burndown status bands, theme-aware chart colours (`js/core/burndown.mjs`, `js/ui/charts.js`) | © 2024 PM Chart Library | MIT |
| [vstorm-co/oss-dashboard](https://github.com/vstorm-co/oss-dashboard) | Collector retry and pagination, Pages workflow, freshness warning, CSV escaping (`scripts/`, `.github/workflows/project-dashboard.yml`, `js/core/escape.mjs`) | © 2026 Vstorm | MIT |
| [thehale/github-projects-burndown-chart](https://github.com/thehale/github-projects-burndown-chart) | Projects V2 query shape, remaining-work and ideal-line formula (`scripts/collect.mjs`, `js/core/burndown.mjs`) | © 2021 Joseph Hale | MIT |

## MIT License

The same terms apply to each component above, under its own copyright line:

> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.
