// Loads the config and the collected data, builds the model once, and
// renders the view named in the URL hash (#overview, #weekly/7, …).

import { buildModel } from './core/model.js';
import { formatInstant } from './core/dates.js';
import { destroyCharts } from './ui/charts.js';
import { esc, healthBadge, link } from './ui/dom.js';
import * as overview from './views/overview.js';
import * as weekly from './views/weekly.js';
import * as burndown from './views/burndown.js';
import * as kanban from './views/kanban.js';
import * as roadmap from './views/roadmap.js';
import * as team from './views/team.js';
import * as evidence from './views/evidence.js';
import * as reports from './views/reports.js';

const VIEWS = { overview, weekly, burndown, kanban, roadmap, team, evidence, reports };
const view = document.getElementById('view');
let model = null;

async function fetchJson(path, { optional = false } = {}) {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) {
    if (optional && response.status === 404) return null;
    throw new Error(`${path}: HTTP ${response.status}`);
  }
  return response.json();
}

function parseHash() {
  const [name, ...rest] = location.hash.replace(/^#/, '').split('/');
  return { name: VIEWS[name] ? name : 'overview', params: rest.map(decodeURIComponent) };
}

function render() {
  if (!model) return;
  const { name, params } = parseHash();
  for (const a of document.querySelectorAll('.nav-inner a')) {
    if (a.getAttribute('href') === `#${name}`) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  destroyCharts();
  try {
    const result = VIEWS[name].render(model, params);
    view.innerHTML = result.html;
    result.mount?.(view);
    document.title = `${VIEWS[name].title} · ${model.config.project.shortName ?? model.config.project.name}`;
  } catch (error) {
    console.error(error);
    view.innerHTML = `<div class="banner error" role="alert">This section could not be drawn: ${esc(error.message)}</div>`;
  }
}

function renderChrome() {
  const { config, data, freshness, overview: o } = model;
  document.getElementById('project-name').textContent = config.project.name;
  document.getElementById('header-health').innerHTML = `<a href="#burndown" title="How health is worked out">${healthBadge(o.health)}</a>`;
  const repo = document.getElementById('repo-link');
  repo.href = data.repository?.url ?? `https://github.com/${config.project.repository}`;
  repo.hidden = false;
  document.getElementById('last-updated').innerHTML = `Data collected <time datetime="${esc(freshness.generatedAt)}">${esc(formatInstant(freshness.generatedAt, config.project.timezone))}</time>`;

  const banners = [];
  if (freshness.stale) {
    banners.push(`<div class="banner warning" role="status"><span aria-hidden="true">!</span><div><strong>The data may be out of date.</strong> It was last collected ${freshness.ageHours === null ? 'at an unknown time' : `${Math.round(freshness.ageHours)} hours ago`}; the workflow normally refreshes it every 6 hours.</div></div>`);
  }
  if (freshness.errors.length) {
    banners.push(`<div class="banner ${freshness.status === 'ok' ? 'note' : 'warning'}" role="status"><span aria-hidden="true">i</span><div><strong>Some sources were not read in the last collection.</strong> Figures that depend on them are marked. <details><summary>Details</summary><ul class="small">${freshness.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></details></div></div>`);
  }
  document.getElementById('banners').innerHTML = banners.join('');
  const notices = document.querySelector('.app-footer a[href="THIRD_PARTY_NOTICES.md"]');
  if (notices && data.repository?.url) notices.href = `${data.repository.url}/blob/${data.repository.defaultBranch ?? 'main'}/project-dashboard/THIRD_PARTY_NOTICES.md`;
  document.getElementById('footer-sources').innerHTML = `Data is collected from ${link(repo.href, config.project.repository)} by a scheduled GitHub Actions workflow and published as static files; this page never writes to GitHub. Times are shown in ${esc(config.project.timezone)}.`;
}

function setupTheme() {
  const button = document.getElementById('theme-toggle');
  const label = document.getElementById('theme-label');
  const current = () => document.documentElement.dataset.theme
    ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const show = () => { label.textContent = current() === 'dark' ? 'Light theme' : 'Dark theme'; };
  button.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('dashboard-theme', next); } catch (_) { /* not remembered */ }
    show();
    render();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { show(); render(); });
  show();
}

async function start() {
  setupTheme();
  try {
    const [config, data, history] = await Promise.all([
      fetchJson('config/project.json'),
      fetchJson('data/dashboard.json'),
      fetchJson('data/history.json', { optional: true }),
    ]);
    model = buildModel({ config, data, history: history ?? [], now: new Date() });
    window.addEventListener('hashchange', () => { render(); document.getElementById('main').focus({ preventScroll: true }); });
    // Views re-render in place (filters) without moving focus.
    window.addEventListener('dashboard:render', render);
    renderChrome();
    render();
  } catch (error) {
    console.error(error);
    document.getElementById('project-name').textContent = 'Project progress';
    view.innerHTML = `<div class="state" role="alert"><p><strong>The project data could not be loaded.</strong></p><p class="small">${esc(error.message)}</p><p class="small">If the dashboard was just set up, the first collection may still be running.</p></div>`;
  }
}

start();
