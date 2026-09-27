'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Leaderboard } from './Leaderboard';
import { ArrowUpRight, GitCommitHorizontal } from 'lucide-react';

type CodeData = { repo: { name: string; description: string | null; branch: string; url: string }; proof: string; sampled: number; days: { date: string; count: number }[]; authors: { login: string; count: number }[]; commits: { sha: string; url: string; title: string; author: string; date: string }[] };

export function CodeView({ initial }: { initial: string }) {
  const { data: session } = useSession();
  const [input, setInput] = useState(initial);
  const [data, setData] = useState<CodeData | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async (name: string) => {
    if (!name.trim()) return;
    setBusy(true); setError(''); setData(null);
    try {
      const response = await fetch(`/api/code?repo=${encodeURIComponent(name.trim())}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load repository.');
      setData(result);
      window.history.replaceState(null, '', `/code?repo=${encodeURIComponent(result.repo.name)}`);
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Try again.'); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { if (initial) void load(initial); }, [initial, load]);
  useEffect(() => {
    if (session && data) void fetch('/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repo: data.repo.name, proof: data.proof }) }).catch(() => {});
  }, [session, data]);
  function submit(event: FormEvent) { event.preventDefault(); void load(input); }
  const max = Math.max(1, ...(data?.days.map(day => day.count) || []));
  return <div className="wide-page code-page"><div className="page-heading"><span className="eyebrow">CODE GRAPH</span><h1>Explore a repository<span>.</span></h1><p>See when the latest commits landed, who wrote them, and jump straight to the changes.</p></div>
    <form className="insight-search" onSubmit={submit}><GitCommitHorizontal size={18}/><input aria-label="GitHub repository" aria-describedby="code-input-help" value={input} onChange={event => setInput(event.target.value)} placeholder="e.g. root-Manas/gitium" required spellCheck={false} autoCapitalize="none" autoCorrect="off"/><button disabled={busy}>{busy ? 'Loading…' : 'Explore code'}</button></form>
    <div className="code-input-help" id="code-input-help"><p>Enter a <strong>public repository</strong> in either format:</p><ul><li><code>owner/repository</code> — for example, <code>root-Manas/gitium</code></li><li>A full GitHub URL: <code>https://github.com/root-Manas/gitium</code></li></ul><p>A username alone won’t work here. Use <Link href="/insights">Accounts</Link> for a person’s profile.</p><button type="button" disabled={busy} onClick={() => { setInput('root-Manas/gitium'); void load('root-Manas/gitium'); }}>Try it with Gitium <ArrowUpRight size={14}/></button></div>
    {error && <p className="status-banner" role="alert">{error}</p>}
    {data && <><div className="insight-top"><div><span>REPOSITORY / {data.repo.branch}</span><h2>{data.repo.name}</h2><p>{data.repo.description || 'Public GitHub repository'}</p></div><a href={data.repo.url} target="_blank" rel="noopener noreferrer">GitHub <ArrowUpRight size={16}/></a></div>
      <section className="insight-card"><div className="insight-title"><h3>Commit cadence</h3><span>PAST 60 DAYS</span></div><div className="code-graph" role="img" aria-label={`Commit counts by day from the latest ${data.sampled} commits`}>{data.days.map(day => <div className="code-bar" key={day.date} title={`${day.date}: ${day.count} commits`}><i style={{ height: `${day.count ? Math.max(8, day.count / max * 100) : 0}%` }}/></div>)}</div><p className="insight-note">{data.sampled ? `Each bar is one day in the past 60 days. Counts come from the latest ${data.sampled} commits on the default branch, so busy repositories may have more commits than this sample shows.` : 'This repository has no commits on its default branch yet.'}</p></section>
      <div className="insight-columns"><section className="insight-card"><div className="insight-title"><h3>People in this sample</h3></div>{data.authors.map(author => <div className="language-row" key={author.login}><span>{author.login}</span><div><i style={{ width: `${author.count / data.sampled * 100}%` }}/></div><b>{author.count}</b></div>)}</section><section className="insight-card"><div className="insight-title"><h3>Recent commits</h3></div>{data.commits.map(commit => <a className="insight-repo" href={commit.url} target="_blank" rel="noopener noreferrer" key={commit.sha}><span><b>{commit.sha}</b> {commit.title}<small>{commit.author} · {commit.date?.slice(0, 10)}</small></span><ArrowUpRight size={14}/></a>)}</section></div>
      <div className="profile-quicklinks"><Link href={`/contribute?repo=${encodeURIComponent(data.repo.name)}`}>Find issues in this repo <ArrowUpRight size={15}/></Link><Link href="/spaces">Private rooms <ArrowUpRight size={15}/></Link></div></>}
    <Leaderboard type="code" />
  </div>;
}
