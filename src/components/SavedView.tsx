'use client';
import { useEffect, useState } from 'react';
import { Bookmark, Compass } from 'lucide-react';
import Link from 'next/link';
import type { FeedEvent } from '@/lib/github';
import { EventCard } from './EventCard';

export function SavedView() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  useEffect(() => {
    const load = () => { try { setEvents(Object.values(JSON.parse(localStorage.getItem('gitium-saved') || '{}')).reverse() as FeedEvent[]); } catch { setEvents([]); } };
    load(); window.addEventListener('gitium-saved-change', load); return () => window.removeEventListener('gitium-saved-change', load);
  }, []);
  return <div className="wide-page"><div className="page-heading"><span className="eyebrow"><Bookmark size={13} /> YOUR READING LIST</span><h1>Saved for later<span>.</span></h1><p>Items you save stay in this browser. Gitium does not copy them into its database.</p></div>{events.length ? <div className="event-list saved-list">{events.map(event => <EventCard key={event.id} event={event} />)}</div> : <div className="empty-feed"><span className="empty-symbol"><Bookmark size={35} /></span><h3>Nothing saved yet</h3><p>Keep a useful commit, release, or pull request here for later.</p><Link href="/explore"><Compass size={16} /> Explore activity</Link></div>}</div>;
}
