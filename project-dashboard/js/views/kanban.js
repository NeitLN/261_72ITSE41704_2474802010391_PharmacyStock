// Read-only board. Column and card layout adapted from renderKanban() and
// createTaskCard() in 13wejay/seemple-tracker (MIT), rewritten to take the
// task list as input, with drag and drop and local storage removed.

import { STATUSES, STATUS_LABELS } from '../core/tasks.js';
import { day, esc, link, memberName, people, taskChips } from '../ui/dom.js';

export const title = 'Kanban';

const filters = { member: '', week: '', severity: '', label: '', status: '' };
let focusAfterRender = null;

function options(values, selected, labelOf = (v) => v) {
  return values.map((v) => `<option value="${esc(v)}"${String(v) === selected ? ' selected' : ''}>${esc(labelOf(v))}</option>`).join('');
}

function matches(t) {
  if (filters.member === '__none' ? t.assignees.length : filters.member && !t.assignees.includes(filters.member)) return false;
  if (filters.week && String(t.week ?? 'none') !== filters.week) return false;
  if (filters.severity && t.severity !== filters.severity) return false;
  if (filters.label && !t.labels.includes(filters.label)) return false;
  if (filters.status && t.status !== filters.status) return false;
  return true;
}

function card(model, t) {
  const pulls = t.pulls.map((p) => link(p.url, `#${p.number}${p.mergedAt ? '' : ' (open)'}`)).join(' ');
  return `<article class="task-card" aria-label="Issue ${t.number}">
    <a class="title" href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">#${t.number} ${esc(t.title)}</a>
    ${t.summary ? `<p class="summary">${esc(t.summary)}</p>` : ''}
    ${taskChips(t)}
    <div class="meta">
      <span>${people(model, t.assignees)}</span>
      ${t.week !== null ? `<span>Week ${t.week}</span>` : ''}
      ${t.plannedDue ? `<span>Due ${day(t.plannedDue, false)}</span>` : ''}
      ${typeof t.hours === 'number' ? `<span>${t.hours} h planned</span>` : ''}
    </div>
    ${t.labels.length ? `<div class="chip-row">${t.labels.map((l) => `<span class="chip">${esc(l)}</span>`).join('')}</div>` : ''}
    ${pulls ? `<div class="meta"><span>Pull requests: ${pulls}</span></div>` : ''}
  </article>`;
}

export function render(model) {
  const tasks = model.tasks;
  const logins = [...new Set(tasks.flatMap((t) => t.assignees))].sort((a, b) => memberName(model, a).localeCompare(memberName(model, b)));
  const weeks = [...new Set(tasks.map((t) => t.week ?? 'none'))].sort((a, b) => (a === 'none') - (b === 'none') || a - b);
  const severities = model.config.labels?.severity ?? [];
  const labels = [...new Set(tasks.flatMap((t) => t.labels))].sort();
  const shown = tasks.filter(matches);
  const dropped = shown.filter((t) => t.status === 'dropped');
  const boardSource = model.freshness.sources.projectV2 === 'ok';

  const html = `
  <div class="stack">
    <div class="section-head">
      <h2>Kanban</h2>
      <p>Read only. Open a card to see or change the issue on GitHub.</p>
    </div>
    <form class="filters no-print" id="kb-filters" aria-label="Filter tasks" onsubmit="return false">
      <label>Member<select name="member"><option value="">All</option>${options(logins, filters.member, (l) => memberName(model, l))}<option value="__none"${filters.member === '__none' ? ' selected' : ''}>Unassigned</option></select></label>
      <label>Week<select name="week"><option value="">All</option>${options(weeks.map(String), filters.week, (w) => (w === 'none' ? 'No week' : `Week ${w}`))}</select></label>
      <label>Status<select name="status"><option value="">All</option>${options([...STATUSES, 'dropped'], filters.status, (s) => STATUS_LABELS[s])}</select></label>
      <label>Severity<select name="severity"><option value="">All</option>${options(severities, filters.severity)}</select></label>
      <label>Label<select name="label"><option value="">All</option>${options(labels, filters.label)}</select></label>
      <button type="button" class="icon-button" id="kb-reset">Clear filters</button>
      <span class="small muted" aria-live="polite">${shown.length} of ${tasks.length} tasks</span>
    </form>
    ${boardSource ? '' : '<div class="banner note"><span aria-hidden="true">i</span><div>The project board could not be read in the last collection, so open issues are shown as Todo (with a milestone) or Backlog.</div></div>'}
    <div class="board">
      ${STATUSES.map((status) => {
        const list = shown.filter((t) => t.status === status);
        return `<section class="column" aria-label="${esc(STATUS_LABELS[status])}">
          <div class="column-head"><span>${esc(STATUS_LABELS[status])}</span><span class="count">${list.length}</span></div>
          <div class="cards">${list.length ? list.map((t) => card(model, t)).join('') : '<p class="empty">No tasks.</p>'}</div>
        </section>`;
      }).join('')}
    </div>
    ${dropped.length ? `<details><summary>${dropped.length} task(s) closed as not planned</summary><ul>${dropped.map((t) => `<li>${link(t.url, `#${t.number} ${t.title}`)}</li>`).join('')}</ul></details>` : ''}
    <p class="small muted">Columns: a closed issue is Done; an open issue takes its column from the project board${boardSource ? '' : ' (not available now)'}, and an open issue the board calls Done waits in Review until it is closed. Open issues not on the board are in Backlog.</p>
  </div>`;

  return {
    html,
    mount(root) {
      const form = root.querySelector('#kb-filters');
      if (focusAfterRender) {
        form.querySelector(focusAfterRender)?.focus();
        focusAfterRender = null;
      }
      form.addEventListener('change', (e) => {
        filters[e.target.name] = e.target.value;
        focusAfterRender = `[name="${e.target.name}"]`;
        window.dispatchEvent(new Event('dashboard:render'));
      });
      root.querySelector('#kb-reset').addEventListener('click', () => {
        for (const key of Object.keys(filters)) filters[key] = '';
        focusAfterRender = '#kb-reset';
        window.dispatchEvent(new Event('dashboard:render'));
      });
    },
  };
}
