'use client';
import Link from 'next/link';
import { Bookmark, Check, GitCommitHorizontal, GitFork, GitPullRequest, Package, Plus, Star, ArrowUpRight, CircleDot, LockKeyhole } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import type { FeedEvent } from '@/lib/github';

function glyph(type: string) {
  switch (type) {
    case 'PushEvent': return <GitCommitHorizontal size={18} />;
    case 'PullRequestEvent': return <GitPullRequest size={18} />;
    case 'IssuesEvent': case 'IssueCommentEvent': return <CircleDot size={18} />;
    case 'ReleaseEvent': return <Package size={18} />;
    case 'ForkEvent': return <GitFork size={18} />;
    case 'WatchEvent': return <Star size={18} />;
    default: return <Plus size={18} />;
  }
}

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false }).format(date) + ' UTC';
}

export function EventCard({ event, reviewed = false, onReview }: { event: FeedEvent; reviewed?: boolean; onReview?: () => void }) {
  const saved = useSyncExternalStore(
    callback => { window.addEventListener('gitium-saved-change', callback); return () => window.removeEventListener('gitium-saved-change', callback); },
    () => { try { return !!JSON.parse(localStorage.getItem('gitium-saved') || '{}')[event.id]; } catch { return false; } },
    () => false
  );
  function toggleSave() {
    if (event.isPrivate) return;
    try {
      const items = JSON.parse(localStorage.getItem('gitium-saved') || '{}') as Record<string, FeedEvent>;
      if (items[event.id]) delete items[event.id]; else items[event.id] = event;
      const recent = Object.fromEntries(Object.entries(items).slice(-100));
      localStorage.setItem('gitium-saved', JSON.stringify(recent));
      window.dispatchEvent(new Event('gitium-saved-change'));
    } catch { /* Browser storage can be disabled. */ }
  }
  return <article className="event-card">
    <div className="event-avatar-wrap"><img className="event-avatar" src={event.avatar} alt="" /><span className="event-glyph">{glyph(event.type)}</span></div>
    <div className="event-content">
      <div className="event-meta"><span className="event-type">{event.type.replace(/Event$/, '').replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase()}</span>{event.isPrivate && <span className="private-tag"><LockKeyhole size={11} /> Private</span>}<time dateTime={event.createdAt}>{dateLabel(event.createdAt)}</time></div>
      <p className="event-line"><Link href={`/u/${event.actor}`} className="actor">{event.actor}</Link> <span>{event.action}</span> <a href={`https://github.com/${event.repo}`} target="_blank" rel="noopener noreferrer" className="repo-link">{event.repo}</a></p>
      <a href={event.url} target="_blank" rel="noopener noreferrer" className="event-detail"><span>{event.detail}</span><ArrowUpRight size={16} /></a>
      <div className="event-actions">{onReview && <button type="button" onClick={onReview} className={reviewed ? 'reviewed' : ''}><Check size={16} /> {reviewed ? 'Read' : 'Mark read'}</button>}<button type="button" onClick={toggleSave} disabled={event.isPrivate} title={event.isPrivate ? 'Private activity is not saved in this browser' : undefined} className={saved ? 'saved' : ''}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}</button><a href={event.url} target="_blank" rel="noopener noreferrer">Open on GitHub <ArrowUpRight size={14} /></a></div>
    </div>
  </article>;
}
