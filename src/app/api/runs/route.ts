import { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getToken } from 'next-auth/jwt';
import { apiError, checkWrite, json, requireD1 } from '@/lib/api';
import { queryD1, runD1 } from '@/lib/d1';
import { validLogin } from '@/lib/github';

export async function POST(request: NextRequest) {
  const invalid = await checkWrite(request); if (invalid) return invalid;
  const unavailable = requireD1(); if (unavailable) return unavailable;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const userId = String(token?.githubId || token?.sub || '');
  if (!userId || !token?.githubAccessToken) return json({ error: 'Sign in to count an exploration.' }, 401);
  try {
    const input = await request.json();
    const repo = String(input.repo || '').trim().toLowerCase();
    const [owner, name, extra] = repo.split('/');
    if (extra || !validLogin(owner || '') || !/^[\w.-]{1,100}$/.test(name || '') || name === '.' || name === '..') return json({ error: 'Invalid repository.' }, 400);
    const proof = String(input.proof || '');
    const expected = createHmac('sha256', process.env.NEXTAUTH_SECRET || 'local-preview').update(repo).digest();
    if (!/^[0-9a-f]{64}$/i.test(proof) || !timingSafeEqual(Buffer.from(proof, 'hex'), expected)) return json({ error: 'Open the code graph first.' }, 403);
    const day = new Date().toISOString().slice(0, 10);
    const total = await queryD1<{ total: number }>('SELECT COUNT(*) AS total FROM code_run_views WHERE user_id=? AND day=?', [userId, day]);
    if (Number(total[0]?.total || 0) >= 30) return json({ counted: false, limit: true });
    const inserted = await runD1('INSERT OR IGNORE INTO code_run_views(user_id,repo,day) VALUES(?,?,?)', [userId, repo, day]);
    if (inserted.changes) {
      try { await queryD1('INSERT INTO code_run_totals(day,repo,views) VALUES(?,?,1) ON CONFLICT(day,repo) DO UPDATE SET views=views+1', [day, repo]); }
      catch (error) { await queryD1('DELETE FROM code_run_views WHERE user_id=? AND repo=? AND day=?', [userId, repo, day]); throw error; }
    }
    return json({ counted: !!inserted.changes });
  } catch (error) { return apiError(error); }
}
