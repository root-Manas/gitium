import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { apiError, checkWrite, currentUser, json, requireD1 } from '@/lib/api';
import { queryD1, runD1 } from '@/lib/d1';
import { getUser, githubGet, validLogin } from '@/lib/github';
import { isRoomMember, validRoomId } from '@/lib/chat';
import { parseSpace } from '@/lib/spaces';

type Room = { id: string; scope: string; target: string; owner_id: string; owner_login: string; created_at: string; latest?: string | null };
type Invite = { room_id: string; scope: string; target: string; owner_login: string; created_at: string };

export async function GET(request: NextRequest) {
  const user = await currentUser(); if (!user) return json({ error: 'Sign in with GitHub to open chats.' }, 401);
  const unavailable = requireD1(); if (unavailable) return unavailable;
  try {
    const roomId = new URL(request.url).searchParams.get('roomId') || '';
    if (roomId) {
      if (!await isRoomMember(roomId, user.id)) return json({ error: 'This room is private.' }, 403);
      const members = await queryD1<{ user_id: string; login: string; role: string }>('SELECT user_id,login,role FROM room_members WHERE room_id=? ORDER BY joined_at ASC LIMIT 26', [roomId]);
      const room = await queryD1<Room>('SELECT id,scope,target,owner_id,owner_login,created_at FROM rooms WHERE id=? LIMIT 1', [roomId]);
      if (!room.length) return json({ error: 'Room not found.' }, 404);
      const invites = room[0].owner_id === user.id ? await queryD1<{ login: string }>('SELECT login FROM room_invitations WHERE room_id=? ORDER BY created_at DESC LIMIT 25', [roomId]) : [];
      return json({ room: room[0], members, invites });
    }
    const rooms = await queryD1<Room>("SELECT r.id,r.scope,r.target,r.owner_id,r.owner_login,r.created_at,(SELECT MAX(created_at) FROM messages WHERE scope='room' AND target=r.id) AS latest FROM rooms r JOIN room_members m ON m.room_id=r.id WHERE m.user_id=? ORDER BY COALESCE(latest,r.created_at) DESC LIMIT 50", [user.id]);
    const invites = await queryD1<Invite>('SELECT i.room_id,r.scope,r.target,r.owner_login,i.created_at FROM room_invitations i JOIN rooms r ON r.id=i.room_id WHERE i.user_id=? ORDER BY i.created_at DESC LIMIT 50', [user.id]);
    const dms = await queryD1<{ id: string; login: string; latest: string }>("SELECT u.github_id AS id,u.github_login AS login,MAX(m.created_at) AS latest FROM messages m JOIN users u ON (m.target=?||':'||u.github_id OR m.target=u.github_id||':'||?) WHERE m.scope='dm_v2' GROUP BY u.github_id,u.github_login ORDER BY latest DESC LIMIT 50", [user.id, user.id]);
    return json({ rooms, invites, dms });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  const invalid = await checkWrite(request); if (invalid) return invalid;
  const user = await currentUser(); if (!user) return json({ error: 'Sign in with GitHub to manage chats.' }, 401);
  const unavailable = requireD1(); if (unavailable) return unavailable;
  try {
    const input = await request.json();
    const action = String(input.action || '');
    if (action === 'create') {
      const space = parseSpace(input.scope, input.target);
      if (!space || !['repo', 'org'].includes(space.scope)) return json({ error: 'Choose a GitHub repository or organization.' }, 400);
      const owned = await queryD1<{ total: number }>('SELECT COUNT(*) AS total FROM rooms WHERE owner_id=?', [user.id]);
      if (Number(owned[0]?.total || 0) >= 10) return json({ error: 'You can create up to 10 private rooms.' }, 429);
      try { await githubGet(space.scope === 'repo' ? `/repos/${space.target}` : `/orgs/${space.target}`, 600); }
      catch { return json({ error: 'That public GitHub repository or organization was not found.' }, 404); }
      const id = randomUUID();
      const created = await runD1('INSERT INTO rooms(id,scope,target,owner_id,owner_login) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM rooms WHERE owner_id=?)<10', [id, space.scope, space.target, user.id, user.githubLogin, user.id]);
      if (!created.changes) return json({ error: 'You can create up to 10 private rooms.' }, 429);
      try { await queryD1("INSERT INTO room_members(room_id,user_id,login,role) VALUES(?,?,?,'owner')", [id, user.id, user.githubLogin.toLowerCase()]); }
      catch (error) { await queryD1('DELETE FROM rooms WHERE id=? AND owner_id=?', [id, user.id]); throw error; }
      return json({ id }, 201);
    }
    const roomId = String(input.roomId || '');
    if (!validRoomId(roomId)) return json({ error: 'Invalid room.' }, 400);
    if (action === 'invite') {
      const owner = await queryD1<Room>('SELECT id,owner_id FROM rooms WHERE id=? AND owner_id=? LIMIT 1', [roomId, user.id]);
      if (!owner.length) return json({ error: 'Only the room owner can invite people.' }, 403);
      const login = String(input.login || '').trim().toLowerCase();
      if (!validLogin(login) || login === user.githubLogin.toLowerCase()) return json({ error: 'Choose another GitHub user.' }, 400);
      const count = await queryD1<{ total: number }>('SELECT COUNT(*) AS total FROM room_invitations WHERE room_id=?', [roomId]);
      const members = await queryD1<{ total: number }>('SELECT COUNT(*) AS total FROM room_members WHERE room_id=?', [roomId]);
      if (Number(count[0]?.total || 0) + Number(members[0]?.total || 0) >= 25) return json({ error: 'This room has reached its 25-person limit.' }, 429);
      const peer = await getUser(login).catch(() => null);
      if (!peer?.id) return json({ error: 'GitHub user not found.' }, 404);
      const invited = await runD1('INSERT OR IGNORE INTO room_invitations(room_id,user_id,login,invited_by) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM room_invitations WHERE room_id=?)+(SELECT COUNT(*) FROM room_members WHERE room_id=?)<25 AND NOT EXISTS(SELECT 1 FROM room_members WHERE room_id=? AND user_id=?)', [roomId, String(peer.id), login, user.id, roomId, roomId, roomId, String(peer.id)]);
      if (!invited.changes) return json({ error: 'Already invited, already a member, or room is full.' }, 409);
      return json({ invited: login });
    }
    if (action === 'accept') {
      const joined = await runD1('INSERT OR IGNORE INTO room_members(room_id,user_id,login) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM room_invitations WHERE room_id=? AND user_id=?) AND (SELECT COUNT(*) FROM room_members WHERE room_id=?)<25', [roomId, user.id, user.githubLogin.toLowerCase(), roomId, user.id, roomId]);
      if (!joined.changes) return json({ error: 'Invite unavailable, already joined, or room is full.' }, 403);
      await queryD1('DELETE FROM room_invitations WHERE room_id=? AND user_id=?', [roomId, user.id]);
      return json({ joined: roomId });
    }
    if (action === 'decline') {
      await queryD1('DELETE FROM room_invitations WHERE room_id=? AND user_id=?', [roomId, user.id]);
      return json({ declined: roomId });
    }
    if (action === 'leave') {
      await queryD1("DELETE FROM room_members WHERE room_id=? AND user_id=? AND role='member'", [roomId, user.id]);
      return json({ left: roomId });
    }
    if (action === 'remove') {
      const owner = await queryD1<Room>('SELECT id FROM rooms WHERE id=? AND owner_id=? LIMIT 1', [roomId, user.id]);
      if (!owner.length) return json({ error: 'Only the room owner can remove members.' }, 403);
      const memberId = String(input.userId || '');
      if (!/^\d{1,20}$/.test(memberId)) return json({ error: 'Invalid GitHub user.' }, 400);
      await queryD1('DELETE FROM room_invitations WHERE room_id=? AND user_id=?', [roomId, memberId]);
      await queryD1("DELETE FROM room_members WHERE room_id=? AND user_id=? AND role='member'", [roomId, memberId]);
      return json({ removed: memberId });
    }
    return json({ error: 'Unknown room action.' }, 400);
  } catch (error) { return apiError(error); }
}
