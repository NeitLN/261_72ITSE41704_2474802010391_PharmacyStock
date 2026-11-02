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
