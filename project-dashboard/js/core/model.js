// Builds everything the views show from config/project.json, data/dashboard.json
// and data/history.json. Every view reads this one model, so all charts and
// tables use the same task set.

import { dayKey, diffDays, minKey } from './dates.js';
import { normalizeTasks, inScope } from './tasks.js';
import { completion, countByStatus, currentWeek, memberStats, weekStats } from './progress.js';
import { health, idealLine, observedSeries, reconstruct } from './burndown.js';

/** Splits a milestone description of the form "Deliverable: … Done when: … Plan: …". */
export function parseMilestoneDescription(description) {
  if (!description) return { deliverable: null, doneWhen: null };
  const pick = (label) => {
    const match = description.match(new RegExp(`${label}:\\s*([\\s\\S]*?)(?:\\n\\s*\\w[\\w ]*:|$)`));
    return match ? match[1].trim() : null;
  };
  const deliverable = pick('Deliverable');
  return {
    deliverable: deliverable ?? description.split('\n')[0].trim(),
    doneWhen: pick('Done when'),
  };
}

function burndownFor({ tasks, data, config, today, from, to, milestoneNumbers, history, weekNumber, openNow }) {
  const tz = config.project.timezone;
  const until = minKey(today, to);
  const series = until && from <= until
    ? reconstruct({ tasks, events: data.events, milestones: data.milestones, from, to: until, timeZone: tz, milestoneNumbers })
    : [];
  const ideal = from && to ? idealLine(series, from, to) : [];
  let status = health({ series, ideal, today, finalDeadline: to, config });
  if (to && today > to && openNow.scope > 0) {
    // A finished period is judged on where it stands now, and says whether
    // the work was finished inside the period or later.
    const atEnd = series.at(-1);
    status = openNow.open === 0
      ? {
          status: 'completed',
          gap: 0,
          reason: atEnd && atEnd.remaining > 0
            ? `All done, but ${atEnd.remaining} of ${atEnd.scope} task(s) were still open when the period ended.`
            : 'All done by the end of the period.',
        }
      : { status: 'delayed', gap: null, reason: `${openNow.open} of ${openNow.scope} task(s) still open after the period ended.` };
  }
  return {
    from,
    to,
    series,
    ideal,
    // Without issue events the series falls back to current milestones and
    // close dates: an estimate that cannot see reopened issues or moves.
    fromEvents: data.collection?.sources?.events === 'ok',
    observed: observedSeries(history, weekNumber),
    health: status,
  };
}

function inRange(iso, week, tz) {
  const day = dayKey(iso, tz);
  return Boolean(day) && week.start <= day && day <= week.end;
}

export function buildModel({ config, data, history = [], now = new Date() }) {
  const tz = config.project.timezone;
  const today = dayKey(now, tz);
  const tasks = normalizeTasks(data, config, today);
  const scoped = tasks.filter(inScope);
  const milestones = new Map((data.milestones ?? []).map((m) => [m.number, m]));
  const weeksConfig = [...(config.weeks ?? [])].sort((a, b) => a.number - b.number);
  const current = currentWeek(weeksConfig, today);
  const pulls = data.pulls ?? [];

  const repoUrl = data.repository?.url ?? `https://github.com/${config.project.repository}`;
  const branch = data.repository?.defaultBranch ?? 'main';
  const knownPaths = data.collection?.sources?.documents === 'ok' ? new Set((data.documents ?? []).map((d) => d.path)) : null;
  const documentLink = (d) => ({
    ...d,
    url: d.url ?? `${repoUrl}/blob/${branch}/${d.path}`,
    // true / false when the repository tree was read, null when it was not.
    exists: d.url ? null : knownPaths ? knownPaths.has(d.path) : null,
  });

  const weeks = weeksConfig.map((w, index) => {
    const milestone = milestones.get(w.milestone) ?? null;
    const parsed = parseMilestoneDescription(milestone?.description);
    const goal = w.goal ?? parsed.deliverable;
    const next = weeksConfig[index + 1];
    const nextMilestone = next ? milestones.get(next.milestone) : null;
    const state = today < w.start ? 'upcoming' : today > w.end ? 'past' : 'current';
    const stats = weekStats(tasks, w);
    const burndown = burndownFor({
      tasks, data, config, today, from: w.start, to: w.end, milestoneNumbers: [w.milestone], history, weekNumber: w.number,
      openNow: { scope: stats.planned.length, open: stats.open.length },
    });
    return {
      ...w,
      milestoneData: milestone,
      goal,
      goalSource: w.goal ? 'configured' : parsed.deliverable ? 'verified' : 'missing',
      doneWhen: parsed.doneWhen,
      nextWeekPlan: w.nextWeek ?? (next ? next.goal ?? parseMilestoneDescription(nextMilestone?.description).deliverable : null),
      state,
      stats,
      documents: (w.documents ?? []).map(documentLink),
      mergedPulls: pulls.filter((p) => p.mergedAt && inRange(p.mergedAt, w, tz)),
      releases: (data.releases ?? []).filter((r) => inRange(r.publishedAt, w, tz)),
      burndown,
    };
  });

  const project = config.project;
  const projectBurndown = burndownFor({
    tasks, data, config, today, from: project.startDate, to: project.finalDeadline, milestoneNumbers: null, history, weekNumber: null,
    openNow: { scope: scoped.length, open: scoped.filter((t) => t.status !== 'done').length },
  });

  const counts = countByStatus(tasks);
  const nextMilestone = (data.milestones ?? [])
    .filter((m) => m.state === 'open' && m.dueOn && dayKey(m.dueOn, 'UTC') >= today)
    .sort((a, b) => (a.dueOn < b.dueOn ? -1 : 1))[0] ?? null;

  const configured = new Set((config.team?.members ?? []).map((m) => m.login));
  const members = (config.team?.members ?? []).map((m) => memberStats(tasks, pulls, m));
  const otherAssignees = [...new Set(scoped.flatMap((t) => t.assignees))].filter((l) => !configured.has(l)).sort();

  const generatedAt = data.generatedAt ?? null;
  const ageHours = generatedAt ? (now.getTime() - new Date(generatedAt).getTime()) / 3_600_000 : null;
  const staleAfter = config.publishing?.staleAfterHours ?? 30;

  return {
    config,
    data,
    today,
    tasks,
    current,
    weeks,
    members,
    otherAssignees,
    unassigned: scoped.filter((t) => t.assignees.length === 0),
    burndown: { project: projectBurndown },
    overview: {
      total: scoped.length,
      done: counts.done,
      inProgress: counts.in_progress + counts.review,
      pending: counts.backlog + counts.todo,
      dropped: counts.dropped,
      overdue: scoped.filter((t) => t.overdue).length,
      blocked: scoped.filter((t) => t.blocked && t.status !== 'done').length,
      staleBoard: tasks.filter((t) => t.staleBoard).length,
      counts,
      completion: completion(tasks, config.progress?.method ?? 'tasks'),
      daysRemaining: project.finalDeadline ? diffDays(today, project.finalDeadline) : null,
      nextMilestone,
      health: projectBurndown.health,
    },
    freshness: {
      generatedAt,
      ageHours,
      stale: ageHours === null || ageHours > staleAfter,
      staleAfterHours: staleAfter,
      status: data.collection?.status ?? 'unknown',
      sources: data.collection?.sources ?? {},
      errors: data.collection?.errors ?? [],
    },
  };
}
