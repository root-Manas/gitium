'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowUpRight, Compass, Star } from 'lucide-react';
import Link from 'next/link';
import type { ProjectRecommendation } from '@/lib/github';

type DiscoveryResult = { projects: ProjectRecommendation[]; sources: number; failed: number; followsCount: number };

export function DiscoveryPanel({ example }: { example: ProjectRecommendation[] }) {
  const { data: session, status } = useSession();
  const [personal, setPersonal] = useState<{ userId: string; result: DiscoveryResult } | null>(null);
  const [error, setError] = useState('');
  const [sharedOnly, setSharedOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    async function load() {
      try {
        const response = await fetch('/api/recommendations', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load your projects.');
        if (active) { setPersonal({ userId: userId!, result: data }); setError(''); }
      } catch (problem) { if (active) setError(problem instanceof Error ? problem.message : 'Could not load your projects.'); }
    }
    load();
    function refresh() { if (active) load(); }
    window.addEventListener('gitium-follow-change', refresh);
    return () => { active = false; window.removeEventListener('gitium-follow-change', refresh); };
  }, [userId]);

  const result = personal && personal.userId === userId ? personal.result : null;
  const projects = userId ? result?.projects || [] : example;
  const visible = useMemo(() => sharedOnly ? projects.filter(item => item.starredBy.length > 1) : projects, [projects, sharedOnly]);
  const waiting = status === 'loading' || (!!userId && !result && !error);

  return <section className="discovery-section" id="discover-projects" aria-labelledby="discovery-title">
    <div className="discovery-heading"><div><span className="eyebrow"><Compass size={12} /> FIND PROJECTS</span><h2 id="discovery-title">Found through people you follow</h2><p>See repositories people in your list have starred. Each card tells you who found it.</p></div><Link href="/explore">Find people <ArrowUpRight size={15} /></Link></div>
    <div className="discovery-toolbar"><span>{userId ? result ? `${result.sources} people · ${projects.length} projects` : 'Loading your list' : 'Example from public accounts'}</span><label><input type="checkbox" checked={sharedOnly} onChange={event => setSharedOnly(event.target.checked)} /> Starred by more than one person</label></div>
    {error && <p className="status-banner" role="status">{error}</p>}
    {waiting ? <div className="discovery-empty">Finding projects from people you follow...</div> : userId && result?.followsCount === 0 ? <div className="discovery-empty"><strong>No followed accounts found.</strong><p>Follow someone on GitHub or add people in Explore. Their starred projects will appear here.</p><Link href="/explore">Find people <ArrowUpRight size={15} /></Link></div> : visible.length ? <><div className="discovery-grid">{visible.slice(0, showAll ? 12 : 6).map(item => <article className="discovery-card" key={item.repo.id}><div className="discovery-card-head"><img src={item.repo.owner.avatar_url} alt="" /><a href={item.repo.html_url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.repo.full_name} on GitHub`}><ArrowUpRight size={17} /></a></div><h3><a href={item.repo.html_url} target="_blank" rel="noopener noreferrer">{item.repo.full_name}</a></h3><p>{item.repo.description || 'No description on GitHub.'}</p><div className="discovery-card-meta"><span>{item.repo.language || 'Repository'}</span><span><Star size={12} /> {item.repo.stargazers_count.toLocaleString()}</span></div><div className="discovery-reason">Starred by {item.starredBy.map((login, index) => <span key={login}>{index > 0 && ', '}<Link href={`/u/${login}`}>{login}</Link></span>)}</div></article>)}</div>{visible.length > 6 && <button className="discovery-more" type="button" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show fewer' : `Show all ${visible.length} projects`}</button>}</> : <div className="discovery-empty"><strong>{sharedOnly ? 'No shared picks in this list.' : 'No projects found yet.'}</strong><p>{sharedOnly ? 'Turn off the shared filter to see individual picks.' : 'Try following people who star public repositories.'}</p></div>}
    {!userId && !waiting && <p className="discovery-footnote">This is an example. Log in and follow people to see projects from your own list.</p>}
  </section>;
}
