#!/usr/bin/env node
// Collects this repository's issues, pull requests, milestones, issue events,
// releases, workflow runs and (when a token is given) Projects V2 board fields,
// and writes data/dashboard.json.
//
//   GITHUB_TOKEN=… [PROJECT_READ_TOKEN=…] node collect.mjs [--config path] [--out dir]
//
// Issues, milestones and the repository are required: if one of them fails
// the script exits non-zero and writes nothing, so the last good data stays
// published. Every other source may fail on its own; it is then recorded in
// collection.errors and the dashboard says so.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { createClient } from './lib/github.mjs';
import { boardValues, normalizeEvents, normalizeIssue, normalizeMilestone, normalizePull } from './lib/normalize.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const { values: args } = parseArgs({
  options: {
    config: { type: 'string', default: join(here, '..', 'config', 'project.json') },
    out: { type: 'string', default: join(here, '..', 'data') },
  },
});

const PROJECT_ITEMS_QUERY = `
query($login: String!, $number: Int!, $cursor: String) {
  owner: OWNER_KIND(login: $login) {
    projectV2(number: $number) {
      items(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          content { __typename ... on Issue { number repository { nameWithOwner } } }
          fieldValues(first: 30) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2FieldCommon { name } } }
              ... on ProjectV2ItemFieldDateValue { date field { ... on ProjectV2FieldCommon { name } } }
              ... on ProjectV2ItemFieldNumberValue { number field { ... on ProjectV2FieldCommon { name } } }
              ... on ProjectV2ItemFieldTextValue { text field { ... on ProjectV2FieldCommon { name } } }
              ... on ProjectV2ItemFieldIterationValue { title field { ... on ProjectV2FieldCommon { name } } }
            }
          }
        }
      }
    }
  }
}`;

async function readBoard(token, settings, repository) {
  const client = createClient(token);
  const kind = settings.ownerType === 'organization' ? 'organization' : 'user';
  const query = PROJECT_ITEMS_QUERY.replace('OWNER_KIND', kind);
  const board = new Map();
  let cursor = null;
  do {
    const data = await client.graphql(query, { login: settings.owner, number: settings.number, cursor });
    const items = data.owner?.projectV2?.items;
    if (!items) throw new Error(`Project ${settings.owner}/${settings.number} not found or not readable`);
    for (const item of items.nodes) {
      const c = item.content;
      if (c?.__typename !== 'Issue' || c.repository?.nameWithOwner?.toLowerCase() !== repository.toLowerCase()) continue;
      board.set(c.number, boardValues(item, settings.fields ?? {}));
    }
    cursor = items.pageInfo.hasNextPage ? items.pageInfo.endCursor : null;
  } while (cursor);
  return board;
}

async function optional(name, sources, errors, fn) {
  try {
    const value = await fn();
    sources[name] = 'ok';
    return value;
  } catch (error) {
    sources[name] = 'error';
    errors.push(`${name}: ${error.message}`);
    return null;
  }
}

async function main() {
  const config = JSON.parse(await readFile(args.config, 'utf8'));
  const repository = config.project.repository;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is not set');
  const gh = createClient(token);
  const repoPath = `/repos/${repository}`;

  const repo = await gh.get(repoPath);
  if (repo.private && !config.publishing?.allowPrivate) {
    throw new Error(`${repository} is private and publishing.allowPrivate is not true; refusing to publish its data.`);
  }

  const summaryOptions = {
    maxLength: config.publishing?.bodySummaryLength ?? 240,
    skipPatterns: config.publishing?.summarySkipPatterns ?? [],
  };
  const issues = (await gh.paginate(`${repoPath}/issues?state=all`))
    .filter((i) => !i.pull_request)
    .map((i) => normalizeIssue(i, summaryOptions))
    .sort((a, b) => a.number - b.number);
  const milestones = (await gh.paginate(`${repoPath}/milestones?state=all`)).map(normalizeMilestone);

  const sources = { repository: 'ok', issues: 'ok', milestones: 'ok' };
  const errors = [];

  const pulls = await optional('pulls', sources, errors, async () =>
    (await gh.paginate(`${repoPath}/pulls?state=all`)).map(normalizePull).sort((a, b) => a.number - b.number));
  const events = await optional('events', sources, errors, async () => normalizeEvents(await gh.paginate(`${repoPath}/issues/events`)));
  const releases = await optional('releases', sources, errors, async () =>
    (await gh.paginate(`${repoPath}/releases`))
      .filter((r) => !r.draft)
      .map((r) => ({ tag: r.tag_name, name: r.name, url: r.html_url, publishedAt: r.published_at, prerelease: r.prerelease })));

  const evidence = config.evidence ?? {};
  const workflowRuns = await optional('workflowRuns', sources, errors, async () => {
    const wanted = new Set(evidence.workflows ?? []);
    const data = await gh.get(`${repoPath}/actions/runs?branch=${encodeURIComponent(repo.default_branch)}&per_page=50`);
    const latest = new Map();
    for (const run of data.workflow_runs ?? []) {
      if ((wanted.size && !wanted.has(run.name)) || latest.has(run.name) || run.status !== 'completed') continue;
      latest.set(run.name, { name: run.name, event: run.event, conclusion: run.conclusion, url: run.html_url, createdAt: run.created_at, sha: run.head_sha?.slice(0, 7) });
    }
    return [...latest.values()];
  });
  const documents = await optional('documents', sources, errors, async () => {
    const prefixes = evidence.documentPaths ?? [];
    if (!prefixes.length) return [];
    const tree = await gh.get(`${repoPath}/git/trees/${encodeURIComponent(repo.default_branch)}?recursive=1`);
    return (tree.tree ?? [])
      .filter((n) => n.type === 'blob' && prefixes.some((p) => n.path.startsWith(p)))
      .slice(0, 500)
      .map((n) => ({ path: n.path, url: `${repo.html_url}/blob/${repo.default_branch}/${n.path}` }));
  });

  const boardSettings = config.github?.projectV2;
  const projectToken = process.env.PROJECT_READ_TOKEN;
  if (!boardSettings?.enabled) {
    sources.projectV2 = 'disabled';
  } else if (!projectToken) {
    sources.projectV2 = 'skipped';
    errors.push('projectV2: PROJECT_READ_TOKEN is not set; task columns come from issue state only.');
  } else {
    const board = await optional('projectV2', sources, errors, () => readBoard(projectToken, boardSettings, repository));
    if (board) for (const issue of issues) issue.board = board.get(issue.number) ?? null;
  }

  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    repository: {
      fullName: repo.full_name,
      url: repo.html_url,
      description: repo.description,
      visibility: repo.visibility,
      defaultBranch: repo.default_branch,
    },
    collection: { status: errors.length ? 'partial' : 'ok', sources, errors },
    milestones,
    issues,
    pulls: pulls ?? [],
    events: events ?? [],
    releases: releases ?? [],
    workflowRuns: workflowRuns ?? [],
    documents: documents ?? [],
  };

  const outDir = resolve(args.out);
  await mkdir(outDir, { recursive: true });
  const target = join(outDir, 'dashboard.json');
  await writeFile(`${target}.tmp`, `${JSON.stringify(output, null, 1)}\n`);
  await rename(`${target}.tmp`, target);
  console.log(`Wrote ${target}: ${issues.length} issues, ${output.pulls.length} pull requests, ${output.events.length} events; status ${output.collection.status}`);
  for (const e of errors) console.log(`  warning: ${e}`);
}

main().catch((error) => {
  console.error(`Collection failed: ${error.message}`);
  process.exitCode = 1;
});
