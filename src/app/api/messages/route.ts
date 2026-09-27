import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { apiError, checkWrite, currentUser, json, requireD1 } from '@/lib/api';
import { queryD1, runD1 } from '@/lib/d1';
import { cleanBody } from '@/lib/spaces';
import { dmState, resolvePeer, isRoomMember, validRoomId } from '@/lib/chat';

type Message = { id: string; scope: string; target: string; author_id: string; author_login: string; body: string; created_at: string };

async function privateTarget(scope: unknown, target: unknown, userId: string) {
  if (scope === 'room') {
    const id = String(target || '');
    return validRoomId(id) && await isRoomMember(id, userId) ? { scope: 'room', target: id } : null;
  }
  if (scope !== 'dm') return null;
  const peer = await resolvePeer(target, userId);
  if (!peer) return null;
  return { scope: 'dm_v2', target: peer.pair, peer: { id: peer.id, login: peer.login }, consent: await dmState(peer.pair, userId, peer.id) };
}

// Enforce revocation in the mutation itself, not only in a preceding read.
const membership = "((scope='dm_v2' AND EXISTS(SELECT 1 FROM dm_allowed WHERE pair=messages.target)) OR (scope='room' AND EXISTS(SELECT 1 FROM room_members WHERE room_id=messages.target AND user_id=?)))";

export async function GET(request: NextRequest) {
  const user = await currentUser(); if (!user) return json({ error: 'Sign in with GitHub to read messages.' }, 401);
  const unavailable = requireD1(); if (unavailable) return unavailable;
  try {
    const url = new URL(request.url);
    const space = await privateTarget(url.searchParams.get('scope'), url.searchParams.get('target'), user.id);
    if (!space) return json({ error: 'This chat is unavailable. Direct messages require both people to have signed in to Gitium.' }, 403);
    if ('consent' in space && space.consent?.status !== 'accepted') return json({ messages: [], peer: space.peer, consent: space.consent });
    const messages = await queryD1<Message>(`SELECT id,scope,target,author_id,author_login,body,created_at FROM messages WHERE scope=? AND target=? AND ${membership} ORDER BY created_at DESC,id DESC LIMIT 100`, [space.scope, space.target, user.id]);
    return json({ messages: messages.reverse(), peer: 'peer' in space ? space.peer : undefined, consent: 'consent' in space ? space.consent : undefined });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  const invalid = await checkWrite(request); if (invalid) return invalid;
  const user = await currentUser(); if (!user) return json({ error: 'Sign in with GitHub to chat.' }, 401);
  const unavailable = requireD1(); if (unavailable) return unavailable;
  try {
    const input = await request.json();
    const space = await privateTarget(input.scope, input.target, user.id);
    const body = cleanBody(input.body, 500);
    if (!space) return json({ error: 'This conversation is private or the recipient has not joined Gitium.' }, 403);
    if ('consent' in space && space.consent?.status !== 'accepted') return json({ error: 'This chat requires an accepted request.' }, 403);
    if (!body) return json({ error: 'Write up to 500 characters.' }, 400);
    const id = randomUUID();
    const result = await runD1("INSERT INTO messages(id,scope,target,author_id,author_login,body) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM messages WHERE author_id=? AND created_at>datetime('now','-1 minute'))<10 AND ((?8='dm_v2' AND EXISTS(SELECT 1 FROM dm_allowed WHERE pair=?9)) OR (?8='room' AND EXISTS(SELECT 1 FROM room_members WHERE room_id=?9 AND user_id=?10)))", [id, space.scope, space.target, user.id, user.githubLogin, body, user.id, space.scope, space.target, user.id]);
    if (!result.changes) return json({ error: 'Message not sent. Check room access or wait a minute before trying again.' }, 429);
    return json({ id }, 201);
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: NextRequest) {
  const invalid = await checkWrite(request); if (invalid) return invalid;
  const user = await currentUser(); if (!user) return json({ error: 'Sign in first.' }, 401);
  const unavailable = requireD1(); if (unavailable) return unavailable;
  try {
    const input = await request.json();
    const id = String(input.id || ''); const body = cleanBody(input.body, 500);
    if (!validRoomId(id) || !body) return json({ error: 'Invalid message.' }, 400);
    const result = await runD1(`UPDATE messages SET body=? WHERE id=? AND author_id=? AND ${membership}`, [body, id, user.id, user.id]);
    return result.changes ? json({ id }) : json({ error: 'Message unavailable or access revoked.' }, 403);
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: NextRequest) {
  const invalid = await checkWrite(request); if (invalid) return invalid;
  const user = await currentUser(); if (!user) return json({ error: 'Sign in first.' }, 401);
  const unavailable = requireD1(); if (unavailable) return unavailable;
  try {
    const id = String((await request.json()).id || '');
    if (!validRoomId(id)) return json({ error: 'Invalid message.' }, 400);
    const result = await runD1(`DELETE FROM messages WHERE id=? AND author_id=? AND ${membership}`, [id, user.id, user.id]);
    return result.changes ? json({ id }) : json({ error: 'Message unavailable or access revoked.' }, 403);
  } catch (error) { return apiError(error); }
}
