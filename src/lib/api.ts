import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from './auth';
import { dbConfigured } from './d1';

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export function checkWrite(request: NextRequest) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Invalid request origin.' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Expected JSON.' }, 415);
  if (Number(request.headers.get('content-length') || 0) > 4000) return json({ error: 'Request is too large.' }, 413);
  return null;
}

export async function currentUser() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ? session.user : null;
}

export function requireD1() { return dbConfigured() ? null : json({ error: 'Following is temporarily unavailable.' }, 503); }

export function apiError(error: unknown) {
  console.error('Gitium API:', error);
  return json({ error: 'The request could not be completed. Try again.' }, 500);
}
