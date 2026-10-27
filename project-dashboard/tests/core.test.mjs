import { test } from 'node:test';
import assert from 'node:assert/strict';

import { dayKey, addDays, diffDays, dayRange } from '../js/core/dates.mjs';
import { escapeHtml, csvCell, toCsv } from '../js/core/escape.mjs';
import { normalizeTasks } from '../js/core/tasks.mjs';
import { makeConfig, makeData, issue } from './fixtures.mjs';

test('dayKey converts a UTC instant to the project day', () => {
  // 17:30 UTC is 00:30 the next day in Ho Chi Minh City (UTC+7).
  assert.equal(dayKey('2026-10-27T17:30:00Z', 'Asia/Ho_Chi_Minh'), '2026-10-28');
  assert.equal(dayKey('2026-10-27T16:59:59Z', 'Asia/Ho_Chi_Minh'), '2026-10-27');
  assert.equal(dayKey('2026-10-27', 'Asia/Ho_Chi_Minh'), '2026-10-27');
  assert.equal(dayKey(null, 'UTC'), null);
});

test('date arithmetic works on day keys', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(diffDays('2026-09-14', '2026-11-22'), 69);
  assert.deepEqual(dayRange('2026-10-30', '2026-11-02'), ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  assert.deepEqual(dayRange('2026-11-02', '2026-10-30'), []);
});

test('escapeHtml neutralises markup', () => {
  assert.equal(escapeHtml('<img src=x onerror="a">&\''), '&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;');
  assert.equal(escapeHtml(null), '');
});

test('csvCell quotes fields and neutralises formulas', () => {
  assert.equal(csvCell('plain'), '"plain"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('=SUM(A1)'), '"\'=SUM(A1)"');
  assert.equal(csvCell('-1'), '"\'-1"');
  assert.equal(csvCell(null), '""');
  assert.equal(toCsv([['a', 'b'], [1, '@x']]), '"a","b"\r\n"1","\'@x"');
});

test('a closed issue is Done even when the board says otherwise', () => {
  const data = makeData([issue(1, { state: 'closed', stateReason: 'completed', closedAt: '2026-10-01T03:00:00Z', board: { status: 'Todo' } })]);
  const [t] = normalizeTasks(data, makeConfig(), '2026-10-28');
  assert.equal(t.status, 'done');
  assert.equal(t.staleBoard, true);
});

test('an issue closed as not planned is dropped from scope', () => {
  const data = makeData([issue(1, { state: 'closed', stateReason: 'not_planned', board: { status: 'Done' } })]);
  const [t] = normalizeTasks(data, makeConfig(), '2026-10-28');
  assert.equal(t.status, 'dropped');
  assert.equal(t.staleBoard, false);
});

test('an open issue takes its column from the board', () => {
  const data = makeData([
    issue(1, { board: { status: 'In Progress' } }),
    issue(2, { board: { status: 'In review' } }),
    issue(3, { board: { status: 'Todo' } }),
    issue(4, { board: null }),
    issue(5, { board: { status: null } }),
  ]);
  const statuses = normalizeTasks(data, makeConfig(), '2026-10-28').map((t) => t.status);
  assert.deepEqual(statuses, ['in_progress', 'review', 'todo', 'backlog', 'backlog']);
});

test('an open issue the board calls Done waits for verification in Review', () => {
  const data = makeData([issue(1, { board: { status: 'Done' } })]);
  const [t] = normalizeTasks(data, makeConfig(), '2026-10-28');
  assert.equal(t.status, 'review');
  assert.equal(t.staleBoard, true);
});

test('without board data an open issue is Todo when it has a milestone, else Backlog', () => {
  const data = makeData([issue(1, { milestone: 7 }), issue(2, { milestone: null })], { projectV2: 'skipped' });
  const statuses = normalizeTasks(data, makeConfig(), '2026-10-28').map((t) => [t.status, t.statusSource]);
  assert.deepEqual(statuses, [['todo', 'issue'], ['backlog', 'issue']]);
});

test('week comes from the milestone, then from the board Week field', () => {
  const data = makeData([
    issue(1, { milestone: 7, board: { status: 'Todo', week: 6 } }),
    issue(2, { milestone: null, board: { status: 'Todo', week: 6 } }),
    issue(3, { milestone: null, board: null }),
  ]);
  const weeks = normalizeTasks(data, makeConfig(), '2026-10-28').map((t) => [t.week, t.weekSource]);
  assert.deepEqual(weeks, [[7, 'milestone'], [6, 'board'], [null, null]]);
});

test('planned dates come from the board, else from the week', () => {
  const data = makeData([
    issue(1, { milestone: 7, board: { status: 'Todo', start: '2026-10-27', due: '2026-10-29' } }),
    issue(2, { milestone: 7, board: null }),
  ]);
  const [a, b] = normalizeTasks(data, makeConfig(), '2026-10-28');
  assert.deepEqual([a.plannedStart, a.plannedDue, a.dueSource], ['2026-10-27', '2026-10-29', 'board']);
  assert.deepEqual([b.plannedStart, b.plannedDue, b.dueSource], ['2026-10-26', '2026-11-01', 'week']);
});

test('an open task past its due date is overdue; a done one is not', () => {
  const data = makeData([
    issue(1, { milestone: 6, board: { status: 'Todo' } }),
    issue(2, { milestone: 6, state: 'closed', stateReason: 'completed', board: { status: 'Done' } }),
    issue(3, { milestone: 7, board: { status: 'Todo' } }),
  ]);
  const overdue = normalizeTasks(data, makeConfig(), '2026-10-28').map((t) => t.overdue);
  assert.deepEqual(overdue, [true, false, false]);
});

test('severity and blocked come from configured labels', () => {
  const data = makeData([issue(1, { labels: ['bug', 'S2', 'blocked'] }), issue(2, { labels: ['docs'] })]);
  const [a, b] = normalizeTasks(data, makeConfig(), '2026-10-28');
  assert.equal(a.severity, 'S2');
  assert.equal(a.blocked, true);
  assert.equal(b.severity, null);
  assert.equal(b.blocked, false);
});

test('linked pull requests are those whose body references the issue', () => {
  const data = makeData([issue(5)], {
    pulls: [
      { number: 50, title: 'Fix', url: 'u', author: 'NeitLN', state: 'closed', mergedAt: '2026-10-20T00:00:00Z', refs: [5] },
      { number: 51, title: 'Other', url: 'u', author: 'NeitLN', state: 'open', mergedAt: null, refs: [6] },
    ],
  });
  const [t] = normalizeTasks(data, makeConfig(), '2026-10-28');
  assert.deepEqual(t.pulls.map((p) => p.number), [50]);
});
