'use client';
import { FormEvent, useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { ArrowUpRight, Search } from 'lucide-react';

type Insight = { login: string; avatar: string; contributions: number; followers: number; stars: number; publicRepos: number; sampledRepos: number; value: number; languages: { name: string; count: number }[]; weeks: { contributionDays: { date: string; contributionCount: number }[] }[]; repos: { name: string; stars: number; language: string | null; url: string }[] };
type Point = { day: string; value: number };

export function InsightsView({ initial }: { initial: string }) {
  const { data: session } = useSession();
  const [input, setInput] = useState(initial);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [history, setHistory] = useState<Point[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function load(login: string) {
    if (!login.trim()) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/insights?login=${encodeURIComponent(login.trim())}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load insights.');
      setInsight(data);
      const key = `gitium-value:${data.login.toLowerCase()}`;
      const old: Point[] = JSON.parse(localStorage.getItem(key) || '[]');
      const next = [...old.filter(item => item.day !== new Date().toISOString().slice(0, 10)), { day: new Date().toISOString().slice(0, 10), value: data.value }].slice(-90);
      localStorage.setItem(key, JSON.stringify(next)); setHistory(next);
      window.history.replaceState(null, '', `/insights?login=${encodeURIComponent(data.login)}`);
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Try again.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { if (session && initial) void load(initial); }, [session, initial]);
  function submit(event: FormEvent) { event.preventDefault(); if (!session) { signIn('github'); return; } void load(input); }
  const maxDay = Math.max(1, ...(insight?.weeks.flatMap(week => week.contributionDays.map(day => day.contributionCount)) || []));
  return <div className="wide-page insight-page"><div className="page-heading"><span className="eyebrow">ACCOUNT INSIGHTS</span><h1>See the work behind an account<span>.</span></h1><p>Explore a year of contributions, the languages in recent repositories, and a transparent Gitium estimate.</p></div>
    <form className="insight-search" onSubmit={submit}><Search size={18}/><input aria-label="GitHub username" value={input} onChange={event => setInput(event.target.value)} placeholder="GitHub username"/><button disabled={busy}>{busy ? 'Loading…' : session ? 'Explore account' : 'Sign in to explore'}</button></form>
    {error && <p className="status-banner" role="alert">{error}</p>}
    {insight && <><div className="insight-top"><img src={insight.avatar} alt=""/><div><span>ACCOUNT / {insight.login}</span><h2>{insight.login}</h2><p>{insight.contributions.toLocaleString()} contributions in the past year</p></div><a href={`/u/${insight.login}`}>Profile <ArrowUpRight size={16}/></a></div>
      <section className="insight-card"><div className="insight-title"><h3>Code graph</h3><span>PAST 12 MONTHS</span></div><div className="heatmap-scroll"><div className="heatmap" role="img" aria-label={`${insight.contributions} GitHub contributions in the past year`}>{insight.weeks.map((week, index) => <div className="heat-week" key={index}>{week.contributionDays.map(day => <span key={day.date} title={`${day.date}: ${day.contributionCount} contributions`} style={{ '--heat': day.contributionCount / maxDay } as React.CSSProperties}/>)}</div>)}</div></div><p className="insight-note">Each square is a day. Darker squares have more GitHub contributions.</p></section>
      <div className="insight-columns"><section className="insight-card"><div className="insight-title"><h3>Account estimate</h3><span>GITIUM FORMULA</span></div><strong className="value-number">${insight.value.toLocaleString()}</strong><p className="insight-note">An illustrative score in dollars, not a sale price or financial valuation. Formula: $500 base + $2 per yearly contribution + $25 per follower + $10 per star in up to 100 recently updated repositories + $15 per public repository. Inputs are capped to limit outliers.</p><div className="metric-grid"><span><b>{insight.followers.toLocaleString()}</b> followers</span><span><b>{insight.stars.toLocaleString()}</b> sampled stars</span><span><b>{insight.publicRepos.toLocaleString()}</b> public repositories</span><span><b>{insight.sampledRepos}</b> repositories sampled</span></div>{history.length > 1 && <div className="value-history"><h4>Tracked in this browser</h4>{history.map(point => <span key={point.day}>{point.day} · ${point.value.toLocaleString()}</span>)}</div>}</section>
      <section className="insight-card"><div className="insight-title"><h3>Languages</h3><span>RECENT REPOSITORIES</span></div>{insight.languages.length ? insight.languages.map(item => <div className="language-row" key={item.name}><span>{item.name}</span><div><i style={{ width: `${item.count / insight.sampledRepos * 100}%` }}/></div><b>{item.count}</b></div>) : <p className="insight-note">No languages reported in sampled repositories.</p>}<div className="insight-title repo-title"><h3>Most starred in sample</h3></div>{insight.repos.map(repo => <a className="insight-repo" href={repo.url} target="_blank" rel="noopener noreferrer" key={repo.name}><span>{repo.name}</span><b>★ {repo.stars.toLocaleString()}</b></a>)}</section></div></>}
  </div>;
}
