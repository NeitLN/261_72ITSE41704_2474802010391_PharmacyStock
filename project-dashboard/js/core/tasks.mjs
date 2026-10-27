// Turns the collected issues into tasks with one dashboard status each.
// The rules are in docs/dashboard/INTEGRATION_PLAN.md §3: the issue's
// open/closed state wins, and the board only places open issues in a column.

import { dayKey } from './dates.mjs';

export const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done'];
export const STATUS_LABELS = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
  dropped: 'Dropped',
};

export const isFinished = (task) => task.status === 'done' || task.status === 'dropped';
export const inScope = (task) => task.status !== 'dropped';

function boardStatus(board, statusMap) {
  if (!board || !board.status) return null;
  return statusMap[board.status] ?? null;
}

function statusOf(issue, boardData, statusMap) {
  const mapped = boardStatus(issue.board, statusMap);
  if (issue.state === 'closed') {
    if (issue.stateReason === 'not_planned') return { status: 'dropped', source: 'issue', stale: false };
    return { status: 'done', source: 'issue', stale: Boolean(issue.board) && mapped !== 'done' };
  }
  if (!boardData) return { status: issue.milestone ? 'todo' : 'backlog', source: 'issue', stale: false };
  if (!mapped) return { status: 'backlog', source: issue.board ? 'board' : 'issue', stale: false };
  // Under CONTRIBUTING.md the tester closes the issue once the tests pass, so
  // "Done" on the board with the issue still open means it waits for that check.
  if (mapped === 'done') return { status: 'review', source: 'board', stale: true };
  return { status: mapped, source: 'board', stale: false };
}

/**
 * @param data   data/dashboard.json
 * @param config config/project.json
 * @param today  day key in the project's time zone
 */
export function normalizeTasks(data, config, today) {
  const tz = config.project.timezone;
  const statusMap = config.github?.projectV2?.statusMap ?? {};
  const boardData = data.collection?.sources?.projectV2 === 'ok';
  const weekByMilestone = new Map((config.weeks ?? []).map((w) => [w.milestone, w]));
  const weekByNumber = new Map((config.weeks ?? []).map((w) => [w.number, w]));
  const milestones = new Map((data.milestones ?? []).map((m) => [m.number, m]));
  const severities = config.labels?.severity ?? [];
  const blockedLabels = new Set(config.labels?.blocked ?? []);

  return (data.issues ?? []).map((issue) => {
    const { status, source, stale } = statusOf(issue, boardData, statusMap);

    let week = null;
    let weekSource = null;
    if (issue.milestone !== null && weekByMilestone.has(issue.milestone)) {
      week = weekByMilestone.get(issue.milestone).number;
      weekSource = 'milestone';
    } else if (issue.board?.week !== null && issue.board?.week !== undefined && weekByNumber.has(issue.board.week)) {
      week = issue.board.week;
      weekSource = 'board';
    }
    const weekConfig = week === null ? null : weekByNumber.get(week);
    const milestone = issue.milestone === null ? null : milestones.get(issue.milestone) ?? null;

    let plannedStart = issue.board?.start ?? null;
    let plannedDue = issue.board?.due ?? null;
    let dueSource = plannedDue ? 'board' : null;
    if (!plannedStart && weekConfig) plannedStart = weekConfig.start;
    if (!plannedDue && weekConfig) {
      plannedDue = weekConfig.end;
      dueSource = 'week';
    }
    if (!plannedDue && milestone?.dueOn) {
      plannedDue = dayKey(milestone.dueOn, 'UTC');
      dueSource = 'milestone';
    }

    const labels = issue.labels ?? [];
    return {
      ...issue,
      status,
      statusSource: source,
      staleBoard: stale,
      week,
      weekSource,
      milestoneTitle: milestone?.title ?? null,
      plannedStart,
      plannedDue,
      dueSource,
      closedDay: dayKey(issue.closedAt, tz),
      overdue: !isFinished({ status }) && Boolean(plannedDue) && plannedDue < today,
      severity: severities.find((s) => labels.includes(s)) ?? null,
      blocked: labels.some((l) => blockedLabels.has(l)),
      hours: issue.board?.hours ?? null,
      pulls: (data.pulls ?? []).filter((p) => (p.refs ?? []).includes(issue.number)),
    };
  });
}
