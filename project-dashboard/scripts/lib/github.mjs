// Minimal GitHub REST and GraphQL client: retries on rate limits and server
// errors, follows pagination, and fails instead of returning a partial list.
// Retry and pagination follow scripts/collect.py in vstorm-co/oss-dashboard (MIT).
// Tokens are only ever placed in the Authorization header, never logged.

const API = 'https://api.github.com';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class GitHubError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export function createClient(token, { retries = 4, fetchImpl = fetch } = {}) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'project-dashboard-collector',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  async function request(url, init = {}) {
    for (let attempt = 0; ; attempt += 1) {
      const response = await fetchImpl(url.startsWith('http') ? url : `${API}${url}`, { ...init, headers: { ...headers, ...init.headers } });
      const limited = response.status === 429 || (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0');
      if ((limited || response.status >= 500) && attempt < retries) {
        const retryAfter = Number(response.headers.get('retry-after'));
        const reset = Number(response.headers.get('x-ratelimit-reset'));
        const wait = retryAfter > 0 ? retryAfter * 1000 : reset > 0 ? Math.max(0, reset * 1000 - Date.now()) + 1000 : 2 ** attempt * 1000;
        if (wait > 120_000) throw new GitHubError(`Rate limited for ${Math.round(wait / 1000)} s on ${url}`, response.status);
        await sleep(wait);
        continue;
      }
      if (!response.ok) {
        const body = await response.text();
        throw new GitHubError(`GitHub ${response.status} on ${url.split('?')[0]}: ${body.slice(0, 200)}`, response.status);
      }
      return response;
    }
  }

  async function get(path) {
    return (await request(path)).json();
  }

  /** Every page of a list endpoint, following the Link header. */
  async function paginate(path) {
    const items = [];
    let url = `${path}${path.includes('?') ? '&' : '?'}per_page=100`;
    while (url) {
      const response = await request(url);
      const page = await response.json();
      if (!Array.isArray(page)) throw new GitHubError(`Expected a list from ${path}`, response.status);
      items.push(...page);
      const next = /<([^>]+)>;\s*rel="next"/.exec(response.headers.get('link') ?? '');
      url = next ? next[1] : null;
    }
    return items;
  }

  async function graphql(query, variables) {
    const response = await request('/graphql', {
      method: 'POST',
      body: JSON.stringify({ query, variables }),
      headers: { 'Content-Type': 'application/json' },
    });
    const body = await response.json();
    if (body.errors?.length) throw new GitHubError(`GraphQL: ${body.errors.map((e) => e.message).join('; ')}`, 200);
    return body.data;
  }

  return { get, paginate, graphql };
}
