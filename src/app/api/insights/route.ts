import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { apiError, json } from '@/lib/api';
import { getUser, githubGet, GitHubRepo, validLogin } from '@/lib/github';
import { estimateAccount } from '@/lib/value';
import { dbConfigured, queryD1 } from '@/lib/d1';

type Day = { date: string; contributionCount: number; contributionLevel: string };
type GraphResponse = { data?: { user?: { contributionsCollection: { contributionCalendar: { totalContributions: number; weeks: { contributionDays: Day[] }[] } } } }; errors?: { message: string }[] };

export async function GET(request: NextRequest) {
  const login = new URL(request.url).searchParams.get('login')?.trim().toLowerCase() || '';
  if (!validLogin(login)) return json({ error: 'Enter a GitHub username.' }, 400);
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const access = typeof token?.githubAccessToken === 'string' ? token.githubAccessToken : '';
  if (!access) return json({ error: 'Sign in with GitHub to see code graphs and estimates.' }, 401);
  try {
    const [profile, repos] = await Promise.all([
      getUser(login, access),
      githubGet<GitHubRepo[]>(`/users/${encodeURIComponent(login)}/repos?type=owner&sort=updated&per_page=100`, 0, access)
    ]);
    const graph = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json', 'User-Agent': 'Gitium-web' },
      body: JSON.stringify({ query: 'query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}', variables: { login } }),
      cache: 'no-store'
    });
    if (!graph.ok) return json({ error: 'GitHub could not load the contribution graph.' }, 502);
    const data = await graph.json() as GraphResponse;
    const calendar = data.data?.user?.contributionsCollection.contributionCalendar;
    if (!calendar) return json({ error: 'GitHub could not load the contribution graph.' }, 502);
    const contributions = calendar.totalContributions;
    const followers = profile.followers || 0;
    const publicRepos = profile.public_repos || 0;
    const estimate = estimateAccount(contributions, followers, repos);
    if (dbConfigured()) {
      try { await queryD1('INSERT INTO account_runs(day,login,value_usd) VALUES(?,?,?) ON CONFLICT(day,login) DO UPDATE SET value_usd=excluded.value_usd', [new Date().toISOString().slice(0, 10), profile.login.toLowerCase(), estimate.value]); }
      catch (error) { console.error('Could not record account run:', error); }
    }
    const languages = Object.entries(repos.reduce<Record<string, number>>((counts, repo) => { if (repo.language) counts[repo.language] = (counts[repo.language] || 0) + 1; return counts; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));
    return json({ login: profile.login, avatar: profile.avatar_url, contributions, followers, publicRepos, sampledRepos: repos.length, estimate, weeks: calendar.weeks, languages, repos: repos.sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 8).map(repo => ({ name: repo.full_name, stars: repo.stargazers_count, language: repo.language, url: repo.html_url })) });
  } catch (error) { return apiError(error); }
}
