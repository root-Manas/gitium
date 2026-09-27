'use client';
import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, GitPullRequest, MessageCircle, Search } from 'lucide-react';
import { contributionLanguages } from '@/lib/contribute';

type Issue = { id: number; number: number; title: string; url: string; repo: string; summary: string; comments: number; updated: string; labels: string[]; assigned: boolean };
type Results = { issues: Issue[]; total: number; incomplete: boolean; page: number; hasMore: boolean; githubUrl: string };

export function ContributeView({ initialRepo }: { initialRepo: string }) {
  const [language, setLanguage] = useState('');
  const [kind, setKind] = useState(initialRepo ? 'all' : 'first');
  const [repo, setRepo] = useState(initialRepo);
  const [q, setQ] = useState('');
  const [days, setDays] = useState('90');
  const [unassigned, setUnassigned] = useState(true);
  const [params, setParams] = useState(() => new URLSearchParams(initialRepo ? { repo: initialRepo, kind: 'all' } : {}).toString());
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/contribute?${params}`, { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load issues.');
      if (!controller.signal.aborted) setResults(data);
    }).catch(problem => { if (!controller.signal.aborted) { setResults(null); setError(problem instanceof Error ? problem.message : 'Could not load issues.'); } }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [params, retry]);
  function search(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    setParams(new URLSearchParams({ language, kind, repo: repo.trim(), q: q.trim(), days, unassigned: unassigned ? '1' : '0' }).toString());
    setRetry(value => value + 1);
  }
  function page(number: number) { setBusy(true); setError(''); const next = new URLSearchParams(params); next.set('page', String(number)); setParams(next.toString()); }
  function retrySearch() { setBusy(true); setError(''); setRetry(value => value + 1); }
  return <div className="wide-page contribute-page"><div className="page-heading"><span className="eyebrow"><GitPullRequest size={13}/> OPEN SOURCE</span><h1>Find an issue<span>.</span></h1><p>Pick a project, find something you can help with, and start a conversation with its maintainers.</p></div>
    <form className="contribute-filters" onSubmit={search}>
      <label>Experience<select aria-label="Experience" value={kind} onChange={event => setKind(event.target.value)}><option value="first">Good first issue</option><option value="help">Help wanted</option><option value="all">All open issues</option></select></label>
      <label>Language<select aria-label="Language" value={language} onChange={event => setLanguage(event.target.value)}><option value="">Any language</option>{contributionLanguages.map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Updated within<select aria-label="Updated within" value={days} onChange={event => setDays(event.target.value)}><option value="30">30 days</option><option value="90">90 days</option><option value="365">A year</option></select></label>
      <label>Keywords <span>(optional)</span><input aria-label="Keywords" value={q} onChange={event => setQ(event.target.value)} placeholder="e.g. accessibility" maxLength={60}/></label>
      <label>Repository <span>(optional)</span><input aria-label="Repository" value={repo} onChange={event => setRepo(event.target.value)} placeholder="e.g. microsoft/vscode" maxLength={140} spellCheck={false} autoCapitalize="none"/></label>
      <label className="issue-checkbox"><input type="checkbox" checked={unassigned} onChange={event => setUnassigned(event.target.checked)}/> Only unassigned issues</label>
      <button className="issue-search" disabled={busy}><Search size={16}/>{busy ? 'Finding issues…' : 'Find issues'}</button>
    </form>
    <p className="issue-hint">Labels are set by each project. Read its contribution guide and check with a maintainer before starting—an unassigned issue may still have someone working on it.</p>
    {error && <div className="status-banner" role="alert">{error} <button type="button" onClick={retrySearch}>Try again</button></div>}
    <div aria-live="polite" aria-busy={busy}>{busy ? <div className="issue-loading">Looking for open issues on GitHub…</div> : results && <><div className="section-bar"><h2>{results.total.toLocaleString()} matching issues{results.incomplete ? ' (partial results)' : ''}</h2><a href={results.githubUrl} target="_blank" rel="noopener noreferrer">View on GitHub <ArrowUpRight size={13}/></a></div>
      {results.issues.length ? <div className="issue-grid">{results.issues.map(issue => <article className="issue-card" key={issue.id}><div className="issue-repo"><Link href={`/code?repo=${encodeURIComponent(issue.repo)}`}>{issue.repo}</Link><span>#{issue.number}</span></div><h2><a href={issue.url} target="_blank" rel="noopener noreferrer">{issue.title}<ArrowUpRight size={16}/></a></h2><p>{issue.summary || 'Open the issue on GitHub for the details.'}</p><div className="issue-labels">{issue.labels.map(label => <span key={label}>{label}</span>)}</div><div className="issue-meta"><span><MessageCircle size={13}/> {issue.comments}</span><span>{issue.assigned ? 'Assigned' : 'Unassigned'}</span><time dateTime={issue.updated}>Updated {new Date(issue.updated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</time></div><a className="issue-open" href={issue.url} target="_blank" rel="noopener noreferrer">Read issue <ArrowUpRight size={14}/></a></article>)}</div> : <div className="empty-feed"><h3>No issues match these filters</h3><p>Try another language, clear the repository, or switch to all open issues.</p></div>}
      <div className="issue-pagination"><button disabled={results.page === 1} onClick={() => page(results.page - 1)}>Previous</button><span>Page {results.page}</span><button disabled={!results.hasMore} onClick={() => page(results.page + 1)}>Next</button></div></>}</div>
  </div>;
}
