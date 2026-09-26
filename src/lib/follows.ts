import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { dbConfigured, queryD1 } from './d1';
import { getGitHubFollowing } from './github';

export async function getFollowedLogins(): Promise<string[]> {
  if (!dbConfigured()) return [];
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];
  try {
    const rows = await queryD1<{ github_login: string }>('SELECT github_login FROM follows WHERE user_id=? ORDER BY created_at DESC LIMIT 30', [session.user.id]);
    return rows.map(row => row.github_login);
  } catch { return []; }
}

export async function getNetworkLogins(userId: string, login: string, token: string): Promise<{ logins: string[]; total: number }> {
  const [native, added] = await Promise.allSettled([
    getGitHubFollowing(login, token),
    dbConfigured() ? queryD1<{ github_login: string }>('SELECT github_login FROM follows WHERE user_id=? ORDER BY created_at DESC LIMIT 30', [userId]) : Promise.resolve([])
  ]);
  if (native.status === 'rejected' && added.status === 'rejected') throw new Error('Could not load followed accounts.');
  const names = [
    ...(added.status === 'fulfilled' ? added.value.map(row => row.github_login) : []),
    ...(native.status === 'fulfilled' ? native.value : [])
  ];
  const unique = [...new Set(names.map(name => name.toLowerCase()))];
  return { logins: unique.slice(0, 12), total: unique.length };
}
