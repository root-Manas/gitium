import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { apiError, json } from '@/lib/api';
import { githubGet, GitHubRepo } from '@/lib/github';

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const access = typeof token?.githubAccessToken === 'string' ? token.githubAccessToken : '';
  if (!access) return json({ error: 'Sign in with GitHub to import stars.' }, 401);
  const page = Number(new URL(request.url).searchParams.get('page') || '1');
  if (!Number.isInteger(page) || page < 1 || page > 20) return json({ error: 'Invalid page.' }, 400);
  try {
    const repos = await githubGet<GitHubRepo[]>(`/user/starred?per_page=100&page=${page}`, 0, access);
    return json({ repos: repos.map(repo => ({ id: repo.id, name: repo.full_name, description: repo.description, url: repo.html_url, language: repo.language, stars: repo.stargazers_count })), nextPage: repos.length === 100 && page < 20 ? page + 1 : null });
  } catch (error) { return apiError(error); }
}
