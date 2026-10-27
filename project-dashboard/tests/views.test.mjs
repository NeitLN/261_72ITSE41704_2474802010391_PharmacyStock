// Smoke test: every view loads and renders its HTML from a small model,
// without a browser. Catches syntax errors and missing fields in the views.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildModel } from '../js/core/model.js';
import { makeConfig, makeData, issue } from './fixtures.mjs';

const VIEWS = ['overview', 'weekly', 'burndown', 'kanban', 'roadmap', 'team', 'evidence', 'reports'];

function model({ events = 'ok' } = {}) {
  const data = makeData([
    issue(1, { milestone: 6, state: 'closed', stateReason: 'completed', closedAt: '2026-10-22T03:00:00Z', title: '<script>alert(1)</script>' }),
    issue(2, { milestone: 7, labels: ['S2', 'blocked'], assignees: ['bob'] }),
    issue(3, { milestone: null, assignees: [] }),
  ], {
    pulls: [{ number: 9, title: 'Fix', url: 'https://github.com/owner/repo/pull/9', author: 'alice', state: 'closed', mergedAt: '2026-10-22T05:00:00Z', refs: [1] }],
    events: [{ issue: 1, type: 'milestoned', at: '2026-10-19T01:00:00Z', milestone: 'Week 06' }, { issue: 1, type: 'closed', at: '2026-10-22T03:00:00Z', milestone: null }],
  });
  data.collection.sources.events = events;
  return buildModel({ config: makeConfig(), data, history: [], now: new Date('2026-10-28T05:00:00Z') });
}

for (const name of VIEWS) {
  test(`the ${name} view renders`, async () => {
    const view = await import(`../js/views/${name}.js`);
    for (const params of [[], ['6'], ['99']]) {
      const { html } = view.render(model(), params);
      assert.ok(html.length > 100);
      assert.doesNotMatch(html, /undefined|NaN|\[object Object\]/);
      assert.doesNotMatch(html, /<script>alert/);
    }
  });
}

test('the burndown view warns when the issue events were not read', async () => {
  const view = await import('../js/views/burndown.js');
  assert.match(view.render(model({ events: 'error' }), []).html, /Issue events could not be read/);
  assert.doesNotMatch(view.render(model(), []).html, /Issue events could not be read/);
});

test('overview attention lists only unfinished risks and prioritizes blockers', async () => {
  const view = await import('../js/views/overview.js');
  const data = makeData([
    issue(1, { title: 'Completed risk', state: 'closed', stateReason: 'completed', labels: ['blocked'] }),
    issue(2, { title: 'Cancelled risk', state: 'closed', stateReason: 'not_planned', labels: ['blocked'] }),
    issue(3, { title: 'Older overdue work', board: { due: '2026-10-20' } }),
    issue(4, { title: '<em>Active blocker</em>', labels: ['blocked'] }),
  ]);
  const result = view.render(buildModel({ config: makeConfig(), data, now: new Date('2026-10-28T05:00:00Z') })).html;
  assert.doesNotMatch(result, /Completed risk|Cancelled risk/);
  assert.match(result, /&lt;em&gt;Active blocker&lt;\/em&gt;/);
  assert.ok(result.indexOf('Active blocker') < result.indexOf('Older overdue work'));
});

test('overview preserves unknown completion and useful empty states', async () => {
  const view = await import('../js/views/overview.js');
  const result = view.render(buildModel({ config: makeConfig(), data: makeData([]), now: new Date('2026-10-28T05:00:00Z') })).html;
  assert.match(result, /Overall completion: no data/);
  assert.match(result, /No overdue or blocked tasks/);
  assert.doesNotMatch(result, /undefined|NaN/);
});

test('overview shows the project facts and health without opening anything', async () => {
  const view = await import('../js/views/overview.js');
  const html = view.render(model(), []).html;
  for (const text of ['Test project', 'Repository', 'Leader', 'Alice', 'Schedule', 'Last updated', 'Project health', 'How health is calculated']) {
    assert.ok(html.includes(text), `missing ${text}`);
  }
  assert.doesNotMatch(html, /About this project/);
});

test('the task board summarises the Done column above the board', async () => {
  const view = await import('../js/views/kanban.js');
  const html = view.render(model(), []).html;
  assert.match(html, /Done: 1 task\(s\)/);
  assert.match(html, /id="kb-col-done"/);
  assert.ok(html.indexOf('done-summary') < html.indexOf('class="board"'));
});
