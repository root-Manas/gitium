import { NextRequest } from 'next/server';
import { json } from '@/lib/api';
import { githubGet, validLogin } from '@/lib/github';

type Commit = { sha: string; html_url: string; author: { login: string } | null; commit: { author: { name: string; date: string } | null; message: string } };
type Repo = { full_name: string; description: string | null; default_branch: string; html_url: string; private: boolean };

export async function GET(request: NextRequest) {
  const value = new URL(request.url).searchParams.get('repo')?.trim() || '';
  const [owner, name, extra] = value.split('/');
  if (extra || !validLogin(owner || '') || !/^[\w.-]{1,100}$/.test(name || '') || name === '.' || name === '..') return json({ error: 'Enter owner/repository.' }, 400);
  try {
    const path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
    const repo = await githubGet<Repo>(path, 300);
    if (repo.private) return json({ error: 'Only public repositories are shown.' }, 403);
    const commits = await githubGet<Commit[]>(`${path}/commits?per_page=100`, 300);
    const days = Object.entries(commits.reduce<Record<string, number>>((counts, item) => {
      const date = item.commit.author?.date?.slice(0, 10);
      if (date) counts[date] = (counts[date] || 0) + 1;
      return counts;
    }, {})).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
    const authors = Object.entries(commits.reduce<Record<string, number>>((counts, item) => {
      const login = item.author?.login || item.commit.author?.name || 'Unknown';
      counts[login] = (counts[login] || 0) + 1;
      return counts;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([login, count]) => ({ login, count }));
    return json({ repo: { name: repo.full_name, description: repo.description, branch: repo.default_branch, url: repo.html_url }, sampled: commits.length, days, authors, commits: commits.slice(0, 12).map(item => ({ sha: item.sha.slice(0, 7), url: item.html_url, title: item.commit.message.split('\n')[0].slice(0, 150), author: item.author?.login || item.commit.author?.name || 'Unknown', date: item.commit.author?.date })) });
  } catch { return json({ error: 'This public repository could not be loaded from GitHub.' }, 502); }
}
