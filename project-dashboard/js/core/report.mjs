// The weekly report: one structure, rendered as HTML by views/reports.js and
// as Markdown or CSV here.

import { formatDay, formatInstant } from './dates.mjs';
import { STATUS_LABELS } from './tasks.mjs';

export function buildWeeklyReport(model, weekNumber) {
  const week = model.weeks.find((w) => w.number === weekNumber);
  if (!week) return null;
  const { stats, burndown } = week;
  const first = burndown.series[0];
  const last = burndown.series.at(-1);
  const memberName = new Map(model.config.team?.members?.map((m) => [m.login, m.name]) ?? []);
  return {
    project: { name: model.config.project.name, repository: model.data.repository?.url ?? null },
    week: { number: week.number, start: week.start, end: week.end, state: week.state, goal: week.goal, goalSource: week.goalSource, doneWhen: week.doneWhen },
    generatedAt: model.data.generatedAt,
    timezone: model.config.project.timezone,
    collectionStatus: model.freshness.status,
    planned: stats.planned,
    completed: stats.done,
    incomplete: stats.open,
    dropped: stats.dropped,
    completion: stats.completion,
    burndown: last ? { from: first.date, to: last.date, scopeStart: first.scope, scopeEnd: last.scope, done: last.done, remaining: last.remaining } : null,
    milestone: week.milestoneData,
    members: stats.members.map((login) => ({
      login,
      name: memberName.get(login) ?? login,
      planned: stats.planned.filter((t) => t.assignees.includes(login)).length,
      done: stats.done.filter((t) => t.assignees.includes(login)).length,
    })),
    blockers: [...(week.blockers ?? []).map((text) => ({ text, source: 'configured' })), ...stats.blocked.map((t) => ({ text: `#${t.number} ${t.title}`, source: 'label' }))],
    notes: week.notes ?? [],
    evidence: { pulls: week.mergedPulls, releases: week.releases, documents: week.documents ?? [] },
    nextWeek: week.nextWeekPlan,
  };
}

const cell = (value) => String(value ?? '—').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const pct = (ratio) => (ratio.value === null ? `— (${ratio.reason})` : `${Math.round(ratio.value * 100)} % (${ratio.num}/${ratio.den})`);

function taskTable(tasks) {
  if (!tasks.length) return '_None._\n';
  const rows = tasks.map((t) => `| [#${t.number}](${t.url}) | ${cell(t.title)} | ${cell(t.assignees.join(', '))} | ${STATUS_LABELS[t.status]} | ${cell(t.closedDay ? formatDay(t.closedDay) : '')} |`);
  return ['| Issue | Title | Assignees | Status | Closed |', '|---|---|---|---|---|', ...rows].join('\n') + '\n';
}

export function reportToMarkdown(r) {
  const lines = [
    `# Weekly report — Week ${r.week.number}`,
    '',
    `**Project:** ${r.project.name}${r.project.repository ? ` (${r.project.repository})` : ''}  `,
    `**Period:** ${formatDay(r.week.start)} – ${formatDay(r.week.end)}  `,
    `**Data collected:** ${formatInstant(r.generatedAt, r.timezone)} · collection status: ${r.collectionStatus}`,
    '',
    '## Weekly goal',
    '',
    r.week.goal ? `${r.week.goal}${r.week.goalSource === 'verified' ? ' _(milestone description on GitHub)_' : ''}` : '_Not set._',
    r.week.doneWhen ? `\n**Done when:** ${r.week.doneWhen}` : '',
    '',
    `## Completion: ${pct(r.completion)}`,
    '',
    '## Completed work',
    '',
    taskTable(r.completed),
    '## Incomplete work',
    '',
    taskTable(r.incomplete),
    '## Burndown summary',
    '',
    r.burndown
      ? `Scope ${r.burndown.scopeStart} → ${r.burndown.scopeEnd} tasks; ${r.burndown.done} done and ${r.burndown.remaining} remaining on ${formatDay(r.burndown.to)} (reconstructed from GitHub issue events).`
      : '_No data for this week yet._',
    '',
    '## Milestone',
    '',
    r.milestone ? `[${r.milestone.title}](${r.milestone.url}) — ${r.milestone.state}, due ${formatDay(r.milestone.dueOn?.slice(0, 10))}` : '_No milestone linked._',
    '',
    '## Team',
    '',
    r.members.length
      ? ['| Member | Planned | Done |', '|---|---|---|', ...r.members.map((m) => `| ${cell(m.name)} (@${cell(m.login)}) | ${m.planned} | ${m.done} |`)].join('\n')
      : '_No assigned tasks._',
    '',
    '## Blockers and risks',
    '',
    r.blockers.length ? r.blockers.map((b) => `- ${b.text}`).join('\n') : '_None recorded._',
    '',
    ...(r.notes.length ? ['## Notes', '', ...r.notes.map((n) => `- ${n}`), ''] : []),
    '## Evidence',
    '',
    ...r.evidence.pulls.map((p) => `- PR [#${p.number}](${p.url}) ${cell(p.title)} — merged ${formatDay(p.mergedAt.slice(0, 10))}`),
    ...r.evidence.releases.map((rel) => `- Release [${cell(rel.tag)}](${rel.url})`),
    ...r.evidence.documents.map((d) => `- [${cell(d.label)}](${d.url ?? d.path})`),
    r.evidence.pulls.length + r.evidence.releases.length + r.evidence.documents.length ? '' : '_None linked._\n',
    '## Next week',
    '',
    r.nextWeek ?? '_Not set._',
    '',
  ];
  return lines.join('\n');
}

export function reportCsvRows(r) {
  return [
    ['Week', 'Issue', 'Title', 'Assignees', 'Status', 'Planned due', 'Closed', 'URL'],
    ...[...r.planned, ...r.dropped].map((t) => [r.week.number, t.number, t.title, t.assignees.join(' '), STATUS_LABELS[t.status], t.plannedDue, t.closedDay, t.url]),
  ];
}
