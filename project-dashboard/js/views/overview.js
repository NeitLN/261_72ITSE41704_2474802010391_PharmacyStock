import { day, esc, healthBadge, info, link, memberName, meter, pct, prov } from '../ui/dom.js';
import { formatInstant } from '../core/dates.js';

export const title = 'Overview';

function kpi({ label, value, sub = '', href = null, tip = '' }) {
  const tag = href ? 'a' : 'div';
  return `<${tag} class="card kpi"${href ? ` href="${href}"` : ''}>
    <div class="label">${esc(label)}${tip ? info(tip) : ''}</div>
    <div class="value">${value}</div>
    ${sub ? `<div class="sub">${sub}</div>` : ''}
  </${tag}>`;
}

export function render(model) {
  const { config, overview: o, current, weeks, freshness, data } = model;
  const p = config.project;
  const method = o.completion.method === 'hours'
    ? `Planned hours (board field Hours) of done tasks ÷ planned hours in scope, over ${o.completion.coverage.withValue} of ${o.completion.coverage.total} tasks that have hours. Planned, not time actually spent.`
    : 'Done tasks ÷ tasks in scope. A task is a GitHub issue; issues closed as "not planned" are left out. Task count stands in for overall progress: it does not weigh tasks by size.';
  const week = current.week ? weeks.find((w) => w.number === current.week.number) : null;
  const weekLabel = week ? `Week ${week.number}` : { before: 'Not started', after: 'Finished', gap: 'Between weeks' }[current.state];
  const leader = config.team?.leader ? memberName(model, config.team.leader) : null;

  const html = `
  <div class="stack-lg">
    <section class="grid two" aria-labelledby="about">
      <div class="card stack">
        <h2 id="about">${esc(p.name)}</h2>
        <p class="muted">${esc(p.description ?? '')}</p>
        <dl class="facts">
          ${p.type ? `<dt>Type</dt><dd>${esc(p.type)}</dd>` : ''}
          <dt>Repository</dt><dd>${link(data.repository?.url ?? `https://github.com/${p.repository}`, p.repository)} ${prov('verified')}</dd>
          <dt>Leader</dt><dd>${leader ? esc(leader) : '—'} ${prov(leader ? 'configured' : 'missing')}</dd>
          <dt>Team</dt><dd>${(config.team?.members ?? []).map((m) => esc(m.name)).join(', ') || '—'} ${prov(config.team?.members?.length ? 'configured' : 'missing')}</dd>
          <dt>Start</dt><dd>${day(p.startDate)} ${prov(p.startDate ? 'configured' : 'missing')}</dd>
          <dt>Final deadline</dt><dd>${day(p.finalDeadline)} ${prov(p.finalDeadline ? 'configured' : 'missing')}</dd>
          <dt>Last updated</dt><dd>${esc(formatInstant(freshness.generatedAt, p.timezone))}</dd>
          ${(p.links ?? []).length ? `<dt>Links</dt><dd>${p.links.map((l) => link(l.url, l.label)).join(' · ')}</dd>` : ''}
        </dl>
      </div>
      <div class="card health-card">
        <div class="section-head"><h2>Project health</h2>${info('Open tasks today compared with an ideal straight line that starts at today\'s number of tasks in scope on the start date and reaches zero on the final deadline. The gap is measured as a share of the tasks in scope. Within 5 % of scope: On Track; within 20 %: At Risk; beyond: Delayed. Thresholds are set in config/project.json.')}</div>
        <div class="big">${healthBadge(o.health)}</div>
        <p>${esc(o.health.reason)}</p>
        <p class="small"><a href="#burndown">See the burndown and how this is worked out</a></p>
        <div class="grid kpis" style="margin-top:8px">
          ${kpi({ label: 'Current week', value: esc(weekLabel), sub: week ? `${day(week.start, false)} – ${day(week.end, false)}` : '', href: week ? `#weekly/${week.number}` : '#weekly' })}
          ${kpi({ label: 'Days to deadline', value: o.daysRemaining === null ? '—' : String(Math.max(0, o.daysRemaining)), sub: o.daysRemaining !== null && o.daysRemaining < 0 ? 'Deadline passed' : day(p.finalDeadline) })}
        </div>
      </div>
    </section>

    <section class="stack" aria-labelledby="kpis">
      <h2 id="kpis">Tasks</h2>
      <div class="grid kpis">
        ${kpi({ label: 'Overall completion', value: pct(o.completion), sub: `${meter(o.completion, 'Overall completion')}${o.completion.value === null ? esc(o.completion.reason) : `${o.completion.num} of ${o.completion.den}${o.completion.method === 'hours' ? ' planned hours' : ' tasks'}`}`, href: '#burndown', tip: method })}
        ${kpi({ label: 'Total tasks', value: String(o.total), sub: o.dropped ? `${o.dropped} closed as not planned, not counted` : 'Issues in scope', href: '#kanban', tip: 'Every issue in the repository except those closed as not planned. Pull requests are evidence, not tasks.' })}
        ${kpi({ label: 'Completed', value: String(o.done), sub: 'Issues closed as completed', href: '#kanban' })}
        ${kpi({ label: 'In progress', value: String(o.inProgress), sub: `${o.counts.in_progress} in progress, ${o.counts.review} in review`, href: '#kanban', tip: 'Open issues whose project-board column is In Progress or In review.' })}
        ${kpi({ label: 'Pending', value: String(o.pending), sub: `${o.counts.todo} todo, ${o.counts.backlog} backlog`, href: '#kanban' })}
        ${kpi({ label: 'Overdue', value: String(o.overdue), sub: 'Open past the planned due date', href: '#roadmap', tip: 'Open tasks whose due date (the board Due field, else the end of their week) is before today.' })}
      </div>
      ${o.staleBoard ? `<p class="small muted">${o.staleBoard} task(s) show a different column on the project board than their issue state; the issue state is used. They are marked “Board out of date”.</p>` : ''}
    </section>

    <section class="stack" aria-labelledby="weeks-head">
      <div class="section-head"><h2 id="weeks-head">Weeks</h2><p>Share of each week's tasks that are done. Select a week for its plan and evidence.</p></div>
      <div class="weeks-strip">
        ${weeks.map((w) => `<a href="#weekly/${w.number}" class="${w.state === 'current' ? 'current' : ''}" aria-label="Week ${w.number}, ${pct(w.stats.completion)} done">
          <div class="wk">Week ${w.number}</div>
          <div class="pct">${pct(w.stats.completion)} · ${w.stats.done.length}/${w.stats.planned.length}</div>
          ${meter(w.stats.completion, `Week ${w.number}`)}
        </a>`).join('')}
      </div>
    </section>

    ${o.nextMilestone ? `<section class="card" aria-labelledby="next-ms">
      <h3 id="next-ms">Upcoming milestone</h3>
      <p>${link(o.nextMilestone.url, o.nextMilestone.title)} — due ${day(o.nextMilestone.dueOn.slice(0, 10))}${Number.isInteger(o.nextMilestone.openIssues) ? `; ${o.nextMilestone.openIssues} open, ${o.nextMilestone.closedIssues} closed on GitHub (issues and pull requests)` : ''}.</p>
    </section>` : ''}
  </div>`;
  return { html };
}
