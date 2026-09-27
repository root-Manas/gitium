import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from './auth';
import { dbConfigured } from './d1';
import { GitHubError } from './github';

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function checkWrite(request: NextRequest, maxBytes = 4000) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Invalid request origin.' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Expected JSON.' }, 415);
  if (Number(request.headers.get('content-length') || 0) > maxBytes) return json({ error: 'Request is too large.' }, 413);
  const reader = request.clone().body?.getReader();
  if (reader) {
    let size = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > maxBytes) {
          void reader.cancel();
          return json({ error: 'Request is too large.' }, 413);
        }
      }
    } finally { reader.releaseLock(); }
  }
  return null;
}

export async function currentUser() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ? session.user : null;
}

export function requireD1() { return dbConfigured() ? null : json({ error: 'This service is temporarily unavailable.' }, 503); }

export function apiError(error: unknown) {
  if (error instanceof GitHubError) {
    if (error.status === 401) return json({ error: error.message, code: 'GITHUB_RECONNECT' }, 401);
    if (error.status === 403 || error.status === 429) return json({ error: error.message }, 429);
    if (error.status === 404) return json({ error: 'Not found on GitHub.' }, 404);
    return json({ error: 'GitHub is temporarily unavailable.' }, 502);
  }
  console.error('Gitium API:', error);
  return json({ error: 'The request could not be completed. Try again.' }, 500);
}
