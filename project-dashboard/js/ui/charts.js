// Chart.js wrappers. Colours are read from the CSS custom properties at draw
// time, so charts are rebuilt when the theme changes (pattern from
// Hefrock/PM-charts readColors(), MIT). Every chart has a table twin in the view.

const charts = new Set();

function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function theme() {
  return {
    ink: token('--ink'),
    ink2: token('--ink-2'),
    muted: token('--muted'),
    grid: token('--grid'),
    axis: token('--axis'),
    surface: token('--surface'),
    s1: token('--series-1'),
    s2: token('--series-2'),
    s3: token('--series-3'),
    neutral: token('--series-neutral'),
    good: token('--good'),
  };
}

export function destroyCharts() {
  for (const chart of charts) chart.destroy();
  charts.clear();
}

function baseOptions(t, { stacked = false, yTitle = '', indexAxis = 'x' } = {}) {
  const axis = (title) => ({
    stacked,
    grid: { color: t.grid, drawTicks: false },
    border: { color: t.axis },
    ticks: { color: t.muted, padding: 6, maxRotation: 0, autoSkipPadding: 12 },
    title: title ? { display: true, text: title, color: t.ink2 } : { display: false },
  });
  const valueAxis = { ...axis(yTitle), beginAtZero: true, ticks: { color: t.muted, padding: 6, precision: 0 } };
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 300 },
    indexAxis,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', align: 'start', labels: { color: t.ink2, boxWidth: 14, boxHeight: 3, usePointStyle: false } },
      tooltip: { backgroundColor: t.ink, titleColor: t.surface, bodyColor: t.surface, padding: 10, boxPadding: 4 },
    },
    scales: indexAxis === 'y' ? { x: valueAxis, y: axis('') } : { x: axis(''), y: valueAxis },
  };
}

function make(canvas, config) {
  if (!canvas || !window.Chart) return null;
  const chart = new window.Chart(canvas, config);
  charts.add(chart);
  return chart;
}

/**
 * Burndown: remaining work (reconstructed), ideal line, observed snapshots and scope.
 * @param {{labels: string[], remaining: (number|null)[], ideal: number[], observed: (number|null)[], scope: (number|null)[]}} d
 */
export function burndownChart(canvas, d) {
  const t = theme();
  const datasets = [
    { label: 'Remaining (from GitHub events)', data: d.remaining, borderColor: t.s1, backgroundColor: t.s1, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, tension: 0 },
    { label: 'Ideal', data: d.ideal, borderColor: t.neutral, backgroundColor: t.neutral, borderWidth: 2, borderDash: [6, 4], pointRadius: 0, pointHoverRadius: 0 },
    { label: 'Scope', data: d.scope, borderColor: t.s3, backgroundColor: t.s3, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, stepped: true },
  ];
  if (d.observed.some((v) => v !== null)) {
    datasets.push({ label: 'Remaining (daily snapshot)', data: d.observed, borderColor: t.s2, backgroundColor: t.s2, showLine: false, pointRadius: 4, pointHoverRadius: 6, pointBorderColor: t.surface, pointBorderWidth: 2 });
  }
  return make(canvas, { type: 'line', data: { labels: d.labels, datasets }, options: { ...baseOptions(t, { yTitle: 'Tasks' }), spanGaps: false } });
}

/** Cumulative flow with the two states GitHub history records: done and open. */
export function flowChart(canvas, d) {
  const t = theme();
  return make(canvas, {
    type: 'line',
    data: {
      labels: d.labels,
      datasets: [
        { label: 'Done', data: d.done, borderColor: t.s1, backgroundColor: `${t.s1}55`, fill: 'origin', borderWidth: 2, pointRadius: 0 },
        { label: 'Open', data: d.open, borderColor: t.s2, backgroundColor: `${t.s2}40`, fill: '-1', borderWidth: 2, pointRadius: 0 },
      ],
    },
    options: baseOptions(t, { stacked: true, yTitle: 'Tasks' }),
  });
}

/** Done and still-open tasks per category (weeks or members), stacked. */
export function stackedBars(canvas, { labels, done, open, horizontal = false }) {
  const t = theme();
  const opts = baseOptions(t, { stacked: true, yTitle: horizontal ? '' : 'Tasks', indexAxis: horizontal ? 'y' : 'x' });
  return make(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Done', data: done, backgroundColor: t.s1, borderRadius: 4, borderSkipped: false, borderColor: t.surface, borderWidth: 1, maxBarThickness: 36 },
        { label: 'Open', data: open, backgroundColor: t.s2, borderRadius: 4, borderSkipped: false, borderColor: t.surface, borderWidth: 1, maxBarThickness: 36 },
      ],
    },
    options: opts,
  });
}
