import { day, esc, link, memberName, prov } from '../ui/dom.js';
import { formatInstant } from '../core/dates.js';
import { weekPicker, selectedWeek } from './weekly.js';

export const title = 'Evidence';

function deliverableRows(model, tasks) {
  if (!tasks.length) return '<tr><td colspan="5" class="muted">No completed tasks in this week yet.</td></tr>';
  return tasks.map((t) => {
    const merged = t.pulls.filter((p) => p.mergedAt);
    return `<tr>
      <td>${link(t.url, `#${t.number}`)} ${esc(t.title)}</td>
      <td><span class="chip">Done</span></td>
      <td>${t.assignees.length ? t.assignees.map((l) => esc(memberName(model, l))).join(', ') : '<span class="muted">—</span>'}</td>
      <td>${day(t.closedDay)}</td>
      <td>${merged.length ? merged.map((p) => link(p.url, `PR #${p.number}`)).join(', ') : '<span class="muted small">No PR references this issue</span>'}</td>
    </tr>`;
  }).join('');
}

export function render(model, params) {
  const week = selectedWeek(model, params);
  const data = model.data;
  const tz = model.config.project.timezone;
  const docs = data.documents ?? [];
  const byFolder = new Map();
  for (const d of docs) {
    const folder = d.path.split('/').slice(0, -1).join('/') || '/';
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder).push(d);
  }

  const html = `
  <div class="stack-lg">
    <div class="section-head"><h2>Evidence Center</h2><p>Everything here links to the record on GitHub. Nothing is entered by hand except the configured week documents.</p></div>
    ${week ? weekPicker(model, week.number, 'evidence') : ''}

    ${week ? `<section class="card stack" aria-labelledby="ev-week">
      <h3 id="ev-week">Week ${week.number} deliverables · ${day(week.start, false)} – ${day(week.end)}</h3>
      <div class="table-wrap"><table>
        <caption>Tasks of this week closed as completed, with the merged pull requests that reference them (“Refs #n”, “Closes #n”).</caption>
        <thead><tr><th>Task</th><th>Status</th><th>Done by</th><th>Completed</th><th>Evidence</th></tr></thead>
        <tbody>${deliverableRows(model, week.stats.done)}</tbody>
      </table></div>
      <details ${week.mergedPulls.length ? 'open' : ''}><summary>Pull requests merged during the week (${week.mergedPulls.length})</summary>
        ${week.mergedPulls.length ? `<ul class="small">${week.mergedPulls.map((p) => `<li>${link(p.url, `#${p.number} ${p.title}`)} — ${esc(memberName(model, p.author))}, ${day(p.mergedAt.slice(0, 10), false)}${p.refs.length ? ` · refs ${p.refs.map((n) => `#${n}`).join(', ')}` : ''}</li>`).join('')}</ul>` : '<p class="muted small">None.</p>'}
      </details>
      <div>
        <p class="small muted">Documents for this week ${prov('configured')}</p>
        ${week.documents.length ? `<ul class="small">${week.documents.map((d) => `<li>${link(d.url, d.label)}${d.exists === true ? ` ${prov('verified')}` : d.exists === false ? ' <span class="chip stale">not found on the default branch</span>' : ''}</li>`).join('')}</ul>` : '<p class="muted small">None configured.</p>'}
      </div>
    </section>` : ''}

    <div class="grid two">
      <section class="card stack" aria-labelledby="ev-rel">
        <h3 id="ev-rel">Released versions</h3>
        ${data.releases?.length ? `<ul>${data.releases.map((r) => `<li>${link(r.url, r.name || r.tag)} — ${day(r.publishedAt?.slice(0, 10))}${r.prerelease ? ' <span class="chip">pre-release</span>' : ''}</li>`).join('')}</ul>` : '<p class="muted small">No releases published yet.</p>'}
        <h3>Automated checks on the default branch</h3>
        ${data.workflowRuns?.length ? `<ul>${data.workflowRuns.map((r) => `<li>${link(r.url, r.name)}: <span class="health ${r.conclusion === 'success' ? 'on_track' : 'delayed'}">${r.conclusion === 'success' ? '✓ passed' : `✕ ${esc(r.conclusion)}`}</span> <span class="small muted">${esc(formatInstant(r.createdAt, tz))}, commit ${esc(r.sha)}</span></li>`).join('')}</ul>` : `<p class="muted small">No workflow results collected ${prov(model.freshness.sources.workflowRuns === 'ok' ? 'verified' : 'missing')}.</p>`}
        <p class="small muted">The test-case table and run log live in the repository; see the documents list.</p>
      </section>
      <section class="card stack" aria-labelledby="ev-docs">
        <h3 id="ev-docs">Documents in the repository (${docs.length})</h3>
        ${docs.length ? [...byFolder.entries()].map(([folder, list]) => `<details><summary>${esc(folder)} (${list.length})</summary><ul class="small">${list.map((d) => `<li>${link(d.url, d.path.split('/').at(-1))}</li>`).join('')}</ul></details>`).join('') : '<p class="muted small">No document folders configured under evidence.documentPaths.</p>'}
      </section>
    </div>
  </div>`;
  return { html };
}
