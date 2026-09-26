'use client';
import { FormEvent, useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowUpRight, Send } from 'lucide-react';

type Item = { id: string; author_login: string; body: string; created_at: string };
type Kind = 'user' | 'repo' | 'org' | 'dm';

export function SpaceView({ initialKind, initialTarget }: { initialKind: Kind; initialTarget: string }) {
  const { data: session } = useSession();
  const [kind, setKind] = useState<Kind>(initialKind);
  const [target, setTarget] = useState(initialTarget);
  const [active, setActive] = useState({ kind: initialKind, target: initialTarget });
  const [tab, setTab] = useState<'posts' | 'chat'>(initialKind === 'dm' ? 'chat' : 'posts');
  const [items, setItems] = useState<Item[]>([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const endpoint = tab === 'posts' ? 'posts' : 'messages';
  async function refresh() {
    if (!active.target) return;
    try {
      const response = await fetch(`/api/${endpoint}?scope=${active.kind}&target=${encodeURIComponent(active.target)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load this space.');
      setItems(data[endpoint === 'posts' ? 'posts' : 'messages'] || []);
      setError('');
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Try again.'); }
  }
  useEffect(() => { void refresh(); if (tab !== 'chat' || !session) return; const timer = setInterval(() => void refresh(), 15000); return () => clearInterval(timer); }, [active, tab, session]);
  function open(event: FormEvent) {
    event.preventDefault();
    const next = target.trim().toLowerCase(); if (!next) return;
    setItems([]); setError(''); setActive({ kind, target: next }); setTab(kind === 'dm' ? 'chat' : 'posts');
    window.history.replaceState(null, '', `/spaces?kind=${kind}&target=${encodeURIComponent(next)}`);
  }
  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!session) { signIn('github'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: active.kind, target: active.target, body }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not publish.');
      setBody(''); await refresh();
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Try again.'); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    setError('');
    try {
      const response = await fetch(`/api/${endpoint}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not delete.');
      setItems(items.filter(item => item.id !== id));
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Try again.'); }
  }
  const ownProfile = active.kind !== 'user' || session?.user?.githubLogin?.toLowerCase() === active.target;
  return <div className="wide-page spaces-page"><div className="page-heading"><span className="eyebrow">GITIUM SPACES</span><h1>Talk where the work lives<span>.</span></h1><p>Write on your profile, talk about a repository or organization, or start a private direct chat.</p></div>
    <form className="space-picker" onSubmit={open}><label>Space<select value={kind} onChange={event => setKind(event.target.value as Kind)}><option value="user">Person</option><option value="repo">Repository</option><option value="org">Organization</option><option value="dm">Direct chat</option></select></label><label>GitHub {kind === 'repo' ? 'owner/repository' : 'username or organization'}<input value={target} onChange={event => setTarget(event.target.value)} placeholder={kind === 'repo' ? 'owner/repository' : 'username'}/></label><button>Open space <ArrowUpRight size={15}/></button></form>
    {active.target && <section className="space-board"><div className="space-head"><div><span>{active.kind.toUpperCase()} SPACE</span><h2>{active.target}</h2></div>{active.kind !== 'dm' && <a href={`https://github.com/${active.target}`} target="_blank" rel="noopener noreferrer">GitHub <ArrowUpRight size={15}/></a>}</div><div className="space-tabs">{active.kind !== 'dm' && <button className={tab === 'posts' ? 'active' : ''} onClick={() => setTab('posts')}>Posts</button>}{active.kind !== 'user' && <button className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>Chat</button>}</div>
      <p className="space-privacy">{active.kind === 'dm' ? 'Direct messages are visible only to the two Gitium accounts in this conversation.' : 'Posts and room chat are public. Your GitHub username appears beside what you write.'}</p>
      {error && <p className="status-banner" role="alert">{error}</p>}
      <div className="space-items">{items.length ? items.map(item => <article className="space-item" key={item.id}><img src={`https://github.com/${item.author_login}.png?size=80`} alt=""/><div><header><Link href={`/u/${item.author_login}`}>{item.author_login}</Link><time>{new Date(item.created_at.replace(' ', 'T') + 'Z').toLocaleString()}</time></header><p>{item.body}</p>{session?.user?.githubLogin?.toLowerCase() === item.author_login.toLowerCase() && <button className="space-delete" type="button" onClick={() => void remove(item.id)}>Delete</button>}</div></article>) : <p className="space-empty">No {tab} yet. Start the conversation.</p>}</div>
      {ownProfile ? <form className="space-compose" onSubmit={publish}><label htmlFor="space-body">{tab === 'posts' ? 'Write a post' : 'Write a message'}</label><textarea id="space-body" value={body} onChange={event => setBody(event.target.value)} maxLength={tab === 'posts' ? 1500 : 500} rows={tab === 'posts' ? 4 : 2} placeholder={tab === 'posts' ? 'What are you working on?' : 'Say something useful…'}/><div><span>{body.length}/{tab === 'posts' ? 1500 : 500}</span><button disabled={busy || !body.trim()}>{session ? (tab === 'posts' ? 'Publish post' : 'Send message') : 'Sign in to write'} <Send size={14}/></button></div></form> : <p className="space-privacy">Only {active.target} can write posts on this profile. <Link href={`/u/${active.target}`}>View profile</Link></p>}
    </section>}
  </div>;
}
