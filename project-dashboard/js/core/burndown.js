// Burndown series.
//
// reconstruct() replays each issue's closed / reopened / milestoned /
// demilestoned events, so a day's scope and done count are what GitHub
// recorded by the end of that day. It follows the issue's open or closed
// state, not the board's columns. The remaining-work formula
// (remaining = scope − done by that date, ideal = straight line to zero)
// follows thehale/github-projects-burndown-chart (MIT); scope tracking per day
// is added so that moving an issue between weeks is not read as finished work.
//
// observedSeries() reads the daily snapshots kept on the dashboard-data branch.

import { dayKey, dayRange, diffDays } from './dates.js';

function timelineOf(task, events, milestoneByTitle, timeZone) {
  const own = events
    .filter((e) => e.issue === task.number)
    .map((e) => ({ ...e, day: dayKey(e.at, timeZone) }))
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  const hasMilestoneEvents = own.some((e) => e.type === 'milestoned' || e.type === 'demilestoned');
  const hasCloseEvents = own.some((e) => e.type === 'closed');
  // Without a closed event, fall back to the issue's own closedAt.
  if (!hasCloseEvents && task.state === 'closed' && task.closedAt) {
    own.push({ type: 'closed', at: task.closedAt, day: dayKey(task.closedAt, timeZone) });
  }
  const lastClose = own.findLastIndex((e) => e.type === 'closed');
  const reopenedAfterLastClose = own.slice(lastClose + 1).some((e) => e.type === 'reopened');
  return {
    created: dayKey(task.createdAt, timeZone),
    events: own,
    lastClose: task.state === 'closed' && !reopenedAfterLastClose ? lastClose : -1,
    // With no milestone events, assume the current milestone was set at creation.
    initialMilestone: hasMilestoneEvents ? null : task.milestone,
    milestoneOf: (title) => milestoneByTitle.get(title) ?? null,
  };
}

function stateOn(timeline, day, finalReason) {
  let milestone = timeline.initialMilestone;
  let closed = false;
  let reason = null;
  timeline.events.forEach((e, index) => {
    if (e.day > day) return;
    if (e.type === 'milestoned') milestone = timeline.milestoneOf(e.milestone);
    else if (e.type === 'demilestoned') milestone = null;
    else if (e.type === 'closed') {
      closed = true;
      // Events carry no close reason; only the final close has a known one.
      reason = index === timeline.lastClose ? finalReason : 'completed';
    } else if (e.type === 'reopened') closed = false;
  });
  return { milestone, closed, dropped: closed && reason === 'not_planned' };
}

/**
 * @param {object} args
 * @param {number[]|null} args.milestoneNumbers  null = every task
 * @returns {{date: string, scope: number, done: number, remaining: number}[]}
 */
export function reconstruct({ tasks, events, milestones, from, to, timeZone, milestoneNumbers = null }) {
  const milestoneByTitle = new Map((milestones ?? []).map((m) => [m.title, m.number]));
  const wanted = milestoneNumbers ? new Set(milestoneNumbers) : null;
  const timelines = tasks.map((t) => ({ task: t, timeline: timelineOf(t, events ?? [], milestoneByTitle, timeZone) }));

  return dayRange(from, to).map((date) => {
    let scope = 0;
    let done = 0;
    for (const { task, timeline } of timelines) {
      if (!timeline.created || timeline.created > date) continue;
      const s = stateOn(timeline, date, task.stateReason);
      if (s.dropped) continue;
      if (wanted && !wanted.has(s.milestone)) continue;
      scope += 1;
      if (s.closed) done += 1;
    }
    return { date, scope, done, remaining: scope - done };
  });
}

/** Straight line from the latest known scope on `from` to 0 on `to`. */
export function idealLine(series, from, to) {
  const total = series.length ? series.at(-1).scope : 0;
  const span = diffDays(from, to);
  return dayRange(from, to).map((date) => ({
    date,
    value: span > 0 ? (total * diffDays(date, to)) / span : 0,
  }));
}

/** Snapshot totals for the project, or for one week when `weekNumber` is given. */
export function observedSeries(history, weekNumber = null) {
  return (history ?? [])
    .map((h) => {
      const totals = weekNumber === null ? h.totals : h.weeks?.[weekNumber];
      return totals ? { date: h.date, observedAt: h.observedAt, ...totals } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export const HEALTH_LABELS = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  delayed: 'Delayed',
  completed: 'Completed',
  insufficient: 'Insufficient Data',
};

/**
 * Gap = (remaining today − ideal remaining today) ÷ scope today.
 * gap ≤ onTrackGap → On Track; ≤ atRiskGap → At Risk; otherwise Delayed.
 * The thresholds follow the burn-down status bands in Hefrock/PM-charts (MIT).
 */
export function health({ series, ideal, today, finalDeadline, config }) {
  const rules = { onTrackGap: 0.05, atRiskGap: 0.2, minDataPoints: 3, ...config.health };
  const known = series.filter((p) => p.date <= today);
  const point = known.at(-1);
  if (known.length < rules.minDataPoints || !point || point.scope === 0) {
    return { status: 'insufficient', gap: null, reason: `Needs at least ${rules.minDataPoints} days of data with tasks in scope.` };
  }
  const pastDeadline = finalDeadline && today > finalDeadline;
  if (pastDeadline) {
    return point.remaining === 0
      ? { status: 'completed', gap: 0, reason: 'Every task in scope is done.' }
      : { status: 'delayed', gap: null, reason: `The deadline has passed with ${point.remaining} task(s) open.` };
  }
  const idealPoint = ideal.find((p) => p.date === point.date) ?? (point.date > (ideal.at(-1)?.date ?? '') ? { value: 0 } : null);
  if (!idealPoint) return { status: 'insufficient', gap: null, reason: 'No ideal value for today.' };
  const gap = (point.remaining - idealPoint.value) / point.scope;
  const status = gap <= rules.onTrackGap ? 'on_track' : gap <= rules.atRiskGap ? 'at_risk' : 'delayed';
  return {
    status,
    gap,
    reason: `${point.remaining} of ${point.scope} tasks open on ${point.date}; the ideal line expects ${idealPoint.value.toFixed(1)}.`,
    asOf: point.date,
  };
}

