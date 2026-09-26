import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { dbConfigured, queryD1 } from './d1';

export async function getFollowedLogins(): Promise<string[]> {
  if (!dbConfigured()) return [];
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];
  try {
    const rows = await queryD1<{ github_login: string }>('SELECT github_login FROM follows WHERE user_id=? ORDER BY created_at DESC LIMIT 30', [session.user.id]);
    return rows.map(row => row.github_login);
  } catch { return []; }
}
