// Roadmap / Gantt as positioned bars on a date track. The approach (date
// range → left/width percentages, day/week headers, a today marker) follows
// renderTimeline() in 13wejay/seemple-tracker (MIT), rewritten for read-only
// task data grouped by week.

import { addDays, dayKey, dayRange, diffDays, formatDay } from '../core/dates.js';
import { STATUS_LABELS } from '../core/tasks.js';
import { esc } from '../ui/dom.js';

export const title = 'Roadmap';

const state = { scale: 'week', member: '' };

export function render(model) {
  const p = model.config.project;
  const from = p.startDate ?? model.weeks[0]?.start;
  const to = p.finalDeadline ?? model.weeks.at(-1)?.end;
  if (!from || !to) {
    return { html: '<div class="state"><p>The roadmap needs a start date and a final deadline in config/project.json.</p></div>' };
  }
  const span = diffDays(from, to) + 1;
  const pos = (key) => (Math.max(0, Math.min(span, diffDays(from, key))) / span) * 100;
  const width = (a, b) => Math.max(0.4, pos(addDays(b, 1)) - pos(a));
  const todayLeft = model.today >= from && model.today <= to ? pos(model.today) + 50 / span : null;
  const todayLine = todayLeft === null ? '' : `<span class="today-line" style="left:${todayLeft.toFixed(2)}%" aria-hidden="true"></span>`;

  const ticks = state.scale === 'day'
    ? dayRange(from, to).map((d) => `<span class="tick">${esc(formatDay(d, false))}</span>`)
    : model.weeks.map((w) => `<span class="tick" style="flex:${diffDays(w.start, w.end) + 1}">W${w.number} · ${esc(formatDay(w.start, false))}</span>`);

  const tasks = model.tasks.filter((t) => t.status !== 'dropped' && (!state.member || t.assignees.includes(state.member)));
  const groups = [...model.weeks.map((w) => ({ week: w, tasks: tasks.filter((t) => t.week === w.number) })), { week: null, tasks: tasks.filter((t) => t.week === null) }]
    .filter((g) => g.week || g.tasks.length);

  const taskRow = (t) => {
    const start = t.plannedStart ?? t.plannedDue;
    const end = t.plannedDue ?? t.plannedStart;
    const cls = t.status === 'done' ? 'done' : t.overdue ? 'overdue' : '';
    const describe = `#${t.number} ${t.title}. ${STATUS_LABELS[t.status]}. Planned ${start ? formatDay(start) : 'no date'} to ${end ? formatDay(end) : 'no date'}${t.closedDay ? `, closed ${formatDay(t.closedDay)}` : ''}${t.overdue ? ', overdue' : ''}.`;
    return `<div class="gantt-row">
      <div class="gantt-label" title="${esc(describe)}"><a href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">#${t.number} ${esc(t.title)}</a></div>
      <div class="gantt-track" role="img" aria-label="${esc(describe)}">
        ${todayLine}
        ${start && end ? `<span class="bar ${cls}" style="left:${pos(start).toFixed(2)}%;width:${width(start, end).toFixed(2)}%" title="${esc(describe)}"></span>` : ''}
        ${t.closedDay && t.closedDay >= from && t.closedDay <= to ? `<span class="mark-closed" style="left:${(pos(t.closedDay) + 50 / span).toFixed(2)}%" title="Closed ${esc(formatDay(t.closedDay))}"></span>` : ''}
      </div>
    </div>`;
  };

  const groupHtml = groups.map(({ week, tasks: list }) => {
    const open = week ? week.state === 'current' : false;
    const done = list.filter((t) => t.status === 'done').length;
    const head = week
      ? `<div class="gantt-row gantt-group">
          <div class="gantt-label"><span class="caret" aria-hidden="true"></span>Week ${week.number} · ${done}/${list.length} done</div>
          <div class="gantt-track" role="img" aria-label="Week ${week.number}, ${esc(formatDay(week.start))} to ${esc(formatDay(week.end))}${week.milestoneData ? `, milestone ${esc(week.milestoneData.title)}` : ''}">
            ${todayLine}
            <span class="bar week" style="left:${pos(week.start).toFixed(2)}%;width:${width(week.start, week.end).toFixed(2)}%"></span>
            ${week.milestoneData?.dueOn ? `<span class="mark-milestone" style="left:${(pos(dayKey(week.milestoneData.dueOn, 'UTC')) + 50 / span).toFixed(2)}%" title="Milestone ${esc(week.milestoneData.title)} due ${esc(formatDay(dayKey(week.milestoneData.dueOn, 'UTC')))}"></span>` : ''}
          </div>
        </div>`
      : `<div class="gantt-row gantt-group"><div class="gantt-label">No week · ${list.length} task(s)</div><div class="gantt-track"></div></div>`;
    return `<details ${open ? 'open' : ''}><summary class="gantt-summary">${head}</summary>${list.map(taskRow).join('')}</details>`;
  }).join('');

  const members = (model.config.team?.members ?? []).map((m) => `<option value="${esc(m.login)}"${state.member === m.login ? ' selected' : ''}>${esc(m.name)}</option>`).join('');
  const overdue = tasks.filter((t) => t.overdue);

  const html = `
  <div class="stack">
    <div class="section-head"><h2>Roadmap</h2><p>${esc(formatDay(from))} – ${esc(formatDay(to))}. Bars use the board's Start and Due fields, or the task's week when those are empty.</p></div>
    <div class="filters no-print">
      <label>Scale<select id="rm-scale"><option value="week"${state.scale === 'week' ? ' selected' : ''}>Weeks</option><option value="day"${state.scale === 'day' ? ' selected' : ''}>Days</option></select></label>
      <label>Member<select id="rm-member"><option value="">All</option>${members}</select></label>
      <button type="button" class="icon-button" id="rm-expand">Expand all weeks</button>
    </div>
    <div class="legend" aria-label="Legend">
      <span><span class="key" style="background:var(--series-1)"></span>Planned, open</span>
      <span><span class="key" style="background:var(--critical)"></span>Overdue</span>
      <span><span class="key" style="background:var(--series-neutral);opacity:.55"></span>Done</span>
      <span><span class="key" style="background:var(--good);transform:rotate(45deg);width:10px"></span>Closed on</span>
      <span><span class="key" style="background:var(--ink);transform:rotate(45deg);width:10px"></span>Milestone due</span>
      <span><span class="key" style="background:var(--accent);width:3px"></span>Today</span>
    </div>
    <div class="gantt ${state.scale}">
      <div class="gantt-inner">
        <div class="gantt-row gantt-head"><div class="gantt-label">Task</div><div class="gantt-track">${ticks.join('')}</div></div>
        ${groupHtml}
      </div>
    </div>
    <p class="small muted">Dependencies between tasks are not tracked in GitHub for this project, so none are drawn. ${overdue.length ? `${overdue.length} open task(s) are past their planned due date.` : 'No open task is past its planned due date.'}</p>
  </div>`;

  return {
    html,
    mount(root) {
      root.querySelector('#rm-scale').addEventListener('change', (e) => { state.scale = e.target.value; window.dispatchEvent(new Event('dashboard:render')); });
      root.querySelector('#rm-member').addEventListener('change', (e) => { state.member = e.target.value; window.dispatchEvent(new Event('dashboard:render')); });
      root.querySelector('#rm-expand').addEventListener('click', () => { for (const d of root.querySelectorAll('.gantt details')) d.open = true; });
    },
  };
}
