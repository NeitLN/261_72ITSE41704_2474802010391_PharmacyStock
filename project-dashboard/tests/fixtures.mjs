// Small hand-made inputs for the core tests. They mirror the shape that
// scripts/collect.mjs writes to data/dashboard.json, not real project data.

export function makeConfig(overrides = {}) {
  return {
    schemaVersion: 1,
    project: {
      name: 'Test project',
      repository: 'owner/repo',
      startDate: '2026-10-19',
      finalDeadline: '2026-11-01',
      timezone: 'Asia/Ho_Chi_Minh',
    },
    team: {
      leader: 'alice',
      members: [
        { login: 'alice', name: 'Alice', role: 'Leader' },
        { login: 'bob', name: 'Bob', role: 'Developer' },
      ],
    },
    weeks: [
      { number: 6, start: '2026-10-19', end: '2026-10-25', milestone: 6 },
      { number: 7, start: '2026-10-26', end: '2026-11-01', milestone: 7 },
    ],
    github: {
      projectV2: {
        statusMap: { Todo: 'todo', 'In Progress': 'in_progress', 'In review': 'review', Done: 'done' },
      },
    },
    labels: { severity: ['S1', 'S2', 'S3', 'S4'], blocked: ['blocked'] },
    progress: { method: 'tasks' },
    health: { onTrackGap: 0.05, atRiskGap: 0.2, minDataPoints: 3 },
    publishing: { staleAfterHours: 30 },
    ...overrides,
  };
}

export function issue(number, fields = {}) {
  return {
    number,
    title: `Issue ${number}`,
    url: `https://github.com/owner/repo/issues/${number}`,
    summary: '',
    state: 'open',
    stateReason: null,
    createdAt: '2026-10-19T01:00:00Z',
    closedAt: null,
    author: 'alice',
    labels: [],
    assignees: ['alice'],
    milestone: 7,
    board: { status: 'Todo', start: null, due: null, week: null, hours: null },
    ...fields,
    board: fields.board === null ? null : { status: 'Todo', start: null, due: null, week: null, hours: null, ...fields.board },
  };
}

export function makeData(issues, { projectV2 = 'ok', pulls = [], events = [], milestones } = {}) {
  return {
    schemaVersion: 1,
    generatedAt: '2026-10-28T00:00:00Z',
    repository: { fullName: 'owner/repo', url: 'https://github.com/owner/repo', visibility: 'public' },
    collection: { status: 'ok', sources: { projectV2 }, errors: [] },
    milestones: milestones ?? [
      { number: 6, title: 'Week 06', description: 'Deliverable: six', state: 'open', dueOn: '2026-10-25T00:00:00Z', url: 'm6' },
      { number: 7, title: 'Week 07', description: 'Deliverable: seven', state: 'open', dueOn: '2026-11-01T00:00:00Z', url: 'm7' },
    ],
    issues: projectV2 === 'ok' ? issues : issues.map((i) => ({ ...i, board: null })),
    pulls,
    events,
    releases: [],
    workflowRuns: [],
    documents: [],
  };
}
