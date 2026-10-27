import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeTasks } from '../js/core/tasks.js';
import { completion, currentWeek, weekStats, memberStats } from '../js/core/progress.js';
import { reconstruct, idealLine, observedSeries, health } from '../js/core/burndown.js';
import { buildModel } from '../js/core/model.js';
import { buildWeeklyReport, reportToMarkdown } from '../js/core/report.js';
import { makeConfig, makeData, issue } from './fixtures.mjs';

const TZ = 'Asia/Ho_Chi_Minh';
const closed = (at, reason = 'completed') => ({ state: 'closed', stateReason: reason, closedAt: at });
const ev = (n, type, at, milestone = null) => ({ issue: n, type, at, milestone });

function tasksOf(issues, opts) {
  const data = makeData(issues, opts);
  return { data, tasks: normalizeTasks(data, makeConfig(), '2026-10-28') };
}

test('task completion is done over tasks in scope; dropped tasks leave the denominator', () => {
  const { tasks } = tasksOf([
    issue(1, closed('2026-10-20T00:00:00Z')),
    issue(2, closed('2026-10-20T00:00:00Z', 'not_planned')),
    issue(3),
    issue(4),
  ]);
  const c = completion(tasks, 'tasks');
  assert.deepEqual([c.num, c.den], [1, 3]);
  assert.equal(c.value.toFixed(3), '0.333');
});

test('completion is null, not 0, when nothing is in scope', () => {
  const c = completion([], 'tasks');
  assert.equal(c.value, null);
  assert.match(c.reason, /no tasks/i);
});

test('hours completion uses planned hours and reports how many tasks have them', () => {
  const { tasks } = tasksOf([
    issue(1, { ...closed('2026-10-20T00:00:00Z'), board: { status: 'Done', hours: 6 } }),
    issue(2, { board: { status: 'Todo', hours: 2 } }),
    issue(3, { board: { status: 'Todo', hours: null } }),
  ]);
  const c = completion(tasks, 'hours');
  assert.deepEqual([c.num, c.den, c.value], [6, 8, 0.75]);
  assert.deepEqual(c.coverage, { withValue: 2, total: 3 });
});

test('currentWeek finds the week that contains today', () => {
  const weeks = makeConfig().weeks;
  assert.equal(currentWeek(weeks, '2026-10-28').week.number, 7);
  assert.equal(currentWeek(weeks, '2026-10-01').state, 'before');
  assert.equal(currentWeek(weeks, '2026-12-01').state, 'after');
});

test('weekStats counts the tasks of one week', () => {
  const { tasks } = tasksOf([
    issue(1, { milestone: 7, ...closed('2026-10-27T00:00:00Z'), assignees: ['bob'] }),
    issue(2, { milestone: 7, assignees: ['alice'] }),
    issue(3, { milestone: 6 }),
  ]);
  const s = weekStats(tasks, makeConfig().weeks[1]);
  assert.deepEqual([s.planned.length, s.done.length, s.open.length], [2, 1, 1]);
  assert.equal(s.completion.value, 0.5);
  assert.deepEqual(s.members, ['alice', 'bob']);
});

test('memberStats counts assigned work and merged pull requests', () => {
  const pulls = [
    { number: 9, author: 'bob', mergedAt: '2026-10-27T00:00:00Z', refs: [1] },
    { number: 10, author: 'bob', mergedAt: null, refs: [] },
  ];
  const { tasks, data } = tasksOf([issue(1, { assignees: ['bob'], ...closed('2026-10-27T00:00:00Z') }), issue(2, { assignees: ['bob'] })], { pulls });
  const m = memberStats(tasks, data.pulls, { login: 'bob' });
  assert.deepEqual([m.assigned.length, m.done.length, m.open.length, m.mergedPulls.length], [2, 1, 1, 1]);
});

test('reconstruct counts done work per day in the project time zone', () => {
  const { tasks, data } = tasksOf([issue(1, closed('2026-10-27T18:00:00Z')), issue(2)], {
    events: [ev(1, 'milestoned', '2026-10-19T01:00:00Z', 'Week 07'), ev(2, 'milestoned', '2026-10-19T01:00:00Z', 'Week 07'), ev(1, 'closed', '2026-10-27T18:00:00Z')],
  });
  const s = reconstruct({ tasks, events: data.events, milestones: data.milestones, from: '2026-10-26', to: '2026-10-28', timeZone: TZ, milestoneNumbers: [7] });
  // 18:00 UTC on the 27th is the 28th in Ho Chi Minh City.
  assert.deepEqual(s.map((p) => [p.date, p.scope, p.done, p.remaining]), [
    ['2026-10-26', 2, 0, 2],
    ['2026-10-27', 2, 0, 2],
    ['2026-10-28', 2, 1, 1],
  ]);
});

test('moving an issue between weeks changes scope, not done work', () => {
  const { tasks, data } = tasksOf([issue(1, { milestone: 7 })], {
    events: [ev(1, 'milestoned', '2026-10-19T01:00:00Z', 'Week 06'), ev(1, 'demilestoned', '2026-10-26T03:00:00Z', 'Week 06'), ev(1, 'milestoned', '2026-10-26T03:00:00Z', 'Week 07')],
  });
  const args = { tasks, events: data.events, milestones: data.milestones, from: '2026-10-25', to: '2026-10-26', timeZone: TZ };
  const w6 = reconstruct({ ...args, milestoneNumbers: [6] });
  const w7 = reconstruct({ ...args, milestoneNumbers: [7] });
  assert.deepEqual(w6.map((p) => [p.scope, p.done]), [[1, 0], [0, 0]]);
  assert.deepEqual(w7.map((p) => [p.scope, p.done]), [[0, 0], [1, 0]]);
});

test('a reopened issue stops counting as done', () => {
  const { tasks, data } = tasksOf([issue(1)], {
    events: [ev(1, 'milestoned', '2026-10-19T01:00:00Z', 'Week 07'), ev(1, 'closed', '2026-10-26T03:00:00Z'), ev(1, 'reopened', '2026-10-27T03:00:00Z')],
  });
  const s = reconstruct({ tasks, events: data.events, milestones: data.milestones, from: '2026-10-26', to: '2026-10-27', timeZone: TZ, milestoneNumbers: null });
  assert.deepEqual(s.map((p) => p.done), [1, 0]);
});

test('closing as not planned removes the task from scope', () => {
  const { tasks, data } = tasksOf([issue(1, closed('2026-10-27T03:00:00Z', 'not_planned')), issue(2)], {
    events: [ev(1, 'closed', '2026-10-27T03:00:00Z')],
  });
  const s = reconstruct({ tasks, events: data.events, milestones: data.milestones, from: '2026-10-26', to: '2026-10-27', timeZone: TZ, milestoneNumbers: null });
  assert.deepEqual(s.map((p) => [p.scope, p.done]), [[2, 0], [1, 0]]);
});

test('a task appears in scope only from the day it was created', () => {
  const { tasks, data } = tasksOf([issue(1), issue(2, { createdAt: '2026-10-27T03:00:00Z' })]);
  const s = reconstruct({ tasks, events: data.events, milestones: data.milestones, from: '2026-10-26', to: '2026-10-27', timeZone: TZ, milestoneNumbers: null });
  assert.deepEqual(s.map((p) => p.scope), [1, 2]);
});

test('without a closed event the issue closedAt is used', () => {
  const { tasks, data } = tasksOf([issue(1, closed('2026-10-27T03:00:00Z'))]);
  const s = reconstruct({ tasks, events: [], milestones: data.milestones, from: '2026-10-26', to: '2026-10-27', timeZone: TZ, milestoneNumbers: [7] });
  assert.deepEqual(s.map((p) => p.done), [0, 1]);
});

test('the ideal line runs from the latest scope to zero', () => {
  const series = [{ date: '2026-10-26', scope: 3 }, { date: '2026-10-27', scope: 4 }];
  const line = idealLine(series, '2026-10-26', '2026-11-01');
  assert.equal(line.length, 7);
  assert.equal(line[0].value, 4);
  assert.equal(line[3].value, 2);
  assert.equal(line[6].value, 0);
});

test('observedSeries reads snapshot totals and leaves missed days out', () => {
  const history = [
    { date: '2026-10-28', observedAt: '2026-10-28T01:00:00Z', totals: { scope: 10, done: 4, remaining: 6 }, weeks: { 7: { scope: 3, done: 1, remaining: 2 } } },
    { date: '2026-10-30', observedAt: '2026-10-30T01:00:00Z', totals: { scope: 10, done: 5, remaining: 5 }, weeks: {} },
  ];
  assert.deepEqual(observedSeries(history).map((p) => [p.date, p.remaining]), [['2026-10-28', 6], ['2026-10-30', 5]]);
  assert.deepEqual(observedSeries(history, 7).map((p) => p.remaining), [2]);
});

function healthOf(remaining, { scope = 100, today = '2026-10-29', points = 5, deadline = '2026-11-01' } = {}) {
  const series = Array.from({ length: points }, (_, i) => ({ date: `2026-10-${25 + i}`, scope, done: scope - remaining, remaining }));
  const ideal = idealLine(series, '2026-10-26', '2026-11-01'); // on the 29th, ideal remaining = 50 % of scope
  return health({ series, ideal, today, finalDeadline: deadline, config: makeConfig() });
}

test('health compares remaining work with the ideal line using the configured gaps', () => {
  assert.equal(healthOf(50).status, 'on_track');
  assert.equal(healthOf(40).status, 'on_track'); // ahead of plan
  assert.equal(healthOf(60).status, 'at_risk');
  assert.equal(healthOf(80).status, 'delayed');
});

test('health is insufficient without enough data, completed when all is done after the deadline', () => {
  assert.equal(healthOf(50, { points: 2 }).status, 'insufficient');
  assert.equal(healthOf(0, { scope: 0 }).status, 'insufficient');
  assert.equal(healthOf(0, { today: '2026-11-02', deadline: '2026-10-29' }).status, 'completed');
  assert.equal(healthOf(2, { today: '2026-11-02', deadline: '2026-10-29' }).status, 'delayed');
});

test('buildModel puts the pieces together from one task set', () => {
  const config = makeConfig();
  const data = makeData([issue(1, { milestone: 7, ...closed('2026-10-27T03:00:00Z') }), issue(2, { milestone: 7 }), issue(3, { milestone: 6 })], {
    events: [ev(1, 'milestoned', '2026-10-19T01:00:00Z', 'Week 07'), ev(2, 'milestoned', '2026-10-19T01:00:00Z', 'Week 07'), ev(3, 'milestoned', '2026-10-19T01:00:00Z', 'Week 06'), ev(1, 'closed', '2026-10-27T03:00:00Z')],
  });
  const model = buildModel({ config, data, history: [], now: new Date('2026-10-28T05:00:00Z') });
  assert.equal(model.today, '2026-10-28');
  assert.equal(model.current.week.number, 7);
  assert.deepEqual([model.overview.total, model.overview.done, model.overview.overdue], [3, 1, 1]);
  assert.equal(model.burndown.project.series.at(-1).remaining, 2);
  assert.equal(model.weeks.find((w) => w.number === 7).stats.done.length, 1);
  assert.equal(model.freshness.stale, false);
});

test('a past week is Completed once all its tasks are done, and says if that was late', () => {
  const config = makeConfig();
  const data = makeData([issue(1, { milestone: 6, ...closed('2026-10-27T03:00:00Z') })], {
    events: [ev(1, 'milestoned', '2026-10-19T01:00:00Z', 'Week 06'), ev(1, 'closed', '2026-10-27T03:00:00Z')],
  });
  const model = buildModel({ config, data, history: [], now: new Date('2026-10-28T05:00:00Z') });
  const w6 = model.weeks.find((w) => w.number === 6);
  assert.equal(w6.burndown.health.status, 'completed');
  assert.match(w6.burndown.health.reason, /still open when the week ended/);
});

test('week documents get a repository link and an existence check', () => {
  const config = makeConfig({ weeks: [{ number: 7, start: '2026-10-26', end: '2026-11-01', milestone: 7, documents: [{ label: 'Report', path: 'docs/a.md' }, { label: 'Gone', path: 'docs/b.md' }] }] });
  const data = makeData([]);
  data.collection.sources.documents = 'ok';
  data.documents = [{ path: 'docs/a.md', url: 'x' }];
  const [w] = buildModel({ config, data, now: new Date('2026-10-28T05:00:00Z') }).weeks;
  assert.deepEqual(w.documents.map((d) => [d.url, d.exists]), [['https://github.com/owner/repo/blob/main/docs/a.md', true], ['https://github.com/owner/repo/blob/main/docs/b.md', false]]);
});

test('the weekly report renders as Markdown with escaped table cells', () => {
  const config = makeConfig();
  const data = makeData([issue(1, { milestone: 7, title: 'Pipe | in title', ...closed('2026-10-27T03:00:00Z') }), issue(2, { milestone: 7 })]);
  const model = buildModel({ config, data, history: [], now: new Date('2026-10-28T05:00:00Z') });
  const report = buildWeeklyReport(model, 7);
  assert.equal(report.completed.length, 1);
  assert.equal(report.incomplete.length, 1);
  const md = reportToMarkdown(report);
  assert.match(md, /^# Weekly report — Week 7/m);
  assert.match(md, /Pipe \\\| in title/);
  assert.match(md, /Data collected/);
});
