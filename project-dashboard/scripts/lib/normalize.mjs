// Maps raw GitHub API objects to the fields the dashboard publishes. Only the
// fields listed here leave the collector (INTEGRATION_PLAN.md §5).

const KEYWORD_REFS = /\b(?:refs?|references|closes?|closed|fix(?:es|ed)?|resolves?|resolved|part of|relates to)\b[:\s]*((?:#\d+[\s,]*(?:and\s+)?)+)/gi;

/** Issue numbers a PR points at with a keyword: "Refs #12", "Closes #3, #4". */
export function issueRefs(text) {
  const refs = new Set();
  for (const match of (text ?? '').matchAll(KEYWORD_REFS)) {
    for (const n of match[1].matchAll(/#(\d+)/g)) refs.add(Number(n[1]));
  }
  return [...refs].sort((a, b) => a - b);
}

/** Plain-text summary of an issue body, without lines matching `skipPatterns`. */
export function summarize(body, { maxLength = 240, skipPatterns = [] } = {}) {
  if (!body) return '';
  const skip = skipPatterns.map((p) => new RegExp(p, 'i'));
  const text = body
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .split(/\r?\n/)
    .filter((line) => !skip.some((re) => re.test(line.trim())))
    .join(' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|]+/g, ' ')
    .replace(/-\s\[[ x]\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}

export function normalizeIssue(raw, summaryOptions) {
  return {
    number: raw.number,
    title: raw.title,
    url: raw.html_url,
    summary: summarize(raw.body, summaryOptions),
    state: raw.state,
    stateReason: raw.state_reason ?? null,
    createdAt: raw.created_at,
    closedAt: raw.closed_at,
    author: raw.user?.login ?? null,
    labels: (raw.labels ?? []).map((l) => (typeof l === 'string' ? l : l.name)),
    assignees: (raw.assignees ?? []).map((a) => a.login),
    milestone: raw.milestone?.number ?? null,
    board: null,
  };
}

export function normalizePull(raw) {
  return {
    number: raw.number,
    title: raw.title,
    url: raw.html_url,
    author: raw.user?.login ?? null,
    state: raw.state,
    draft: Boolean(raw.draft),
    createdAt: raw.created_at,
    mergedAt: raw.merged_at,
    closedAt: raw.closed_at,
    refs: issueRefs(`${raw.title}\n${raw.body ?? ''}`),
  };
}

export function normalizeMilestone(raw) {
  return {
    number: raw.number,
    title: raw.title,
    description: raw.description ?? '',
    state: raw.state,
    dueOn: raw.due_on,
    url: raw.html_url,
    openIssues: raw.open_issues,
    closedIssues: raw.closed_issues,
  };
}

const EVENT_TYPES = new Set(['closed', 'reopened', 'milestoned', 'demilestoned']);

export function normalizeEvents(raw) {
  return raw
    .filter((e) => EVENT_TYPES.has(e.event) && e.issue && !e.issue.pull_request)
    .map((e) => ({ issue: e.issue.number, type: e.event, at: e.created_at, milestone: e.milestone?.title ?? null }))
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.issue - b.issue));
}

/** Board field values of one Projects V2 item, keyed by the configured field names. */
export function boardValues(item, fields) {
  const byName = new Map();
  for (const v of item.fieldValues?.nodes ?? []) {
    const name = v?.field?.name;
    if (!name) continue;
    byName.set(name, v.name ?? v.date ?? v.number ?? v.text ?? v.title ?? null);
  }
  const value = (key) => (fields[key] ? byName.get(fields[key]) ?? null : null);
  const number = (key) => {
    const v = value(key);
    return v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v);
  };
  return { status: value('status'), start: value('start'), due: value('due'), week: number('week'), hours: number('hours') };
}
