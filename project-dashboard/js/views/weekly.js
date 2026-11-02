import { burndownChart } from '../ui/charts.js';
import { day, esc, healthBadge, link, meter, pct, people, prov, taskList } from '../ui/dom.js';
import { burndownData, burndownTable } from './burndown.js';

export const title = 'Weekly progress';

const STATE_LABEL = { past: 'Finished', current: 'This week', upcoming: 'Upcoming' };

export function weekPicker(model, selected, base) {
  return `<nav class="week-picker no-print" aria-label="Choose a week">${model.weeks.map((w) => `
    <a href="#${base}/${w.number}" aria-current="${w.number === selected ? 'true' : 'false'}" class="${w.state === 'current' ? 'current' : ''}">
      <span class="wk">Week ${w.number}</span>
      <span class="muted">${day(w.start, false)}</span>
      ${meter(w.stats.completion, `Week ${w.number}`)}
    </a>`).join('')}</nav>`;
}

export function selectedWeek(model, params) {
  const asked = Number(params[0]);
  return model.weeks.find((w) => w.number === asked)
    ?? model.weeks.find((w) => w.state === 'current')
    ?? model.weeks.filter((w) => w.state === 'past').at(-1)
    ?? model.weeks[0]
    ?? null;
}

function documentsList(docs) {
  if (!docs.length) return '';
  return docs.map((d) => `<li>${link(d.url, d.label)}${d.exists === false ? ' <span class="chip stale">not found on the default branch</span>' : ''}</li>`).join('');
}

export function render(model, params) {
  const week = selectedWeek(model, params);
  if (!week) return { html: '<div class="state"><p>No weeks are configured. Add them under <code>weeks</code> in config/project.json.</p></div>' };
  const s = week.stats;
  const d = burndownData(week.burndown);
  const blockers = [...(week.blockers ?? []).map((b) => `<li>${esc(b)} ${prov('configured')}</li>`), ...s.blocked.map((t) => `<li>${link(t.url, `#${t.number} ${t.title}`)} <span class="chip blocked">Blocked label</span></li>`)];
  const evidence = [
    documentsList(week.documents),
    ...week.releases.map((r) => `<li>Release ${link(r.url, r.tag)} — ${day(r.publishedAt.slice(0, 10))}</li>`),
  ].join('');

  const html = `
  <div class="stack-lg">
    <div class="section-head"><h2>Weekly progress</h2><p>Plan, delivery and evidence for each week.</p></div>
    ${weekPicker(model, week.number, 'weekly')}

    <section class="grid two" aria-labelledby="wk-head">
      <div class="card stack">
        <div class="section-head">
          <h3 id="wk-head">Week ${week.number} · ${day(week.start, false)} – ${day(week.end)}</h3>
          <span class="chip">${STATE_LABEL[week.state]}</span>
        </div>
        <div>
          <p class="small muted">Weekly goal ${prov(week.goalSource)}</p>
          <p>${week.goal ? esc(week.goal) : '<span class="muted">No goal set for this week.</span>'}</p>
        </div>
        ${week.doneWhen ? `<div><p class="small muted">Done when ${prov('verified')}</p><p>${esc(week.doneWhen)}</p></div>` : ''}
        ${week.milestoneData ? `<p class="small">Milestone: ${link(week.milestoneData.url, week.milestoneData.title)} (${esc(week.milestoneData.state)})</p>` : `<p class="small muted">No GitHub milestone linked ${prov('missing')}</p>`}
        <div>
          <p class="small muted">Next week</p>
          <p>${week.nextWeekPlan ? esc(week.nextWeekPlan) : '<span class="muted">Not set.</span>'}</p>
        </div>
      </div>
      <div class="card stack">
        <div class="section-head"><h3>Progress</h3>${healthBadge(week.burndown.health)}</div>
        <div class="grid kpis">
          <div><div class="kpi"><div class="label">Completion</div><div class="value">${pct(s.completion)}</div></div>${meter(s.completion, 'Week completion')}</div>
          <div class="kpi"><div class="label">Planned</div><div class="value">${s.planned.length}</div></div>
          <div class="kpi"><div class="label">Done</div><div class="value">${s.done.length}</div></div>
          <div class="kpi"><div class="label">Open</div><div class="value">${s.open.length}</div></div>
        </div>
        <p class="small">${esc(week.burndown.health.reason ?? '')}</p>
        <p class="small">Members with tasks this week: ${people(model, s.members)}</p>
        ${s.dropped.length ? `<p class="small muted">${s.dropped.length} task(s) closed as not planned are left out.</p>` : ''}
      </div>
    </section>

    <div class="grid two">
      <section class="card" aria-labelledby="wk-done"><h3 id="wk-done">Completed (${s.done.length})</h3>${taskList(model, s.done, { empty: 'Nothing completed yet.', status: false })}</section>
      <section class="card" aria-labelledby="wk-open"><h3 id="wk-open">Not completed (${s.open.length})</h3>${taskList(model, s.open, { empty: 'Nothing left open.' })}</section>
    </div>

    <div class="grid two">
      <section class="card stack" aria-labelledby="wk-block">
        <h3 id="wk-block">Blockers and notes</h3>
        ${blockers.length ? `<ul>${blockers.join('')}</ul>` : '<p class="muted small">No blockers recorded. Blockers come from the <code>blocked</code> label on issues or from this week\'s entry in config/project.json.</p>'}
        ${(week.notes ?? []).length ? `<ul>${week.notes.map((n) => `<li>${esc(n)} ${prov('configured')}</li>`).join('')}</ul>` : ''}
      </section>
      <section class="card stack" aria-labelledby="wk-ev">
        <h3 id="wk-ev">Evidence</h3>
        ${evidence ? `<ul>${evidence}</ul>` : '<p class="muted small">No documents or releases linked to this week.</p>'}
        <p class="small">${week.mergedPulls.length} pull request(s) merged during the week. <a href="#evidence/${week.number}">See them on the Evidence page</a>.</p>
      </section>
    </div>

    <section class="card stack" aria-labelledby="wk-bd">
      <h3 id="wk-bd">Burndown for week ${week.number}</h3>
      ${week.burndown.series.length ? `<div class="chart-box short"><canvas id="wk-bd-chart" role="img" aria-label="Burndown for week ${week.number}"></canvas></div>${burndownTable(d, `Burndown, week ${week.number}`)}` : '<p class="muted">This week has not started yet.</p>'}
    </section>
  </div>`;

  return {
    html,
    mount(root) {
      if (week.burndown.series.length) burndownChart(root.querySelector('#wk-bd-chart'), d);
    },
  };
}
