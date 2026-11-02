import { burndownChart, flowChart, stackedBars } from '../ui/charts.js';
import { day, esc, healthBadge, info } from '../ui/dom.js';
import { formatDay, formatInstant } from '../core/dates.js';

export const title = 'Burndown & analytics';

/**
 * Aligns the series of one burndown on the dates of its ideal line. Days on
 * which no task existed yet on GitHub are left empty rather than drawn as 0.
 */
export function burndownData(b) {
  const byDate = (list) => new Map(list.map((p) => [p.date, p]));
  const actual = byDate(b.series);
  const observed = byDate(b.observed.filter((p) => p.date >= b.from && p.date <= b.to));
  const dates = b.ideal.map((p) => p.date);
  return {
    labels: dates.map((d) => formatDay(d, false)),
    dates,
    remaining: dates.map((d) => (actual.get(d)?.scope ? actual.get(d).remaining : null)),
    scope: dates.map((d) => (actual.get(d)?.scope ? actual.get(d).scope : null)),
    done: dates.map((d) => (actual.get(d)?.scope ? actual.get(d).done : null)),
    ideal: b.ideal.map((p) => Math.round(p.value * 10) / 10),
    observed: dates.map((d) => observed.get(d)?.remaining ?? null),
    fromEvents: b.fromEvents !== false,
  };
}

export function burndownTable(d, caption) {
  const rows = d.dates
    .map((date, i) => ({ date, i }))
    .filter(({ i }) => d.remaining[i] !== null || d.observed[i] !== null)
    .map(({ date, i }) => `<tr><td>${day(date)}</td><td class="num">${d.scope[i] ?? '—'}</td><td class="num">${d.done[i] ?? '—'}</td><td class="num">${d.remaining[i] ?? '—'}</td><td class="num">${d.ideal[i]}</td><td class="num">${d.observed[i] ?? '—'}</td></tr>`)
    .join('');
  return `<details><summary>Show the numbers as a table</summary><div class="table-wrap"><table>
    <caption>${esc(caption)}</caption>
    <thead><tr><th>Date</th><th class="num">Scope</th><th class="num">Done</th><th class="num">Remaining</th><th class="num">Ideal</th><th class="num">Snapshot</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6">No data yet.</td></tr>'}</tbody></table></div></details>`;
}

export function render(model, params) {
  const scopeParam = params[0] ?? 'project';
  const week = scopeParam === 'project' ? null : model.weeks.find((w) => String(w.number) === scopeParam);
  const b = week ? week.burndown : model.burndown.project;
  const d = burndownData(b);
  const label = week ? `Week ${week.number} (${formatDay(week.start, false)} – ${formatDay(week.end, false)})` : 'Whole project';
  const snapshots = model.burndown.project.observed;
  const firstSnapshot = snapshots[0];

  const options = [`<option value="project"${week ? '' : ' selected'}>Whole project</option>`,
    ...model.weeks.map((w) => `<option value="${w.number}"${week?.number === w.number ? ' selected' : ''}>Week ${w.number}</option>`)].join('');

  const weeks = model.weeks;
  const html = `
  <div class="stack-lg">
    <div class="section-head">
      <h2>Burndown &amp; analytics</h2>
      <div class="filters no-print"><label>Period<select id="bd-scope">${options}</select></label></div>
    </div>

    <section class="card stack" aria-labelledby="bd-title">
      <div class="section-head">
        <h3 id="bd-title">Burndown — ${esc(label)}</h3>
        <span>${healthBadge(b.health)}</span>
      </div>
      <p class="small">${esc(b.health.reason ?? '')}</p>
      ${b.fromEvents === false ? '<div class="banner warning"><span aria-hidden="true">!</span><div>Issue events could not be read in the last collection. This line is an estimate from each issue’s current milestone and close date: it cannot show reopened issues or tasks moved between weeks.</div></div>' : ''}
      ${b.series.length ? `<div class="chart-box"><canvas id="bd-chart" role="img" aria-label="Burndown chart for ${esc(label)}: remaining tasks against the ideal line"></canvas></div>` : `<p class="muted">This period has not started yet.</p>`}
      ${burndownTable(d, `Burndown, ${label}`)}
      <div class="small muted stack">
        <p><strong>Remaining (from GitHub events)</strong> replays every issue's closed, reopened, milestoned and demilestoned events, so each day shows what GitHub recorded by the end of that day in ${esc(model.config.project.timezone)}. It follows the issue's open or closed state, not the board's columns. ${week ? 'Scope is the issues in this week\'s milestone on that day.' : 'Scope is every issue created by that day.'}</p>
        <p><strong>Scope</strong> changes when issues are added, moved between weeks or closed as not planned, so a falling remaining line is never confused with a smaller plan. Days before the first task was created on GitHub are left empty.</p>
        <p><strong>Ideal</strong> is a straight line from the latest scope on the first day to zero on the last day (${day(b.from)} – ${day(b.to)}).</p>
        <p><strong>Daily snapshot</strong> points are the dashboard's own records, one per day ${firstSnapshot ? `since ${day(firstSnapshot.date)}` : '— none yet; they start with the first scheduled collection'}. Days without a collection are left empty, never drawn as zero.</p>
      </div>
    </section>

    <div class="grid two">
      <section class="card stack" aria-labelledby="cfd-title">
        <div class="section-head"><h3 id="cfd-title">Cumulative flow — ${esc(label)}</h3>${info('Done and open tasks stacked per day. GitHub history records only open and closed, so the board columns (In Progress, Review) cannot be shown back in time.')}</div>
        ${b.series.length ? '<div class="chart-box short"><canvas id="cfd-chart" role="img" aria-label="Cumulative flow: done and open tasks per day"></canvas></div>' : '<p class="muted">No data yet.</p>'}
      </section>
      <section class="card stack" aria-labelledby="wk-title">
        <div class="section-head"><h3 id="wk-title">Tasks per week</h3>${info('Tasks of each week (by milestone) as they stand now: done, and still open.')}</div>
        <div class="chart-box short"><canvas id="wk-chart" role="img" aria-label="Done and open tasks for each week"></canvas></div>
        <details><summary>Show the numbers as a table</summary><div class="table-wrap"><table>
          <thead><tr><th>Week</th><th class="num">Planned</th><th class="num">Done</th><th class="num">Open</th><th class="num">Completion</th></tr></thead>
          <tbody>${weeks.map((w) => `<tr><td>Week ${w.number}</td><td class="num">${w.stats.planned.length}</td><td class="num">${w.stats.done.length}</td><td class="num">${w.stats.open.length}</td><td class="num">${w.stats.completion.value === null ? '—' : `${Math.round(w.stats.completion.value * 100)} %`}</td></tr>`).join('')}</tbody>
        </table></div></details>
      </section>
    </div>

    <section class="card stack" aria-labelledby="snap-title">
      <h3 id="snap-title">Daily snapshots</h3>
      ${snapshots.length ? `<div class="table-wrap"><table>
        <caption>One record per day, written by the scheduled collection and never changed afterwards.</caption>
        <thead><tr><th>Day (UTC)</th><th>Observed at</th><th class="num">Scope</th><th class="num">Done</th><th class="num">Remaining</th></tr></thead>
        <tbody>${[...snapshots].reverse().slice(0, 30).map((s) => `<tr><td>${day(s.date)}</td><td>${esc(formatInstant(s.observedAt, model.config.project.timezone))}</td><td class="num">${s.scope}</td><td class="num">${s.done}</td><td class="num">${s.remaining}</td></tr>`).join('')}</tbody>
      </table></div>` : '<p class="muted">Historical snapshots are not available yet. They start with the first scheduled collection after the dashboard goes live; earlier days are covered by the GitHub event history above.</p>'}
    </section>
  </div>`;

  return {
    html,
    mount(root) {
      root.querySelector('#bd-scope')?.addEventListener('change', (e) => {
        location.hash = `#burndown/${e.target.value}`;
      });
      if (b.series.length) {
        burndownChart(root.querySelector('#bd-chart'), d);
        const known = d.remaining.map((r, i) => (r === null ? null : i));
        flowChart(root.querySelector('#cfd-chart'), {
          labels: d.labels.filter((_, i) => known[i] !== null),
          done: d.done.filter((v) => v !== null),
          open: d.remaining.filter((v) => v !== null),
        });
      }
      stackedBars(root.querySelector('#wk-chart'), {
        labels: weeks.map((w) => `W${w.number}`),
        done: weeks.map((w) => w.stats.done.length),
        open: weeks.map((w) => w.stats.open.length),
      });
    },
  };
}
