// Small HTML helpers shared by the views. Every value from GitHub or the
// config goes through esc() or link(); views build markup only from these.

import { escapeHtml, safeUrl } from '../core/escape.js';
import { formatDay } from '../core/dates.js';
import { STATUS_LABELS } from '../core/tasks.js';
import { HEALTH_LABELS } from '../core/burndown.js';

export const esc = escapeHtml;

export function link(url, text, { external = true } = {}) {
  const href = safeUrl(url);
  const attrs = external && /^https?:/i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<a href="${esc(href)}"${attrs}>${esc(text)}</a>`;
}

export const day = (key, withYear = true) => esc(formatDay(key, withYear));

/** "46 %" or "—" when the ratio is unknown. */
export function pct(ratio) {
  if (!ratio || ratio.value === null || ratio.value === undefined) return '—';
  return `${Math.round(ratio.value * 100)} %`;
}

export function meter(ratio, label) {
  const value = ratio?.value ?? null;
  if (value === null) return `<div class="meter" role="img" aria-label="${esc(label)}: no data"></div>`;
  const width = Math.max(0, Math.min(100, value * 100));
  return `<div class="meter" role="img" aria-label="${esc(label)}: ${Math.round(width)} %"><span style="width:${width.toFixed(1)}%"></span></div>`;
}

const HEALTH_ICONS = { on_track: '✓', completed: '✓', at_risk: '!', delayed: '✕', insufficient: '?' };

export function healthBadge(health) {
  const status = health?.status ?? 'insufficient';
  return `<span class="health ${status}"><span aria-hidden="true">${HEALTH_ICONS[status]}</span>${esc(HEALTH_LABELS[status])}</span>`;
}

const PROVENANCE = {
  verified: ['GitHub', 'Read from GitHub by the collector'],
  configured: ['Config', 'Declared by the team leader in config/project.json'],
  missing: ['Missing', 'No data source yet'],
};

export function prov(kind) {
  const [label, title] = PROVENANCE[kind] ?? PROVENANCE.missing;
  return `<span class="prov ${kind}" title="${esc(title)}">${label}</span>`;
}

/** A keyboard-reachable "i" button whose tooltip explains a figure. */
export function info(text) {
  return `<button type="button" class="info" aria-label="About this figure"><span aria-hidden="true">i</span><span class="tip" role="tooltip">${esc(text)}</span></button>`;
}

export function statusChip(task) {
  return `<span class="chip">${esc(STATUS_LABELS[task.status])}</span>`;
}

export function taskChips(task, { status = false } = {}) {
  const chips = [];
  if (status) chips.push(statusChip(task));
  if (task.severity) chips.push(`<span class="chip sev-${esc(task.severity)}" title="Severity label">${esc(task.severity)}</span>`);
  if (task.overdue) chips.push('<span class="chip overdue" title="Open past its planned due date">Overdue</span>');
  if (task.blocked) chips.push('<span class="chip blocked">Blocked</span>');
  if (task.staleBoard) chips.push('<span class="chip stale" title="The issue is closed or open, but the project board shows another column">Board out of date</span>');
  return chips.length ? `<span class="chip-row">${chips.join('')}</span>` : '';
}

export function memberName(model, login) {
  const m = model.config.team?.members?.find((x) => x.login === login);
  return m ? m.name : login;
}

export function people(model, logins) {
  if (!logins?.length) return '<span class="muted">Unassigned</span>';
  return logins.map((l) => esc(memberName(model, l))).join(', ');
}

export function taskLine(model, t, { status = true } = {}) {
  const pulls = t.pulls.filter((p) => p.mergedAt).map((p) => link(p.url, `PR #${p.number}`)).join(' ');
  return `<li>
    <div class="task-line"><span class="num">#${t.number}</span>${link(t.url, t.title)}</div>
    <div class="task-line small muted">${people(model, t.assignees)}${t.closedDay ? ` · closed ${day(t.closedDay, false)}` : t.plannedDue ? ` · due ${day(t.plannedDue, false)}` : ''}${pulls ? ` · ${pulls}` : ''} ${taskChips(t, { status })}</div>
  </li>`;
}

export function taskList(model, tasks, { empty = 'None.', status = true } = {}) {
  if (!tasks.length) return `<p class="muted small">${esc(empty)}</p>`;
  return `<ul class="task-list">${tasks.map((t) => taskLine(model, t, { status })).join('')}</ul>`;
}

export function emptyState(title, detail = '') {
  return `<div class="state"><p><strong>${esc(title)}</strong></p>${detail ? `<p class="small">${esc(detail)}</p>` : ''}</div>`;
}

/** Triggers a file download built in the browser. */
export function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
