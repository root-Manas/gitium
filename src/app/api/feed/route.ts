import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { apiError, json } from '@/lib/api';
import { dbConfigured, queryD1 } from '@/lib/d1';
import { getFeed, getReceivedEvents } from '@/lib/github';

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const accessToken = typeof token?.githubAccessToken === 'string' ? token.githubAccessToken : '';
  const login = typeof token?.githubLogin === 'string' ? token.githubLogin : '';
  if (!accessToken || !login) return json({ error: 'Sign in with GitHub first.' }, 401);
  try {
    const tab = new URL(request.url).searchParams.get('tab');
    if (tab === 'following') {
      if (!dbConfigured()) return json({ events: [], error: 'Cloudflare D1 is not connected yet.' }, 503);
      const rows = await queryD1<{ github_login: string }>('SELECT github_login FROM follows WHERE user_id=? ORDER BY created_at DESC LIMIT 12', [String(token?.githubId || token?.sub || '')]);
      const feed = await getFeed(rows.map(row => row.github_login), accessToken);
      return json(feed);
    }
    const events = await getReceivedEvents(login, accessToken);
    return json({ events, failed: 0 });
  } catch (error) { return apiError(error); }
}
