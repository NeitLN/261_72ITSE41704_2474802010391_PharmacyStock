import { buildWeeklyReport, reportCsvRows, reportToMarkdown } from '../core/report.js';
import { toCsv } from '../core/escape.js';
import { formatInstant } from '../core/dates.js';
import { day, download, esc, link, pct, people, prov, taskList } from '../ui/dom.js';
import { weekPicker, selectedWeek } from './weekly.js';

export const title = 'Reports';

export function render(model, params) {
  const week = selectedWeek(model, params);
  if (!week) return { html: '<div class="state"><p>No weeks are configured.</p></div>' };
  const r = buildWeeklyReport(model, week.number);
  const slug = (model.config.project.shortName ?? 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const file = `${slug}-week-${String(week.number).padStart(2, '0')}`;

  const html = `
  <div class="stack-lg">
    <div class="section-head no-print"><h2>Reports</h2><p>Generated from the same data as the rest of the dashboard.</p></div>
    ${weekPicker(model, week.number, 'reports')}
    <div class="toolbar no-print">
      <button type="button" class="icon-button" id="rp-print">Print / Save as PDF</button>
      <button type="button" class="icon-button" id="rp-md">Download Markdown</button>
      <button type="button" class="icon-button" id="rp-csv">Download task table (CSV)</button>
    </div>

    <article class="card report stack" aria-labelledby="rp-title">
      <h2 id="rp-title">Weekly report — Week ${r.week.number}</h2>
      <dl class="facts">
        <dt>Project</dt><dd>${esc(r.project.name)}${r.project.repository ? ` · ${link(r.project.repository, r.project.repository.replace('https://github.com/', ''))}` : ''}</dd>
        <dt>Reporting period</dt><dd>${day(r.week.start)} – ${day(r.week.end)}</dd>
        <dt>Data collected</dt><dd>${esc(formatInstant(r.generatedAt, r.timezone))} · status: ${esc(r.collectionStatus)}</dd>
        <dt>Report generated</dt><dd>${esc(formatInstant(new Date().toISOString(), r.timezone))}</dd>
        <dt>Completion</dt><dd>${pct(r.completion)} (${r.completed.length} of ${r.planned.length} tasks)</dd>
      </dl>

      <h2>Weekly goal</h2>
      <p>${r.week.goal ? esc(r.week.goal) : '<span class="muted">Not set.</span>'} ${prov(r.week.goalSource)}</p>
      ${r.week.doneWhen ? `<p><strong>Done when:</strong> ${esc(r.week.doneWhen)}</p>` : ''}

      <h2>Completed work (${r.completed.length})</h2>
      ${taskList(model, r.completed, { empty: 'Nothing completed.', status: false })}

      <h2>Incomplete work (${r.incomplete.length})</h2>
      ${taskList(model, r.incomplete, { empty: 'Nothing left open.' })}

      <h2>Burndown summary</h2>
      <p>${r.burndown ? `Scope went from ${r.burndown.scopeStart} to ${r.burndown.scopeEnd} task(s); ${r.burndown.done} done and ${r.burndown.remaining} remaining on ${day(r.burndown.to)}. Reconstructed from GitHub issue events. ${esc(week.burndown.health.reason ?? '')}` : '<span class="muted">No data for this week yet.</span>'}</p>

      <h2>Milestone</h2>
      <p>${r.milestone ? `${link(r.milestone.url, r.milestone.title)} — ${esc(r.milestone.state)}, due ${day(r.milestone.dueOn?.slice(0, 10))}` : '<span class="muted">No milestone linked.</span>'}</p>

      <h2>Team</h2>
      ${r.members.length ? `<div class="table-wrap"><table><thead><tr><th>Member</th><th class="num">Planned</th><th class="num">Done</th></tr></thead><tbody>${r.members.map((m) => `<tr><td>${esc(m.name)}</td><td class="num">${m.planned}</td><td class="num">${m.done}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No assigned tasks.</p>'}

      <h2>Blockers and risks</h2>
      ${r.blockers.length ? `<ul>${r.blockers.map((b) => `<li>${esc(b.text)}</li>`).join('')}</ul>` : '<p class="muted">None recorded.</p>'}
      ${r.notes.length ? `<h2>Notes</h2><ul>${r.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}

      <h2>Development evidence</h2>
      ${r.evidence.pulls.length + r.evidence.releases.length + r.evidence.documents.length ? `<ul>
        ${r.evidence.documents.map((d) => `<li>${link(d.url, d.label)}</li>`).join('')}
        ${r.evidence.releases.map((rel) => `<li>Release ${link(rel.url, rel.tag)}</li>`).join('')}
        ${r.evidence.pulls.map((p) => `<li>PR ${link(p.url, `#${p.number}`)} ${esc(p.title)} — ${people(model, [p.author])}, merged ${day(p.mergedAt.slice(0, 10), false)}</li>`).join('')}
      </ul>` : '<p class="muted">None linked.</p>'}

      <h2>Next week</h2>
      <p>${r.nextWeek ? esc(r.nextWeek) : '<span class="muted">Not set.</span>'}</p>
    </article>
  </div>`;

  return {
    html,
    mount(root) {
      root.querySelector('#rp-print').addEventListener('click', () => window.print());
      root.querySelector('#rp-md').addEventListener('click', () => download(`${file}.md`, reportToMarkdown(r), 'text/markdown;charset=utf-8'));
      root.querySelector('#rp-csv').addEventListener('click', () => download(`${file}.csv`, `﻿${toCsv(reportCsvRows(r))}`, 'text/csv;charset=utf-8'));
    },
  };
}
