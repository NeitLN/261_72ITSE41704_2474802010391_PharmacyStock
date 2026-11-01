// TC-29 measurements (NFR-01, NFR-02, NFR-13; #65) against a running API that
// serves the database filled by `npm run perf:load`:
//
//   1. stock lookup search, first page of 20      NFR-01  ≤ 1 s
//   2. stock movement report for the last month   NFR-02  ≤ 3 s
//   3. a 3-line over-the-counter sale, confirmed  NFR-13  ≤ 2 s (server part)
//
// Each is run once to warm up and then 10 times; the median decides.
// The machine, the versions and the data volume are printed with the result,
// because a timing means nothing without them. `--save` also writes the table
// to tests/manual/evidence/tc29-<date>.md for the run log.
//
//   npm run perf:measure                    (API at http://localhost:3000/api)
//   API_URL=http://host:3000/api npm run perf:measure -- --save
//
// Sign-in: AUTH_MODE=jwt uses the sample accounts with SEED_PASSWORD from .env;
// AUTH_MODE=dev sends the X-Dev-User header instead.
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../dist/database/data-source-options.js';

const here = dirname(fileURLToPath(import.meta.url));
const fromCommandLine = process.env.DB_NAME;
try {
  process.loadEnvFile(resolve(here, '../.env'));
} catch {
  // No .env file: rely on the environment.
}
process.env.DB_NAME = fromCommandLine ?? 'pharmacy_stock_perf';
const API = (process.env.API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');
const RUNS = 10;

async function headersFor(username) {
  if (process.env.AUTH_MODE === 'dev') return { 'x-dev-user': username };
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: process.env.SEED_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Sign-in as ${username} failed (${res.status}). Is SEED_PASSWORD set, and was the data loaded with it?`);
  const { accessToken } = await res.json();
  return { authorization: `Bearer ${accessToken}` };
}

async function timed(label, send) {
  const started = performance.now();
  const res = await send();
  const ms = performance.now() - started;
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status} ${await res.text()}`);
  await res.arrayBuffer();
  return ms;
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
const monthAgo = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(Date.now() - 30 * 86_400_000));

async function main() {
  const db = new DataSource({ ...dataSourceOptions(), entities: [], migrations: [] });
  await db.initialize();
  const [volume] = await db.query(
    `SELECT (SELECT count(*) FROM medicines)::int AS medicines, (SELECT count(*) FROM batches)::int AS batches,
            (SELECT count(*) FROM stock_movements)::int AS movements, version() AS postgres`,
  );
  const otc = (await db.query(
    `SELECT m.id FROM medicines m JOIN batches b ON b.medicine_id = m.id
      WHERE m.classification = 'otc' AND b."qtySellable" > 10 GROUP BY m.id ORDER BY m.id LIMIT 3`,
  )).map((r) => r.id);
  await db.destroy();
  if (otc.length < 3) throw new Error('Not enough stock for the sale; run `npm run perf:load` first.');

  const manager = await headersFor('manager');
  const cashier = await headersFor('cashier');
  const cases = [
    {
      id: 'NFR-01', what: 'Stock lookup search, first page of 20', limit: 1000,
      send: () => fetch(`${API}/stock?search=Performance&page=1&pageSize=20`, { headers: manager }),
    },
    {
      id: 'NFR-02', what: `Stock movement report ${monthAgo()} – ${today()}`, limit: 3000,
      send: () => fetch(`${API}/reports/stock-movement?from=${monthAgo()}&to=${today()}`, { headers: manager }),
    },
    {
      id: 'NFR-13', what: '3-line over-the-counter sale (API part)', limit: 2000,
      send: () => fetch(`${API}/sales`, {
        method: 'POST',
        headers: { ...cashier, 'content-type': 'application/json' },
        body: JSON.stringify({ requestId: randomUUID(), otcLines: otc.map((medicineId) => ({ medicineId, quantity: 1 })) }),
      }),
    },
  ];

  const rows = [];
  for (const c of cases) {
    await timed(c.id, c.send); // warm-up, not counted
    const times = [];
    for (let i = 0; i < RUNS; i += 1) times.push(await timed(c.id, c.send));
    const m = median(times);
    rows.push({ ...c, median: m, min: Math.min(...times), max: Math.max(...times), pass: m <= c.limit });
  }

  let commit = 'unknown';
  try { commit = execSync('git rev-parse --short HEAD', { cwd: here }).toString().trim(); } catch { /* not a checkout */ }
  const cpu = os.cpus();
  const lines = [
    `# TC-29 performance run, ${today()}`,
    '',
    `- **Machine:** ${os.type()} ${os.release()} · ${cpu[0]?.model.trim()} × ${cpu.length} · ${Math.round(os.totalmem() / 2 ** 30)} GB RAM`,
    `- **Software:** Node ${process.version} · ${volume.postgres.split(',')[0]} · commit \`${commit}\``,
    `- **Data:** ${volume.medicines} medicines, ${volume.batches} batches, ${volume.movements} stock movements (database \`${process.env.DB_NAME}\`)`,
    `- **Method:** one warm-up call, then ${RUNS} timed calls from this machine to \`${API}\`; median decides`,
    '',
    '| NFR | What | Median | Min | Max | Limit | Result |',
    '|---|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.id} | ${r.what} | ${r.median.toFixed(0)} ms | ${r.min.toFixed(0)} ms | ${r.max.toFixed(0)} ms | ${r.limit / 1000} s | ${r.pass ? 'Pass' : 'Fail'} |`),
    '',
    'NFR-13 is measured in the browser, from the click on *Confirm payment* to the receipt; the row above is the API part of it.',
  ];
  const report = lines.join('\n');
  console.log(report);
  if (process.argv.includes('--save')) {
    const file = resolve(here, `../../../tests/manual/evidence/tc29-${today()}.md`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${report}\n`);
    console.log(`\nSaved to ${file}`);
  }
  if (rows.some((r) => !r.pass)) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
