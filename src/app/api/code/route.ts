import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createHmac } from 'node:crypto';
import { json } from '@/lib/api';
import { githubGet, validLogin } from '@/lib/github';

type Commit = { sha: string; html_url: string; author: { login: string } | null; commit: { author: { name: string; date: string } | null; message: string } };
type Repo = { full_name: string; description: string | null; default_branch: string; html_url: string; private: boolean };

export async function GET(request: NextRequest) {
  const raw = new URL(request.url).searchParams.get('repo')?.trim() || '';
  const value = raw.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').replace(/\/$/, '');
  const [owner, name, extra] = value.split('/');
  if (extra || !validLogin(owner || '') || !/^[\w.-]{1,100}$/.test(name || '') || name === '.' || name === '..') return json({ error: 'Enter owner/repository.' }, 400);
  try {
    const jwt = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const access = typeof jwt?.githubAccessToken === 'string' ? jwt.githubAccessToken : undefined;
    const path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
    const repo = await githubGet<Repo>(path, 600, access);
    if (repo.private) return json({ error: 'Only public repositories are shown.' }, 403);
    let commits: Commit[];
    try { commits = await githubGet<Commit[]>(`${path}/commits?per_page=100`, 300, access); }
    catch (error) { if (error instanceof Error && error.message.includes('409')) commits = []; else throw error; }
    const counts = commits.reduce<Record<string, number>>((counts, item) => {
      const date = item.commit.author?.date?.slice(0, 10);
      if (date) counts[date] = (counts[date] || 0) + 1;
      return counts;
    }, {});
    const today = new Date();
    const days = Array.from({ length: 60 }, (_, index) => {
      const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 59 + index)).toISOString().slice(0, 10);
      return { date, count: counts[date] || 0 };
    });
    const authors = Object.entries(commits.reduce<Record<string, number>>((counts, item) => {
      const login = item.author?.login || item.commit.author?.name || 'Unknown';
      counts[login] = (counts[login] || 0) + 1;
      return counts;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([login, count]) => ({ login, count }));
    const proof = createHmac('sha256', process.env.NEXTAUTH_SECRET || 'local-preview').update(repo.full_name.toLowerCase()).digest('hex');
    return NextResponse.json({ repo: { name: repo.full_name, description: repo.description, branch: repo.default_branch, url: repo.html_url }, proof, sampled: commits.length, days, authors, commits: commits.slice(0, 12).map(item => ({ sha: item.sha.slice(0, 7), url: item.html_url, title: item.commit.message.split('\n')[0].slice(0, 150), author: item.author?.login || item.commit.author?.name || 'Unknown', date: item.commit.author?.date })) }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) return json({ error: 'Repository not found. Check the GitHub URL or owner/repository name.' }, 404);
    if (error instanceof Error && error.message.includes('rate limit')) return json({ error: 'GitHub is limiting public lookups. Sign in with GitHub and retry.' }, 429);
    return json({ error: 'Could not load this repository from GitHub. Try again.' }, 502);
  }
}
