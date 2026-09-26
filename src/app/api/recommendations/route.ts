import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { apiError, json, requireD1 } from '@/lib/api';
import { queryD1 } from '@/lib/d1';
import { discoverFromPeople } from '@/lib/github';

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const accessToken = typeof token?.githubAccessToken === 'string' ? token.githubAccessToken : '';
  const login = typeof token?.githubLogin === 'string' ? token.githubLogin : '';
  const userId = String(token?.githubId || token?.sub || '');
  if (!accessToken || !login || !userId) return json({ error: 'Log in with GitHub first.' }, 401);
  const unavailable = requireD1(); if (unavailable) return unavailable;
  try {
    const rows = await queryD1<{ github_login: string }>('SELECT github_login FROM follows WHERE user_id=? ORDER BY created_at DESC LIMIT 12', [userId]);
    if (rows.length === 0) return json({ projects: [], sources: 0, failed: 0, followsCount: 0 });
    const discovery = await discoverFromPeople(rows.map(row => row.github_login), login, accessToken);
    return json({ ...discovery, followsCount: rows.length });
  } catch (error) { return apiError(error); }
}
