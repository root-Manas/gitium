import { NextRequest, NextResponse } from 'next/server';
import { apiError, json, requireD1 } from '@/lib/api';
import { queryD1 } from '@/lib/d1';

export async function GET(request: NextRequest) {
  const unavailable = requireD1(); if (unavailable) return unavailable;
  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const period = url.searchParams.get('period');
  if (!['code', 'accounts'].includes(type || '') || !['day', 'week', 'month', 'year'].includes(period || '')) return json({ error: 'Choose a leaderboard and time period.' }, 400);
  const days = { day: 1, week: 7, month: 30, year: 365 }[period as 'day' | 'week' | 'month' | 'year'];
  const since = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  try {
    const rows = type === 'code'
      ? await queryD1<{ name: string; score: number }>('SELECT repo AS name,SUM(views) AS score FROM code_run_totals WHERE day>=? GROUP BY repo ORDER BY score DESC,repo ASC LIMIT 10', [since])
      : await queryD1<{ name: string; score: number }>('SELECT login AS name,MAX(value_usd) AS score FROM account_runs WHERE day>=? GROUP BY login ORDER BY score DESC,login ASC LIMIT 10', [since]);
    return NextResponse.json({ type, period, rows }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
  } catch (error) { return apiError(error); }
}
