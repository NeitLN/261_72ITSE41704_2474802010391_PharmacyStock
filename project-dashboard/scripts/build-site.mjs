#!/usr/bin/env node
// Assembles the GitHub Pages artifact:
//
//   <out>/index.html                 redirects to ./project-dashboard/
//   <out>/project-dashboard/…        the dashboard and its data
//
//   node build-site.mjs [--out _site]

import { cp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const { values: args } = parseArgs({ options: { out: { type: 'string', default: '_site' } } });

const PUBLISHED = ['index.html', 'css', 'js', 'vendor', 'config', 'data', 'THIRD_PARTY_NOTICES.md'];

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const out = resolve(args.out);
  const site = join(out, 'project-dashboard');
  await rm(out, { recursive: true, force: true });
  await mkdir(site, { recursive: true });

  if (!(await exists(join(root, 'data', 'dashboard.json')))) {
    throw new Error('data/dashboard.json is missing; run collect.mjs first');
  }
  for (const entry of PUBLISHED) {
    if (await exists(join(root, entry))) await cp(join(root, entry), join(site, entry), { recursive: true });
  }

  await writeFile(
    join(out, 'index.html'),
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=./project-dashboard/">
<title>Project progress</title>
<link rel="canonical" href="./project-dashboard/">
</head>
<body><p><a href="./project-dashboard/">Open the project progress dashboard</a></p></body>
</html>
`,
  );
  await writeFile(join(out, '.nojekyll'), '');
  console.log(`Site written to ${out}`);
}

main().catch((error) => {
  console.error(`Build failed: ${error.message}`);
  process.exitCode = 1;
});
