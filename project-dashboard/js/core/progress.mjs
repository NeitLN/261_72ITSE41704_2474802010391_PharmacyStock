// Progress figures. A ratio with no denominator is null with a reason, never 0.

import { inScope, isFinished } from './tasks.mjs';

export function ratio(num, den, reason = 'No tasks in scope') {
  return den > 0 ? { value: num / den, num, den, reason: null } : { value: null, num, den, reason };
}

/**
 * "tasks": done tasks ÷ tasks in scope.
 * "hours": planned Hours (board field) of done tasks ÷ planned Hours in scope,
 * over the tasks that have Hours; `coverage` says how many that is.
 */
export function completion(tasks, method = 'tasks') {
  const scoped = tasks.filter(inScope);
  if (method === 'hours') {
    const withHours = scoped.filter((t) => typeof t.hours === 'number');
    const sum = (list) => list.reduce((acc, t) => acc + t.hours, 0);
    const done = sum(withHours.filter((t) => t.status === 'done'));
    return {
      ...ratio(done, sum(withHours), 'No planned hours on the tasks in scope'),
      method,
      coverage: { withValue: withHours.length, total: scoped.length },
    };
  }
  return { ...ratio(scoped.filter((t) => t.status === 'done').length, scoped.length), method: 'tasks' };
}

/** The configured week that contains `today`, and where today sits in the schedule. */
export function currentWeek(weeks, today) {
  const sorted = [...weeks].sort((a, b) => (a.start < b.start ? -1 : 1));
  const week = sorted.find((w) => w.start <= today && today <= w.end) ?? null;
  if (week) return { week, state: 'during' };
  if (!sorted.length || today < sorted[0].start) return { week: null, state: 'before' };
  if (today > sorted.at(-1).end) return { week: null, state: 'after' };
  return { week: null, state: 'gap' };
}

export function countByStatus(tasks) {
  const counts = { backlog: 0, todo: 0, in_progress: 0, review: 0, done: 0, dropped: 0 };
  for (const t of tasks) counts[t.status] += 1;
  return counts;
}

export function weekStats(tasks, week) {
  const all = tasks.filter((t) => t.week === week.number);
  const planned = all.filter(inScope);
  const done = planned.filter((t) => t.status === 'done');
  const open = planned.filter((t) => !isFinished(t));
  return {
    planned,
    done,
    open,
    dropped: all.filter((t) => t.status === 'dropped'),
    overdue: open.filter((t) => t.overdue),
    blocked: open.filter((t) => t.blocked),
    completion: ratio(done.length, planned.length),
    members: [...new Set(planned.flatMap((t) => t.assignees))].sort(),
  };
}

export function memberStats(tasks, pulls, member) {
  const assigned = tasks.filter((t) => inScope(t) && t.assignees.includes(member.login));
  const byWeek = {};
  for (const t of assigned) {
    const key = t.week ?? 'none';
    byWeek[key] ??= { assigned: 0, done: 0 };
    byWeek[key].assigned += 1;
    if (t.status === 'done') byWeek[key].done += 1;
  }
  const authored = pulls.filter((p) => p.author === member.login);
  return {
    ...member,
    assigned,
    done: assigned.filter((t) => t.status === 'done'),
    open: assigned.filter((t) => !isFinished(t)),
    overdue: assigned.filter((t) => t.overdue),
    blocked: assigned.filter((t) => t.blocked && !isFinished(t)),
    mergedPulls: authored.filter((p) => p.mergedAt),
    openPulls: authored.filter((p) => !p.mergedAt && p.state === 'open'),
    byWeek,
  };
}
