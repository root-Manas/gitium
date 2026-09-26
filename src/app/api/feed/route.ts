import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { apiError, json } from '@/lib/api';
import { getFeed, getReceivedEvents } from '@/lib/github';
import { getNetworkLogins } from '@/lib/follows';

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const accessToken = typeof token?.githubAccessToken === 'string' ? token.githubAccessToken : '';
  const login = typeof token?.githubLogin === 'string' ? token.githubLogin : '';
  if (!accessToken || !login) return json({ error: 'Sign in with GitHub first.' }, 401);
  try {
    const tab = new URL(request.url).searchParams.get('tab');
    if (tab === 'following') {
      const network = await getNetworkLogins(String(token?.githubId || token?.sub || ''), login, accessToken);
      const feed = await getFeed(network.logins, accessToken);
      return json(feed);
    }
    const events = await getReceivedEvents(login, accessToken);
    return json({ events, failed: 0 });
  } catch (error) { return apiError(error); }
}
