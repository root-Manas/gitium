'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Type = 'code' | 'accounts';
type Period = 'day' | 'week' | 'month' | 'year';
type Entry = { name: string; score: number };
const periods: { id: Period; label: string }[] = [{ id: 'day', label: 'Today' }, { id: 'week', label: '7 days' }, { id: 'month', label: '30 days' }, { id: 'year', label: 'Year' }];

export function Leaderboard({ type }: { type: Type }) {
  const [period, setPeriod] = useState<Period>('week');
  const [rows, setRows] = useState<Entry[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    fetch(`/api/leaderboards?type=${type}&period=${period}`).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not load leaderboard.'); return data; }).then(data => { if (active) { setRows(data.rows || []); setError(''); } }).catch(problem => { if (active) setError(problem instanceof Error ? problem.message : 'Could not load leaderboard.'); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [type, period]);
  return <section className="insight-card leaderboard"><div className="insight-title"><h3>{type === 'code' ? 'Most explored repositories' : 'Highest account scores'}</h3><span>TOP 10</span></div><div className="leaderboard-tabs">{periods.map(item => <button type="button" key={item.id} className={period === item.id ? 'active' : ''} onClick={() => { if (period !== item.id) { setBusy(true); setPeriod(item.id); } }}>{item.label}</button>)}</div>
    {error ? <p className="status-banner">{error}</p> : busy ? <p className="insight-note">Loading…</p> : rows.length ? <ol className="leaderboard-list">{rows.map((row, index) => <li key={row.name}><span>{String(index + 1).padStart(2, '0')}</span><Link href={type === 'code' ? `/code?repo=${encodeURIComponent(row.name)}` : `/insights?login=${encodeURIComponent(row.name)}`}>{row.name}</Link><b>{type === 'code' ? `${row.score} ${row.score === 1 ? 'run' : 'runs'}` : `$${row.score.toLocaleString()}`}</b></li>)}</ol> : <p className="insight-note">No {type === 'code' ? 'signed-in explorations' : 'account scores'} in this period yet.</p>}
    <p className="insight-note">{type === 'code' ? 'Each signed-in explorer counts once per repository each day.' : 'Scores are illustrative. The highest snapshot in the selected period is shown for each account.'}</p></section>;
}
