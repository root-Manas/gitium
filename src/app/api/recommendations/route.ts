import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { apiError, json } from '@/lib/api';
import { getNetworkLogins } from '@/lib/follows';
import { discoverFromPeople } from '@/lib/github';

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const accessToken = typeof token?.githubAccessToken === 'string' ? token.githubAccessToken : '';
  const login = typeof token?.githubLogin === 'string' ? token.githubLogin : '';
  const userId = String(token?.githubId || token?.sub || '');
  if (!accessToken || !login || !userId) return json({ error: 'Log in with GitHub first.' }, 401);
  try {
    const network = await getNetworkLogins(userId, login, accessToken);
    if (network.logins.length === 0) return json({ projects: [], sources: 0, failed: 0, followsCount: 0 });
    const discovery = await discoverFromPeople(network.logins, login, accessToken);
    return json({ ...discovery, followsCount: network.total });
  } catch (error) { return apiError(error); }
}
