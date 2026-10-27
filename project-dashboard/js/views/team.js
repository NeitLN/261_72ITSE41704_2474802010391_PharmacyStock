import { stackedBars } from '../ui/charts.js';
import { esc, info, link, people, prov, taskList } from '../ui/dom.js';

export const title = 'Team';

export function render(model) {
  const members = model.members;
  const weeks = model.weeks;
  if (!members.length) {
    return { html: `<div class="state"><p><strong>No team members are configured.</strong></p><p class="small">Add them under <code>team.members</code> in config/project.json. ${prov('missing')}</p></div>` };
  }
  const repoUrl = model.data.repository?.url;

  const cards = members.map((m) => `
    <section class="card member-card" aria-labelledby="m-${esc(m.login)}">
      <div class="who">
        <span class="avatar-frame" aria-hidden="true"><span class="initials">${esc(m.name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join(''))}</span><img class="avatar" src="https://github.com/${encodeURIComponent(m.login)}.png?size=80" alt="" width="40" height="40" loading="lazy"></span>
        <div>
          <h3 id="m-${esc(m.login)}">${esc(m.name)}${m.code ? ` <span class="muted">(${esc(m.code)})</span>` : ''}</h3>
          <p class="small">${link(`https://github.com/${m.login}`, `@${m.login}`)} ${prov('configured')}</p>
        </div>
      </div>
      ${m.role ? `<p class="role" style="margin-top:8px">${esc(m.role)}</p>` : ''}
      <div class="stats">
        <div><div class="n">${m.assigned.length}</div><div class="l">Assigned</div></div>
        <div><div class="n">${m.done.length}</div><div class="l">Completed</div></div>
        <div><div class="n">${m.open.length}</div><div class="l">Open</div></div>
        <div><div class="n">${m.overdue.length}</div><div class="l">Overdue</div></div>
        <div><div class="n">${m.mergedPulls.length}</div><div class="l">PRs merged</div></div>
        <div><div class="n">${m.blocked.length}</div><div class="l">Blocked</div></div>
      </div>
      <details style="margin-top:10px"><summary>Open tasks (${m.open.length})</summary>${taskList(model, m.open, { empty: 'No open tasks.' })}</details>
      <details><summary>Pull requests merged (${m.mergedPulls.length})</summary>
        ${m.mergedPulls.length ? `<ul class="small">${m.mergedPulls.slice().reverse().map((p) => `<li>${link(p.url, `#${p.number} ${p.title}`)}</li>`).join('')}</ul>` : '<p class="muted small">None.</p>'}
        ${repoUrl ? `<p class="small">${link(`${repoUrl}/pulls?q=is%3Apr+author%3A${encodeURIComponent(m.login)}`, 'All of their pull requests on GitHub')}</p>` : ''}
      </details>
    </section>`).join('');

  const weekRows = members.map((m) => `<tr><th scope="row">${esc(m.name)}</th>${weeks.map((w) => {
    const v = m.byWeek[w.number];
    return `<td class="num">${v ? `${v.done}/${v.assigned}` : '—'}</td>`;
  }).join('')}</tr>`).join('');

  const html = `
  <div class="stack-lg">
    <div class="section-head"><h2>Team</h2><p>Who holds which tasks, from issue assignees and pull request authors on GitHub.</p></div>
    <div class="banner note"><span aria-hidden="true">i</span><div>These are counts of assigned issues and merged pull requests, not a contribution score. Reviews, testing, documentation and pairing are not fully visible in these numbers, and a member with fewer commits or pull requests has not necessarily contributed less. Commit counts and lines of code are deliberately not shown.</div></div>
    <div class="grid three">${cards}</div>

    <div class="grid two">
      <section class="card stack" aria-labelledby="dist">
        <div class="section-head"><h3 id="dist">Task distribution</h3>${info('Tasks in scope assigned to each member, split into done and open. A task with two assignees counts for both.')}</div>
        <div class="chart-box short"><canvas id="team-chart" role="img" aria-label="Done and open tasks per member"></canvas></div>
        <div class="table-wrap"><table><thead><tr><th>Member</th><th class="num">Assigned</th><th class="num">Done</th><th class="num">Open</th></tr></thead>
        <tbody>${members.map((m) => `<tr><td>${esc(m.name)}</td><td class="num">${m.assigned.length}</td><td class="num">${m.done.length}</td><td class="num">${m.open.length}</td></tr>`).join('')}</tbody></table></div>
      </section>
      <section class="card stack" aria-labelledby="weekly-load">
        <div class="section-head"><h3 id="weekly-load">Done / assigned per week</h3>${info('For each week, tasks of that week each member has completed out of those assigned to them. Use it to spot uneven load, not to rank people.')}</div>
        <div class="table-wrap"><table><thead><tr><th>Member</th>${weeks.map((w) => `<th class="num">W${w.number}</th>`).join('')}</tr></thead><tbody>${weekRows}</tbody></table></div>
        ${model.unassigned.length ? `<details><summary>${model.unassigned.length} task(s) without an assignee</summary>${taskList(model, model.unassigned)}</details>` : '<p class="small muted">Every task in scope has an assignee.</p>'}
        ${model.otherAssignees.length ? `<p class="small muted">Also assigned to tasks, but not in the team list: ${people(model, model.otherAssignees)}.</p>` : ''}
      </section>
    </div>
  </div>`;

  return {
    html,
    mount(root) {
      for (const avatar of root.querySelectorAll('.avatar')) {
        const showLoaded = () => avatar.classList.toggle('loaded', avatar.naturalWidth > 0);
        avatar.addEventListener('load', showLoaded);
        avatar.addEventListener('error', () => avatar.classList.remove('loaded'));
        if (avatar.complete) showLoaded();
      }
      stackedBars(root.querySelector('#team-chart'), {
        labels: members.map((m) => m.name),
        done: members.map((m) => m.done.length),
        open: members.map((m) => m.open.length),
        horizontal: true,
      });
    },
  };
}
