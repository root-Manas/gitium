'use client';
import { useCallback, useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { Bookmark, Compass, Star } from 'lucide-react';
import Link from 'next/link';
import type { FeedEvent } from '@/lib/github';
import { PageSearch } from './SiteSearch';
import { ApiNotice } from './ApiNotice';
import { EventCard } from './EventCard';

type Starred = { id: number; name: string; description: string | null; url: string; language: string | null; stars: number };

export function SavedView() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<'saved' | 'stars'>('saved');
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [stars, setStars] = useState<Starred[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const load = () => { try { setEvents((Object.values(JSON.parse(localStorage.getItem('gitium-saved') || '{}')) as FeedEvent[]).filter(event => !event.isPrivate).reverse()); } catch { setEvents([]); } };
    load(); window.addEventListener('gitium-saved-change', load); return () => window.removeEventListener('gitium-saved-change', load);
  }, []);
  const loadStars = useCallback(async (page: number) => {
    if (!session) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/stars?page=${page}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not import stars.');
      setStars(previous => page === 1 ? data.repos : [...previous, ...data.repos]);
      setNextPage(data.nextPage);
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not import stars.'); }
    finally { setBusy(false); }
  }, [session]);
  useEffect(() => { if (tab === 'stars' && session) void loadStars(1); }, [tab, session, loadStars]);
  function selectStars() { setTab('stars'); }
  const visible = stars.filter(repo => `${repo.name} ${repo.description || ''} ${repo.language || ''}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="wide-page"><div className="page-heading"><span className="eyebrow"><Bookmark size={13}/> YOUR LIBRARY</span><h1>Saved<span>.</span></h1><p>Saved here · stars from GitHub.</p></div>
    <PageSearch scope="saved" value={query} onChange={setQuery} onSubmit={() => {}} placeholder="Filter saved items…" />
    <div className="library-tabs"><button className={tab === 'saved' ? 'active' : ''} onClick={() => setTab('saved')}><Bookmark size={15}/> Saved activity</button><button className={tab === 'stars' ? 'active' : ''} onClick={selectStars}><Star size={15}/> GitHub stars</button></div>
    {tab === 'saved' ? events.length ? <div className="event-list saved-list">{events.filter(event => `${event.repo} ${event.detail}`.toLowerCase().includes(query.toLowerCase())).map(event => <EventCard key={event.id} event={event}/>)}</div> : <div className="empty-feed"><span className="empty-symbol"><Bookmark size={35}/></span><h3>Nothing saved yet</h3><p>Keep a useful commit, release, or pull request here for later.</p><Link href="/explore"><Compass size={16}/> Explore activity</Link></div> : !session ? <div className="empty-feed"><h3>Your GitHub stars, in one place</h3><p>Sign in to import your stars.</p><button onClick={() => signIn('github')}>Sign in with GitHub</button></div> : <><div className="stars-toolbar"><span>{stars.length} loaded</span></div>{error && <ApiNotice message={error} retry={() => void loadStars(1)} />}<div className="stars-grid">{visible.map(repo => <article className="star-card" key={repo.id}><a href={repo.url} target="_blank" rel="noopener noreferrer"><h3>{repo.name}</h3><p>{repo.description || 'No description on GitHub.'}</p></a><footer><span>{repo.language || 'Repository'} · ★ {repo.stars.toLocaleString()}</span><Link href={`/code?repo=${encodeURIComponent(repo.name)}`}>Code graph →</Link></footer></article>)}</div>{busy && <p className="insight-note">Importing stars…</p>}{!busy && nextPage && <button className="discovery-more" onClick={() => void loadStars(nextPage)}>Load more stars</button>}{!busy && !error && !stars.length && nextPage === null && <p className="empty-row">You haven’t starred any repositories yet.</p>}{!busy && !visible.length && stars.length > 0 && <p className="empty-row">No loaded stars match that filter.</p>}</>}
  </div>;
}
