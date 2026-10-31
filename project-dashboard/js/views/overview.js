import { day, esc, healthBadge, info, link, memberName, meter, pct, prov, taskList } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { formatInstant } from '../core/dates.js';

export const title = 'Overview';

function metric(label, value, sub, href, glyph, tone = '') {
  return `<a class="metric ${tone}" href="${href}"><div class="metric-top"><span>${label}</span>${icon(glyph)}</div><div class="metric-value">${value}</div><div class="metric-sub">${sub}</div></a>`;
}

export function render(model) {
  const { config, overview: o, current, weeks, freshness, data } = model;
  const p = config.project;
  const week = current.week ? weeks.find((w) => w.number === current.week.number) : null;
  const weekLabel = week ? `Week ${week.number}` : { before: 'Not started', after: 'Schedule ended', gap: 'Between weeks' }[current.state];
  const weekHref = week ? `#weekly/${week.number}` : '#weekly';
  const leader = config.team?.leader ? memberName(model, config.team.leader) : null;
  const attention = model.tasks.filter((t) => t.status !== 'done' && t.status !== 'dropped' && (t.overdue || t.blocked))
    .sort((a, b) => Number(b.blocked) - Number(a.blocked) || (a.plannedDue ?? '9999').localeCompare(b.plannedDue ?? '9999'));
  const method = o.completion.method === 'hours'
    ? `Completed planned hours divided by planned hours in scope; ${o.completion.coverage.withValue} of ${o.completion.coverage.total} tasks have hours. This is planned effort, not time spent.`
    : 'Completed tasks divided by tasks in scope. Issues closed as not planned are excluded; task sizes are not weighted.';
  const members = config.team?.members ?? [];
  return { html: `
  <div class="overview-layout">
    <div class="page-heading">
      <div><h1>${esc(p.name)}</h1>${p.description ? `<p>${esc(p.description)}</p>` : ''}</div>
      <a class="button primary" href="${weekHref}">${icon('weekly')}View weekly plan${icon('arrow')}</a>
    </div>

    <section class="project-strip" aria-label="Project facts and health">
      <dl class="strip-facts">
        <div><dt>Repository</dt><dd>${link(data.repository?.url ?? `https://github.com/${p.repository}`, p.repository)} ${prov('verified')}</dd></div>
        <div><dt>Leader</dt><dd>${leader ? esc(leader) : '—'} ${prov(leader ? 'configured' : 'missing')}</dd></div>
        <div><dt>Team</dt><dd>${members.map((m) => esc(m.name)).join(', ') || '—'} ${prov(members.length ? 'configured' : 'missing')}</dd></div>
        <div><dt>Schedule</dt><dd>Start ${day(p.startDate)} · Deadline ${day(p.finalDeadline)} ${prov(p.startDate && p.finalDeadline ? 'configured' : 'missing')}</dd></div>
        <div><dt>Last updated</dt><dd>${esc(formatInstant(freshness.generatedAt, p.timezone))}</dd></div>
        ${(p.links ?? []).length ? `<div><dt>Links</dt><dd>${p.links.map((l) => link(l.url, l.label)).join(' · ')}</dd></div>` : ''}
      </dl>
      <div class="strip-health">
        <h2>Project health</h2>
        <div>${healthBadge(o.health)}</div>
        <p>${esc(o.health.reason ?? '')}</p>
        <details class="health-method"><summary>How health is calculated</summary><p>Open tasks today are compared with an ideal straight line that starts at today’s number of tasks in scope on ${day(p.startDate)} and reaches zero on ${day(p.finalDeadline)}. The gap, as a share of the tasks in scope, gives On Track (up to ${Math.round((config.health?.onTrackGap ?? 0.05) * 100)} %), At Risk (up to ${Math.round((config.health?.atRiskGap ?? 0.2) * 100)} %) or Delayed. After the deadline it is Completed when every task in scope is done, otherwise Delayed. With fewer than ${config.health?.minDataPoints ?? 3} days of data it is Insufficient Data. <a href="#burndown">See the burndown</a>.</p></details>
      </div>
    </section>

    <section class="metrics-row" aria-label="Project task summary">
      ${metric('Total tasks', o.total, o.dropped ? `${o.dropped} not planned · excluded` : 'All issues in scope', '#kanban', 'kanban')}
      ${metric('Completed', o.done, 'Issues closed as completed', '#kanban', 'check', 'positive')}
      ${metric('In progress', o.inProgress, `${o.counts.in_progress} active · ${o.counts.review} in review`, '#kanban', 'clock')}
      ${metric('Overdue', o.overdue, 'Past the planned due date', '#roadmap', 'alert', o.overdue ? 'critical' : '')}
    </section>

    <div class="overview-primary">
      <section class="card progress-panel" aria-labelledby="progress-heading">
        <div class="section-head"><h2 id="progress-heading">Project progress</h2><a class="text-link" href="#burndown">View analytics ${icon('arrow')}</a></div>
        <div class="progress-summary"><div><strong>${pct(o.completion)}</strong><span>overall completion ${info(method)}</span></div><p>${o.completion.value === null ? esc(o.completion.reason) : `<b>${o.completion.num}</b> / ${o.completion.den} ${o.completion.method === 'hours' ? 'planned hours' : 'tasks'} completed`}</p></div>
        ${meter(o.completion, 'Overall completion')}
        <div class="progress-caption"><span>${o.pending} pending · ${o.inProgress} in progress</span><span>${day(p.startDate, false)} – ${day(p.finalDeadline, false)}</span></div>
        <div class="section-head weekly-head"><h3>Weekly progress</h3><span class="small muted">Select a week to explore</span></div>
        <div class="week-rail">
          ${weeks.map((w) => `<a href="#weekly/${w.number}" class="week-cell ${w.state}" aria-label="Week ${w.number}, ${pct(w.stats.completion)} complete, ${w.stats.done.length} of ${w.stats.planned.length} tasks${w.state === 'current' ? ', current week' : ''}">
            <span class="week-value">${pct(w.stats.completion)}</span><span class="week-column"><span style="height:${Math.max(0, Math.min(100, (w.stats.completion.value ?? 0) * 100)).toFixed(1)}%"></span></span><span class="week-name">W${w.number}</span><span class="week-count">${w.stats.done.length}/${w.stats.planned.length}</span>${w.state === 'current' ? '<span class="week-now">Now</span>' : ''}
          </a>`).join('')}
        </div>
      </section>

      <section class="current-panel" aria-labelledby="current-heading">
        <div class="section-head"><h2 id="current-heading">${esc(weekLabel)}</h2><span class="period-label">${week ? 'Current week' : 'Project period'}</span></div>
        <p class="period-dates">${week ? `${day(week.start)} – ${day(week.end, false)}` : 'View the project schedule'}</p>
        <h3 class="week-goal">${esc(week?.milestoneData?.title ?? 'Weekly plan')}</h3>
        <p class="week-description">${esc(week?.goal ?? 'Explore the weekly plan, tasks and supporting evidence.')}</p>
        ${week ? `<div class="current-completion"><span>${week.stats.done.length} of ${week.stats.planned.length} tasks completed</span><strong>${pct(week.stats.completion)}</strong></div>${meter(week.stats.completion, `${weekLabel} completion`)}` : ''}
        <a class="text-link" href="${weekHref}">Open ${week ? `week ${week.number}` : 'weekly plan'} ${icon('arrow')}</a>
        <div class="milestone-summary">${icon('roadmap')}<div><strong>${o.nextMilestone ? 'Next milestone' : 'No upcoming milestone'}</strong>${o.nextMilestone ? `<span>${link(o.nextMilestone.url, o.nextMilestone.title)} · due ${day(o.nextMilestone.dueOn.slice(0, 10))}</span>` : ''}</div></div>
        <div class="deadline-summary">${icon('clock')}<div><strong>${o.daysRemaining === null ? 'Deadline not set' : o.daysRemaining < 0 ? 'Deadline passed' : `${o.daysRemaining} days to final deadline`}</strong><span>${day(p.finalDeadline)}</span></div></div>
      </section>
    </div>

    <div class="overview-secondary">
      <section class="card attention-panel" aria-labelledby="attention-heading">
        <div class="section-head"><h2 id="attention-heading">Needs attention <span class="count-badge">${attention.length}</span></h2><a class="text-link" href="#kanban">Task board ${icon('arrow')}</a></div>
        ${taskList(model, attention.slice(0, 3), { empty: 'No overdue or blocked tasks. See the task board for upcoming work.', status: false })}
        ${attention.length > 3 ? `<a class="attention-more text-link" href="#roadmap">Review all deadlines ${icon('arrow')}</a>` : ''}
        ${o.staleBoard ? `<details class="data-note"><summary>${o.staleBoard} task(s) have an outdated board status</summary><p class="small muted">The GitHub issue state is used when it differs from the board column. These tasks are marked “Board out of date”.</p></details>` : ''}
      </section>
      <section class="card overview-team" aria-labelledby="team-heading">
        <div class="section-head"><h2 id="team-heading">The team <span class="count-badge">${members.length}</span></h2><a class="text-link" href="#team">Details ${icon('arrow')}</a></div>
        <div class="team-roster">${members.map((m) => `<a href="#team" class="roster-member"><span class="initials" aria-hidden="true">${esc(m.name.trim().split(/\s+/).slice(-2).map((s) => s[0]).join(''))}</span><span><strong>${esc(m.name)}</strong><small>${m.login === config.team?.leader ? 'Team leader' : 'Team member'} · ${esc(m.login)}</small></span>${icon('arrow')}</a>`).join('') || '<p class="muted">No team members configured.</p>'}</div>
      </section>
    </div>

  </div>` };
}
