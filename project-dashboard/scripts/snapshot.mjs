#!/usr/bin/env node
// Records today's snapshot in the history store (a checkout of the
// dashboard-data branch) and rebuilds history.json from every snapshot.
//
//   node snapshot.mjs --data data/dashboard.json --store <dir> [--config path] [--site-data dir]
//
// A snapshot is written once per UTC day and never overwritten: the first
// successful collection of the day is the observation for that day. Days
// with no collection simply have no file.

import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { buildModel } from '../js/core/model.mjs';
import { inScope } from '../js/core/tasks.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const { values: args } = parseArgs({
  options: {
    data: { type: 'string', default: join(here, '..', 'data', 'dashboard.json') },
    config: { type: 'string', default: join(here, '..', 'config', 'project.json') },
    store: { type: 'string' },
    'site-data': { type: 'string' },
  },
});

function totalsOf(tasks) {
  const scoped = tasks.filter(inScope);
  const done = scoped.filter((t) => t.status === 'done').length;
  return { scope: scoped.length, done, remaining: scoped.length - done, dropped: tasks.length - scoped.length };
}

export function makeSnapshot(config, data, now = new Date()) {
  const model = buildModel({ config, data, history: [], now });
  const weeks = {};
  for (const w of config.weeks ?? []) {
    // By milestone, the same rule the reconstructed weekly burndown uses.
    weeks[w.number] = totalsOf(model.tasks.filter((t) => t.milestone === w.milestone));
  }
  return {
    schemaVersion: 1,
    date: now.toISOString().slice(0, 10),
    observedAt: now.toISOString(),
    dataGeneratedAt: data.generatedAt,
    source: data.collection?.sources?.projectV2 === 'ok' ? 'issues+projects-v2' : 'issues',
    collectionStatus: data.collection?.status ?? 'unknown',
    errors: data.collection?.errors ?? [],
    totals: totalsOf(model.tasks),
    weeks,
    tasks: model.tasks.map((t) => ({
      number: t.number,
      milestone: t.milestone,
      state: t.state,
      stateReason: t.stateReason,
      status: t.status,
      boardStatus: t.board?.status ?? null,
      assignees: t.assignees,
    })),
  };
}

async function main() {
  if (!args.store) throw new Error('--store is required');
  const config = JSON.parse(await readFile(args.config, 'utf8'));
  const data = JSON.parse(await readFile(args.data, 'utf8'));
  const snapshot = makeSnapshot(config, data);

  const dir = join(args.store, 'snapshots');
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${snapshot.date}.json`);
  try {
    await writeFile(file, `${JSON.stringify(snapshot, null, 1)}\n`, { flag: 'wx' });
    console.log(`Recorded snapshot ${snapshot.date}`);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log(`Snapshot ${snapshot.date} already exists; kept the first one of the day`);
  }

  const history = [];
  for (const name of (await readdir(dir)).filter((n) => /^\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort()) {
    const { tasks, ...summary } = JSON.parse(await readFile(join(dir, name), 'utf8'));
    history.push(summary);
  }
  const historyFile = join(args.store, 'history.json');
  await writeFile(historyFile, `${JSON.stringify(history, null, 1)}\n`);
  if (args['site-data']) {
    await mkdir(args['site-data'], { recursive: true });
    await copyFile(historyFile, join(args['site-data'], 'history.json'));
  }
  console.log(`history.json: ${history.length} snapshot(s)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(`Snapshot failed: ${error.message}`);
    process.exitCode = 1;
  });
}
