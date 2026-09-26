export type FeedEvent = {
  id: string;
  type: string;
  actor: string;
  avatar: string;
  repo: string;
  action: string;
  detail: string;
  url: string;
  createdAt: string;
  isPrivate: boolean;
};

export type GitHubUser = { login: string; avatar_url: string; html_url: string; bio?: string | null; public_repos?: number; followers?: number };
export type GitHubRepo = { id: number; full_name: string; description: string | null; html_url: string; language: string | null; stargazers_count: number; forks_count: number; owner: { login: string; avatar_url: string } };

type RawEvent = {
  id: string; type: string; created_at: string; public: boolean;
  actor: { login: string; avatar_url: string };
  repo: { name: string };
  payload?: { action?: string; ref?: string; ref_type?: string; release?: { name?: string; tag_name?: string; html_url?: string }; issue?: { number?: number; title?: string; html_url?: string }; pull_request?: { number?: number; title?: string; html_url?: string }; forkee?: { full_name?: string; html_url?: string }; commits?: { message: string }[]; head?: string };
};

const headers = (token?: string) => ({
  Accept: 'application/vnd.github+json',
  'User-Agent': 'Gitium-web',
  ...(token ? { Authorization: `Bearer ${token}` } : {})
});

export async function githubGet<T>(path: string, revalidate = 120, token?: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, { headers: headers(token), ...(token ? { cache: 'no-store' as const } : { next: { revalidate } }) });
  if (!response.ok) {
    if (response.status === 403 || response.status === 429) throw new Error('GitHub rate limit reached. Try again in a few minutes.');
    throw new Error(`GitHub returned ${response.status}.`);
  }
  return response.json() as Promise<T>;
}

export const validLogin = (value: string) => /^(?!-)[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(value);

export function normalizeEvent(raw: RawEvent, allowPrivate = false): FeedEvent | null {
  if ((!raw?.public && !allowPrivate) || !raw.actor?.login || !raw.repo?.name || !/^\d+$/.test(raw.id)) return null;
  const repo = raw.repo.name;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return null;
  const payload = raw.payload || {};
  const base = `https://github.com/${repo}`;
  let action = '';
  let detail = '';
  let url = base;
  switch (raw.type) {
    case 'PushEvent':
      action = 'pushed to';
      detail = payload.commits?.[0]?.message?.split('\n')[0] || `New commits on ${payload.ref?.split('/').pop() || 'a branch'}`;
      url = payload.head ? `${base}/commit/${payload.head}` : base;
      break;
    case 'PullRequestEvent':
      action = `${payload.action || 'updated'} a pull request in`;
      detail = payload.pull_request?.title || `Pull request #${payload.pull_request?.number || ''}`;
      url = payload.pull_request?.html_url || base;
      break;
    case 'IssuesEvent':
      action = `${payload.action || 'updated'} an issue in`;
      detail = payload.issue?.title || `Issue #${payload.issue?.number || ''}`;
      url = payload.issue?.html_url || base;
      break;
    case 'IssueCommentEvent':
      action = 'commented on an issue in';
      detail = payload.issue?.title || 'New issue comment';
      url = payload.issue?.html_url || base;
      break;
    case 'ReleaseEvent':
      action = 'published a release in';
      detail = payload.release?.name || payload.release?.tag_name || 'New release';
      url = payload.release?.html_url || base;
      break;
    case 'CreateEvent':
      action = 'created in';
      detail = payload.ref_type === 'repository' ? 'New repository' : `${payload.ref_type || 'branch'} ${payload.ref || ''}`.trim();
      break;
    case 'ForkEvent':
      action = 'forked';
      detail = payload.forkee?.full_name || 'New fork';
      url = payload.forkee?.html_url || base;
      break;
    case 'WatchEvent':
      action = 'starred';
      detail = 'Added this repository to their stars';
      break;
    case 'PublicEvent':
      action = 'made public';
      detail = 'Repository is now public';
      break;
    default:
      return null;
  }
  try { if (new URL(url).origin !== 'https://github.com') url = base; } catch { url = base; }
  return { id: raw.id, type: raw.type, actor: raw.actor.login, avatar: raw.actor.avatar_url,
    repo, action, detail: detail.slice(0, 240), url, createdAt: raw.created_at, isPrivate: !raw.public };
}

export async function getPublicEvents(login: string, token?: string): Promise<FeedEvent[]> {
  if (!validLogin(login)) return [];
  const raw = await githubGet<RawEvent[]>(`/users/${encodeURIComponent(login)}/events/public?per_page=30`, 600, token);
  return raw.map(event => normalizeEvent(event)).filter((event): event is FeedEvent => !!event);
}

export async function getFeed(logins: string[], token?: string): Promise<{ events: FeedEvent[]; failed: number }> {
  const unique = [...new Set(logins.map(login => login.toLowerCase()))].filter(validLogin).slice(0, 12);
  const results = await Promise.allSettled(unique.map(login => getPublicEvents(login, token)));
  const events = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
  return { events: [...new Map(events.map(event => [event.id, event])).values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 60),
    failed: results.filter(result => result.status === 'rejected').length };
}

export async function getReceivedEvents(login: string, token: string): Promise<FeedEvent[]> {
  if (!validLogin(login) || !token) return [];
  const raw = await githubGet<RawEvent[]>(`/users/${encodeURIComponent(login)}/received_events?per_page=50`, 0, token);
  return raw.map(event => normalizeEvent(event, true)).filter((event): event is FeedEvent => !!event);
}

export async function getUser(login: string, token?: string): Promise<GitHubUser> {
  if (!validLogin(login)) throw new Error('Invalid GitHub username.');
  return githubGet<GitHubUser>(`/users/${encodeURIComponent(login)}`, 300, token);
}

export async function searchGitHub(query: string): Promise<{ users: GitHubUser[]; repos: GitHubRepo[] }> {
  const clean = query.trim().slice(0, 80);
  if (!clean) return { users: [], repos: [] };
  const [users, repos] = await Promise.allSettled([
    githubGet<{ items: GitHubUser[] }>(`/search/users?q=${encodeURIComponent(clean)}&per_page=8`, 300),
    githubGet<{ items: GitHubRepo[] }>(`/search/repositories?q=${encodeURIComponent(clean)}&sort=stars&per_page=8`, 300)
  ]);
  if (users.status === 'rejected' && repos.status === 'rejected') throw new Error('GitHub search is unavailable right now.');
  return { users: users.status === 'fulfilled' ? users.value.items : [], repos: repos.status === 'fulfilled' ? repos.value.items : [] };
}

export async function getTrendingRepos(): Promise<GitHubRepo[]> {
  const date = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const data = await githubGet<{ items: GitHubRepo[] }>(`/search/repositories?q=${encodeURIComponent(`created:>${date} stars:>20`)}&sort=stars&order=desc&per_page=6`, 3600);
  return data.items;
}
