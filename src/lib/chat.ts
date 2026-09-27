import { queryD1 } from './d1';
import { githubGet, GitHubUser, validLogin } from './github';

export async function resolvePeer(target: unknown, userId: string) {
  if (typeof target !== 'string') return null;
  let id = '';
  if (/^id:\d{1,20}$/.test(target)) id = target.slice(3);
  else {
    if (!validLogin(target)) return null;
    id = String((await githubGet<GitHubUser>(`/users/${encodeURIComponent(target)}`, 0)).id);
  }
  if (id === userId || !/^\d{1,20}$/.test(id)) return null;
  const rows = await queryD1<{ github_login: string }>('SELECT github_login FROM users WHERE github_id=? LIMIT 1', [id]);
  return rows.length ? { id, login: rows[0].github_login, pair: [userId, id].sort().join(':') } : null;
}

export async function dmState(pair: string, userId: string, peerId: string) {
  const blocks = await queryD1<{ blocker_id: string }>('SELECT blocker_id FROM chat_blocks WHERE (blocker_id=?1 AND blocked_id=?2) OR (blocker_id=?2 AND blocked_id=?1)', [userId, peerId]);
  if (blocks.length) return { status: blocks.some(row => row.blocker_id === userId) ? 'blocked' : 'unavailable', incoming: false };
  const rows = await queryD1<{ status: string; recipient_id: string }>('SELECT status,recipient_id FROM dm_requests WHERE pair=?', [pair]);
  return { status: rows[0]?.status || 'none', incoming: rows[0]?.recipient_id === userId };
}

export const validRoomId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function isRoomMember(roomId: string, userId: string): Promise<boolean> {
  if (!validRoomId(roomId) || !userId) return false;
  const rows = await queryD1<{ allowed: number }>('SELECT 1 AS allowed FROM room_members WHERE room_id=? AND user_id=? LIMIT 1', [roomId, userId]);
  return rows.length > 0;
}
