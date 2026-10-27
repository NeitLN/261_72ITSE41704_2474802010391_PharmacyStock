import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from '../scripts/lib/github.mjs';
import { boardValues, issueRefs, normalizeEvents, normalizeIssue, summarize } from '../scripts/lib/normalize.mjs';
import { makeSnapshot } from '../scripts/snapshot.mjs';
import { makeConfig, makeData, issue } from './fixtures.mjs';

test('issueRefs reads keyword references only', () => {
  assert.deepEqual(issueRefs('Refs #12\nCloses #3, #4 and #5'), [3, 4, 5, 12]);
  assert.deepEqual(issueRefs('Fixes: #7'), [7]);
  assert.deepEqual(issueRefs('Waits for #140 to merge first'), []);
  assert.deepEqual(issueRefs(null), []);
});

test('summarize strips markdown and skipped lines and cuts to length', () => {
  const body = '**Owner:** @a\n<!-- hidden -->\n### Definition of done\n- [ ] Ship [the page](http://x) `now`\n```\ncode\n```';
  assert.equal(summarize(body, { skipPatterns: ['^\\*\\*Owner:'] }), 'Definition of done Ship the page now');
  assert.equal(summarize('a'.repeat(300), { maxLength: 10 }), `${'a'.repeat(9)}…`);
});

test('normalizeIssue keeps only the published fields', () => {
  const raw = { number: 1, title: 't', html_url: 'u', body: 'b', state: 'closed', state_reason: 'completed', created_at: 'c', closed_at: 'd', user: { login: 'x', email: 'secret' }, labels: [{ name: 'bug' }], assignees: [{ login: 'y' }], milestone: { number: 3 }, reactions: {} };
  const n = normalizeIssue(raw, {});
  assert.deepEqual(Object.keys(n).sort(), ['assignees', 'author', 'board', 'closedAt', 'createdAt', 'labels', 'milestone', 'number', 'state', 'stateReason', 'summary', 'title', 'url']);
  assert.deepEqual([n.labels, n.assignees, n.milestone], [['bug'], ['y'], 3]);
});

test('normalizeEvents keeps state and milestone events of issues, not of pull requests', () => {
  const raw = [
    { event: 'closed', created_at: '2026-10-02T00:00:00Z', issue: { number: 1 } },
    { event: 'labeled', created_at: '2026-10-01T00:00:00Z', issue: { number: 1 } },
    { event: 'closed', created_at: '2026-10-01T00:00:00Z', issue: { number: 2, pull_request: {} } },
    { event: 'milestoned', created_at: '2026-10-01T00:00:00Z', issue: { number: 1 }, milestone: { title: 'Week 01' } },
  ];
  assert.deepEqual(normalizeEvents(raw), [
    { issue: 1, type: 'milestoned', at: '2026-10-01T00:00:00Z', milestone: 'Week 01' },
    { issue: 1, type: 'closed', at: '2026-10-02T00:00:00Z', milestone: null },
  ]);
});

test('boardValues maps configured field names, and a missing field is null', () => {
  const item = {
    fieldValues: {
      nodes: [
        { name: 'In review', field: { name: 'Status' } },
        { date: '2026-10-27', field: { name: 'Start' } },
        { number: 0, field: { name: 'Week' } },
        {},
      ],
    },
  };
  assert.deepEqual(boardValues(item, { status: 'Status', start: 'Start', due: 'Due', week: 'Week', hours: 'Hours' }), {
    status: 'In review', start: '2026-10-27', due: null, week: 0, hours: null,
  });
});

function fakeFetch(pages) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const next = pages.shift();
    return {
      ok: next.status === 200,
      status: next.status,
      headers: new Map(Object.entries(next.headers ?? {})),
      json: async () => next.body,
      text: async () => JSON.stringify(next.body),
    };
  };
  return { fetchImpl, calls };
}

test('paginate follows Link headers to the last page', async () => {
  const { fetchImpl, calls } = fakeFetch([
    { status: 200, body: [1, 2], headers: { link: '<https://api.github.com/x?page=2>; rel="next"' } },
    { status: 200, body: [3] },
  ]);
  const gh = createClient('t', { fetchImpl });
  assert.deepEqual(await gh.paginate('/x'), [1, 2, 3]);
  assert.equal(calls.length, 2);
  assert.match(calls[0], /per_page=100/);
});

test('requests retry after a server error and fail on a client error', async () => {
  const { fetchImpl } = fakeFetch([
    { status: 502, body: {}, headers: { 'retry-after': '0.001' } },
    { status: 200, body: { ok: true } },
    { status: 404, body: { message: 'Not Found' } },
  ]);
  const gh = createClient('t', { fetchImpl });
  assert.deepEqual(await gh.get('/a'), { ok: true });
  await assert.rejects(gh.get('/b'), /GitHub 404/);
});

test('a snapshot records totals per project and per week milestone', () => {
  const data = makeData([
    issue(1, { milestone: 7, state: 'closed', stateReason: 'completed' }),
    issue(2, { milestone: 7 }),
    issue(3, { milestone: 6, state: 'closed', stateReason: 'not_planned' }),
  ]);
  const snap = makeSnapshot(makeConfig(), data, new Date('2026-10-28T05:00:00Z'));
  assert.equal(snap.date, '2026-10-28');
  assert.deepEqual(snap.totals, { scope: 2, done: 1, remaining: 1, dropped: 1 });
  assert.deepEqual(snap.weeks[7], { scope: 2, done: 1, remaining: 1, dropped: 0 });
  assert.deepEqual(snap.weeks[6], { scope: 0, done: 0, remaining: 0, dropped: 1 });
  assert.equal(snap.tasks.length, 3);
});

test('snapshot.mjs keeps the first snapshot of a day and rebuilds history', async () => {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const run = promisify(execFile);
  const dir = await mkdtemp(join(tmpdir(), 'dash-'));
  const store = join(dir, 'store');
  await mkdir(join(store, 'snapshots'), { recursive: true });
  await writeFile(join(store, 'snapshots', '2026-01-01.json'), JSON.stringify({ date: '2026-01-01', totals: { scope: 1 }, tasks: [] }));
  await writeFile(join(dir, 'config.json'), JSON.stringify(makeConfig()));
  await writeFile(join(dir, 'data.json'), JSON.stringify(makeData([issue(1)])));
  const script = fileURLToPath(new URL('../scripts/snapshot.mjs', import.meta.url));
  const args = [script, '--config', join(dir, 'config.json'), '--data', join(dir, 'data.json'), '--store', store, '--site-data', join(dir, 'site')];
  await run(process.execPath, args);
  const { stdout } = await run(process.execPath, args);
  assert.match(stdout, /already exists/);
  const files = await readdir(join(store, 'snapshots'));
  assert.equal(files.length, 2);
  const history = JSON.parse(await readFile(join(dir, 'site', 'history.json'), 'utf8'));
  assert.equal(history.length, 2);
  assert.equal(history[0].date, '2026-01-01');
  assert.equal('tasks' in history[1], false);
});
