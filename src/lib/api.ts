import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from './auth';
import { dbConfigured } from './d1';

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function checkWrite(request: NextRequest) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Invalid request origin.' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Expected JSON.' }, 415);
  if (Number(request.headers.get('content-length') || 0) > 4000) return json({ error: 'Request is too large.' }, 413);
  const reader = request.clone().body?.getReader();
  if (reader) {
    let size = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 4000) {
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
  console.error('Gitium API:', error);
  return json({ error: 'The request could not be completed. Try again.' }, 500);
}
