'use client';
import { FormEvent, useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { ArrowUpRight, Search } from 'lucide-react';
import { Leaderboard } from './Leaderboard';

type Estimate = { value: number; stars: number; active: number; stale: number; archived: number; forks: number; concentrated: boolean; gains: Record<string, number>; deductions: Record<string, number>; remark: string };
type Insight = { login: string; avatar: string; contributions: number; followers: number; publicRepos: number; sampledRepos: number; estimate: Estimate; languages: { name: string; count: number }[]; weeks: { contributionDays: { date: string; contributionCount: number }[] }[]; repos: { name: string; stars: number; language: string | null; url: string }[] };
type Point = { day: string; value: number };
const labels: Record<string, string> = { yearlyWork: 'Yearly contributions', audience: 'Followers', stars: 'Stars on owned repos', maintainedRepos: 'Recently maintained repos', staleRepos: 'Stale repos', archivedRepos: 'Archived repos', forks: 'Fork-heavy sample', oneHitWonder: 'One repo dominates the stars', noRecentWork: 'No recent repo activity' };

export function InsightsView({ initial }: { initial: string }) {
  const { data: session } = useSession();
  const [input, setInput] = useState(initial);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [history, setHistory] = useState<Point[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function load(login: string) {
    if (!login.trim()) return;
    setBusy(true); setError(''); setInsight(null);
    try {
      const response = await fetch(`/api/insights?login=${encodeURIComponent(login.trim())}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load insights.');
      setInsight(data);
      try {
        const key = `gitium-value:${data.login.toLowerCase()}`;
        const old: Point[] = JSON.parse(localStorage.getItem(key) || '[]');
        const day = new Date().toISOString().slice(0, 10);
        const next = [...old.filter(item => item.day !== day), { day, value: data.estimate.value }].slice(-90);
        localStorage.setItem(key, JSON.stringify(next)); setHistory(next);
      } catch { setHistory([]); }
      window.history.replaceState(null, '', `/insights?login=${encodeURIComponent(data.login)}`);
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Try again.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { if (session && initial) void load(initial); }, [session, initial]);
  function submit(event: FormEvent) { event.preventDefault(); if (!session) { signIn('github'); return; } void load(input); }
  const maxDay = Math.max(1, ...(insight?.weeks.flatMap(week => week.contributionDays.map(day => day.contributionCount)) || []));
  return <div className="wide-page insight-page"><div className="page-heading"><span className="eyebrow">ACCOUNT INSIGHTS</span><h1>What is this account worth<span>?</span></h1><p>See the work, the audience, and the parts of the account that are gathering dust. The price tag is a game with an open formula.</p></div>
    <form className="insight-search" onSubmit={submit}><Search size={18}/><input aria-label="GitHub username" value={input} onChange={event => setInput(event.target.value)} placeholder="GitHub username"/><button disabled={busy}>{busy ? 'Loading…' : session ? 'Score account' : 'Sign in to score'}</button></form>
    {error && <p className="status-banner" role="alert">{error}</p>}
    {insight && <><div className="insight-top"><img src={insight.avatar} alt=""/><div><span>ACCOUNT / {insight.login}</span><h2>{insight.login}</h2><p>{insight.contributions.toLocaleString()} contributions in the past year</p></div><a href={`/u/${insight.login}`}>Profile <ArrowUpRight size={16}/></a></div>
      <section className="insight-card"><div className="insight-title"><h3>Contribution graph</h3><span>PAST 12 MONTHS</span></div><div className="heatmap-scroll"><div className="heatmap" role="img" aria-label={`${insight.contributions} GitHub contributions in the past year`}>{insight.weeks.map((week, index) => <div className="heat-week" key={index}>{week.contributionDays.map(day => <span key={day.date} title={`${day.date}: ${day.contributionCount} contributions`} style={{ '--heat': day.contributionCount / maxDay } as React.CSSProperties}/>)}</div>)}</div></div><p className="insight-note">Each square is a day. Darker squares have more GitHub contributions.</p></section>
      <div className="insight-columns"><section className="insight-card"><div className="insight-title"><h3>The Gitium price tag</h3><span>ILLUSTRATIVE SCORE</span></div><strong className="value-number">${insight.estimate.value.toLocaleString()}</strong><p className="value-remark">{insight.estimate.remark}</p><p className="insight-note">This is a playful score, not a market price, income estimate, or financial valuation. It uses the latest 100 owned or forked public repos and one year of contributions. The score starts at $100 and cannot fall below zero. Additions and deductions are shown below.</p><div className="value-breakdown"><strong>What adds value</strong>{Object.entries(insight.estimate.gains).map(([key, amount]) => <div key={key}><span>{labels[key]}</span><b>+${amount.toLocaleString()}</b></div>)}<strong>What drags it down</strong>{Object.entries(insight.estimate.deductions).filter(([, amount]) => amount > 0).map(([key, amount]) => <div className="negative" key={key}><span>{labels[key]}</span><b>−${amount.toLocaleString()}</b></div>)}</div><details className="score-formula"><summary>How the formula works</summary><p>Contributions: $2 each, up to 2,500. Followers: $8 each, up to 5,000. Owned-repo stars: $3 each, up to 10,000. Repos updated within 180 days: $80 each, up to 40.</p><p>Repos untouched for two years lose $45 each (up to 50); archived repos lose $30 (up to 30); forks lose $10 (up to 50). No recently maintained repo costs $300. When one repo holds at least 75% of 100 or more stars, 25% of star points are deducted. This measures a limited sample, not code quality or a person’s ability.</p></details><div className="metric-grid"><span><b>{insight.followers.toLocaleString()}</b> followers</span><span><b>{insight.estimate.stars.toLocaleString()}</b> owned-repo stars</span><span><b>{insight.estimate.active}</b> maintained recently</span><span><b>{insight.estimate.stale}</b> stale repositories</span></div>{history.length > 1 && <div className="value-history"><h4>Tracked in this browser</h4>{history.map(point => <span key={point.day}>{point.day} · ${point.value.toLocaleString()}</span>)}</div>}</section>
      <section className="insight-card"><div className="insight-title"><h3>Languages</h3><span>{insight.sampledRepos} RECENT REPOSITORIES</span></div>{insight.languages.length ? insight.languages.map(item => <div className="language-row" key={item.name}><span>{item.name}</span><div><i style={{ width: `${insight.sampledRepos ? item.count / insight.sampledRepos * 100 : 0}%` }}/></div><b>{item.count}</b></div>) : <p className="insight-note">No languages reported in sampled repositories.</p>}<div className="insight-title repo-title"><h3>Most starred in sample</h3></div>{insight.repos.map(repo => <a className="insight-repo" href={repo.url} target="_blank" rel="noopener noreferrer" key={repo.name}><span>{repo.name}</span><b>★ {repo.stars.toLocaleString()}</b></a>)}</section></div></>}
    <Leaderboard type="accounts" />
  </div>;
}
