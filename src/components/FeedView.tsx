'use client';
import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { ArrowRight, Github, Radio, RefreshCw } from 'lucide-react';
import type { FeedEvent } from '@/lib/github';
import { EventCard } from './EventCard';

type Tab = 'github' | 'following' | 'discover';

export function FeedView({ discover, authReady }: { discover: FeedEvent[]; authReady: boolean }) {
  const { data: session, status } = useSession();
  const [selectedTab, setTab] = useState<Tab | null>(null);
  const tab = selectedTab || (session?.user ? 'github' : 'discover');
  const [personal, setPersonal] = useState<FeedEvent[] | null>(null);
  const [following, setFollowing] = useState<FeedEvent[] | null>(null);
  const [message, setMessage] = useState('');

  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId || tab === 'discover') return;
    let alive = true;
    fetch(`/api/feed?tab=${tab}`, { cache: 'no-store' }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load activity.');
      if (alive) { if (tab === 'github') setPersonal(data.events); else setFollowing(data.events); if (data.failed) setMessage(`${data.failed} account${data.failed > 1 ? 's' : ''} could not be loaded from GitHub.`); }
    }).catch(problem => { if (alive) { setMessage(problem instanceof Error ? problem.message : 'Could not load activity.'); if (tab === 'github') setPersonal([]); else setFollowing([]); } });
    return () => { alive = false; };
  }, [userId, tab]);

  const current = tab === 'github' ? personal : tab === 'following' ? following : discover;
  const loading = current === null;
  const events = current || [];
  return <section className="feed-section">
    <div className="feed-title-row"><div><span className="eyebrow"><Radio size={12} /> ACTIVITY FEED</span><h2>What&apos;s happening</h2></div><span className="feed-count">{events.length} updates</span></div>
    <div className="feed-tabs" role="tablist" aria-label="Feed view"><button role="tab" aria-selected={tab === 'github'} className={tab === 'github' ? 'active' : ''} onClick={() => session ? setTab('github') : signIn('github')} disabled={status === 'loading' || (!session && !authReady)}>My GitHub</button><button role="tab" aria-selected={tab === 'following'} className={tab === 'following' ? 'active' : ''} onClick={() => session ? setTab('following') : signIn('github')} disabled={status === 'loading' || (!session && !authReady)}>Following</button><button role="tab" aria-selected={tab === 'discover'} className={tab === 'discover' ? 'active' : ''} onClick={() => setTab('discover')}>Discover</button></div>
    {tab === 'github' && !session && <div className="feed-banner"><Github size={22} /><div><strong>Your GitHub timeline lives here.</strong><p>Sign in to read your received activity directly from GitHub.</p></div><button onClick={() => signIn('github')}>Sign in <ArrowRight size={15} /></button></div>}
    {message && <div className="status-banner" role="status">{message}</div>}
    {loading ? <div className="loading-feed"><RefreshCw size={20} className="spin" /> Reading GitHub activity...</div> : events.length ? <div className="event-list">{events.map(event => <EventCard key={event.id} event={event} />)}</div> : <div className="empty-feed"><span className="empty-symbol">∿</span><h3>{tab === 'following' ? 'No recent activity from your connections' : tab === 'github' ? 'Your GitHub feed is quiet' : 'No public updates right now'}</h3><p>{tab === 'following' ? 'Follow a few developers from Explore to see their public work here.' : tab === 'github' ? 'GitHub may take a while to surface new events. Check back later.' : 'GitHub may be rate limited. Try again shortly.'}</p><a href="/explore">Explore people <ArrowRight size={15} /></a></div>}
    <div className="feed-end">YOU&apos;RE ALL CAUGHT UP <span>✳</span> MORE WORK IS ALWAYS IN PROGRESS</div>
  </section>;
}
