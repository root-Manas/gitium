import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { apiError, checkWrite, currentUser, json, requireD1 } from '@/lib/api';
import { queryD1 } from '@/lib/d1';
import { cleanBody, parseSpace, SpaceItem } from '@/lib/spaces';

export async function GET(request: NextRequest) {
  const user = await currentUser(); if (!user) return json({ error: 'Sign in with GitHub to chat.' }, 401);
  const unavailable = requireD1(); if (unavailable) return unavailable;
  const url = new URL(request.url);
  const space = parseSpace(url.searchParams.get('scope'), url.searchParams.get('target'), user.githubLogin);
  if (!space || space.scope === 'user') return json({ error: 'Choose a direct, repository, or organization chat.' }, 400);
  try {
    const messages = await queryD1<SpaceItem>('SELECT id,scope,target,author_login,body,created_at FROM messages WHERE scope=? AND target=? ORDER BY created_at DESC LIMIT 100', [space.scope, space.target]);
    return json({ messages: messages.reverse() });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  const invalid = checkWrite(request); if (invalid) return invalid;
  const user = await currentUser(); if (!user) return json({ error: 'Sign in with GitHub to chat.' }, 401);
  const unavailable = requireD1(); if (unavailable) return unavailable;
  try {
    const input = await request.json();
    const space = parseSpace(input.scope, input.target, user.githubLogin);
    const body = cleanBody(input.body, 500);
    if (!space || space.scope === 'user' || !body) return json({ error: 'Choose a room and write up to 500 characters.' }, 400);
    const recent = await queryD1<{ total: number }>("SELECT COUNT(*) AS total FROM messages WHERE author_id=? AND created_at>datetime('now','-1 minute')", [user.id]);
    if (Number(recent[0]?.total || 0) >= 10) return json({ error: 'Wait a minute before sending again.' }, 429);
    const id = randomUUID();
    await queryD1('INSERT INTO messages(id,scope,target,author_id,author_login,body) VALUES(?,?,?,?,?,?)', [id, space.scope, space.target, user.id, user.githubLogin, body]);
    return json({ id }, 201);
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: NextRequest) {
  const invalid = checkWrite(request); if (invalid) return invalid;
  const user = await currentUser(); if (!user) return json({ error: 'Sign in first.' }, 401);
  const unavailable = requireD1(); if (unavailable) return unavailable;
  try {
    const id = String((await request.json()).id || '');
    if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: 'Invalid message.' }, 400);
    await queryD1('DELETE FROM messages WHERE id=? AND author_id=?', [id, user.id]);
    return json({ id });
  } catch (error) { return apiError(error); }
}
