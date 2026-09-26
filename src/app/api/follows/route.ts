import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { checkWrite, json } from '@/lib/api';
import { getGitHubFollowing, validLogin } from '@/lib/github';

async function identity(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  return { access: typeof token?.githubAccessToken === 'string' ? token.githubAccessToken : '', login: String(token?.githubLogin || '') };
}

export async function GET(request: NextRequest) {
  const { access, login } = await identity(request);
  if (!access || !login) return json({ logins: [] });
  try { return json({ logins: await getGitHubFollowing(login, access) }); }
  catch { return json({ error: 'Could not load your GitHub follows.' }, 502); }
}

async function change(request: NextRequest, method: 'PUT' | 'DELETE') {
  const invalid = checkWrite(request); if (invalid) return invalid;
  const { access, login: self } = await identity(request);
  if (!access || !self) return json({ error: 'Sign in with GitHub first.' }, 401);
  let login = '';
  try { login = String((await request.json()).login || '').trim().toLowerCase(); }
  catch { return json({ error: 'Invalid request.' }, 400); }
  if (!validLogin(login) || login === self.toLowerCase()) return json({ error: 'Choose another GitHub account.' }, 400);
  const response = await fetch(`https://api.github.com/user/following/${encodeURIComponent(login)}`, {
    method, headers: { Authorization: `Bearer ${access}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10', 'User-Agent': 'Gitium-web', ...(method === 'PUT' ? { 'Content-Length': '0' } : {}) }, cache: 'no-store'
  });
  if (response.status === 403) return json({ error: 'Reconnect GitHub to allow follow sync.', reconnect: true }, 403);
  if (response.status === 404) return json({ error: 'GitHub account not found.' }, 404);
  if (!response.ok) return json({ error: 'GitHub could not update your follows.' }, 502);
  return json({ login, following: method === 'PUT' });
}

export async function PUT(request: NextRequest) { return change(request, 'PUT'); }
export async function DELETE(request: NextRequest) { return change(request, 'DELETE'); }
