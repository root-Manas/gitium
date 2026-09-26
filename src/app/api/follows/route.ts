import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { apiError, checkWrite, currentUser, json, requireD1 } from '@/lib/api';
import { queryD1 } from '@/lib/d1';
import { getUser, validLogin } from '@/lib/github';

export async function GET() {
  const user = await currentUser();
  if (!user) return json({ logins: [] });
  const unavailable = requireD1(); if (unavailable) return unavailable;
  try {
    const rows = await queryD1<{ github_login: string }>('SELECT github_login FROM follows WHERE user_id=? ORDER BY created_at DESC LIMIT 30', [user.id]);
    return json({ logins: rows.map(row => row.github_login) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  const invalid = checkWrite(request); if (invalid) return invalid;
  const user = await currentUser(); if (!user) return json({ error: 'Sign in with GitHub first.' }, 401);
  const unavailable = requireD1(); if (unavailable) return unavailable;
  try {
    const body = await request.json();
    const login = String(body.login || '').trim().toLowerCase();
    if (!validLogin(login) || login === user.githubLogin.toLowerCase()) return json({ error: 'Choose another GitHub account.' }, 400);
    const count = await queryD1<{ count: number }>('SELECT COUNT(*) AS count FROM follows WHERE user_id=?', [user.id]);
    if ((count[0]?.count || 0) >= 30) return json({ error: 'You can follow up to 30 accounts.' }, 400);
    const auth = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    let profile;
    try { profile = await getUser(login, typeof auth?.githubAccessToken === 'string' ? auth.githubAccessToken : undefined); }
    catch (error) { if (error instanceof Error && error.message.includes('404')) return json({ error: 'GitHub account not found.' }, 404); throw error; }
    await queryD1('INSERT OR IGNORE INTO follows(user_id,github_login) VALUES(?,?)', [user.id, profile.login.toLowerCase()]);
    return json({ login: profile.login.toLowerCase() }, 201);
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: NextRequest) {
  const invalid = checkWrite(request); if (invalid) return invalid;
  const user = await currentUser(); if (!user) return json({ error: 'Sign in with GitHub first.' }, 401);
  const unavailable = requireD1(); if (unavailable) return unavailable;
  try {
    const body = await request.json();
    const login = String(body.login || '').trim().toLowerCase();
    if (!validLogin(login)) return json({ error: 'Invalid GitHub account.' }, 400);
    await queryD1('DELETE FROM follows WHERE user_id=? AND github_login=?', [user.id, login]);
    return json({ login });
  } catch (error) { return apiError(error); }
}
