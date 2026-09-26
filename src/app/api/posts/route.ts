import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { apiError, checkWrite, currentUser, json, requireD1 } from '@/lib/api';
import { queryD1 } from '@/lib/d1';
import { cleanBody, parseSpace, SpaceItem } from '@/lib/spaces';

export async function GET(request: NextRequest) {
  const unavailable = requireD1(); if (unavailable) return unavailable;
  const url = new URL(request.url);
  const space = parseSpace(url.searchParams.get('scope'), url.searchParams.get('target'));
  if (!space || space.scope === 'dm') return json({ error: 'Choose a person, repository, or organization.' }, 400);
  try {
    const posts = await queryD1<SpaceItem>('SELECT id,scope,target,author_login,body,created_at FROM posts WHERE scope=? AND target=? ORDER BY created_at DESC LIMIT 50', [space.scope, space.target]);
    return json({ posts });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  const invalid = checkWrite(request); if (invalid) return invalid;
  const user = await currentUser(); if (!user) return json({ error: 'Sign in with GitHub to post.' }, 401);
  const unavailable = requireD1(); if (unavailable) return unavailable;
  try {
    const input = await request.json();
    const space = parseSpace(input.scope, input.target);
    const body = cleanBody(input.body, 1500);
    if (!space || space.scope === 'dm' || !body) return json({ error: 'Choose a space and write up to 1,500 characters.' }, 400);
    if (space.scope === 'user' && space.target !== user.githubLogin.toLowerCase()) return json({ error: 'You can post on your own profile only.' }, 403);
    const recent = await queryD1<{ total: number }>("SELECT COUNT(*) AS total FROM posts WHERE author_id=? AND created_at>datetime('now','-1 minute')", [user.id]);
    if (Number(recent[0]?.total || 0) >= 3) return json({ error: 'Wait a minute before posting again.' }, 429);
    const id = randomUUID();
    await queryD1('INSERT INTO posts(id,scope,target,author_id,author_login,body) VALUES(?,?,?,?,?,?)', [id, space.scope, space.target, user.id, user.githubLogin, body]);
    return json({ id }, 201);
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: NextRequest) {
  const invalid = checkWrite(request); if (invalid) return invalid;
  const user = await currentUser(); if (!user) return json({ error: 'Sign in first.' }, 401);
  const unavailable = requireD1(); if (unavailable) return unavailable;
  try {
    const id = String((await request.json()).id || '');
    if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: 'Invalid post.' }, 400);
    await queryD1('DELETE FROM posts WHERE id=? AND author_id=?', [id, user.id]);
    return json({ id });
  } catch (error) { return apiError(error); }
}
