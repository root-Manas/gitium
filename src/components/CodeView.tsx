'use client';
import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, GitCommitHorizontal } from 'lucide-react';

type CodeData = { repo: { name: string; description: string | null; branch: string; url: string }; sampled: number; days: { date: string; count: number }[]; authors: { login: string; count: number }[]; commits: { sha: string; url: string; title: string; author: string; date: string }[] };

export function CodeView({ initial }: { initial: string }) {
  const [input, setInput] = useState(initial);
  const [data, setData] = useState<CodeData | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function load(name: string) {
    if (!name.trim()) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/code?repo=${encodeURIComponent(name.trim())}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load repository.');
      setData(result);
      window.history.replaceState(null, '', `/code?repo=${encodeURIComponent(result.repo.name)}`);
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Try again.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { if (initial) void load(initial); }, [initial]);
  function submit(event: FormEvent) { event.preventDefault(); void load(input); }
  const max = Math.max(1, ...(data?.days.map(day => day.count) || []));
  return <div className="wide-page code-page"><div className="page-heading"><span className="eyebrow">CODE GRAPH</span><h1>Read the shape of a repository<span>.</span></h1><p>See when the latest commits landed, who wrote them, and jump straight to the changes.</p></div>
    <form className="insight-search" onSubmit={submit}><GitCommitHorizontal size={18}/><input aria-label="GitHub repository" value={input} onChange={event => setInput(event.target.value)} placeholder="owner/repository"/><button disabled={busy}>{busy ? 'Loading…' : 'Explore code'}</button></form>
    {error && <p className="status-banner" role="alert">{error}</p>}
    {data && <><div className="insight-top"><div><span>REPOSITORY / {data.repo.branch}</span><h2>{data.repo.name}</h2><p>{data.repo.description || 'Public GitHub repository'}</p></div><a href={data.repo.url} target="_blank" rel="noopener noreferrer">GitHub <ArrowUpRight size={16}/></a></div>
      <section className="insight-card"><div className="insight-title"><h3>Commit cadence</h3><span>LATEST {data.sampled} COMMITS</span></div><div className="code-graph" role="img" aria-label={`Commit counts by day in the latest ${data.sampled} commits`}>{data.days.map(day => <div className="code-bar" key={day.date} title={`${day.date}: ${day.count} commits`}><i style={{ height: `${Math.max(8, day.count / max * 100)}%` }}/></div>)}</div><p className="insight-note">The graph shows dates in the latest {data.sampled} commits on the default branch. It is a sample, not the repository&apos;s full history.</p></section>
      <div className="insight-columns"><section className="insight-card"><div className="insight-title"><h3>People in this sample</h3></div>{data.authors.map(author => <div className="language-row" key={author.login}><span>{author.login}</span><div><i style={{ width: `${author.count / data.sampled * 100}%` }}/></div><b>{author.count}</b></div>)}</section><section className="insight-card"><div className="insight-title"><h3>Recent commits</h3></div>{data.commits.map(commit => <a className="insight-repo" href={commit.url} target="_blank" rel="noopener noreferrer" key={commit.sha}><span><b>{commit.sha}</b> {commit.title}<small>{commit.author} · {commit.date?.slice(0, 10)}</small></span><ArrowUpRight size={14}/></a>)}</section></div>
      <div className="profile-quicklinks"><Link href={`/spaces?kind=repo&target=${encodeURIComponent(data.repo.name)}`}>Posts and chat for this repo <ArrowUpRight size={15}/></Link></div></>}
  </div>;
}
