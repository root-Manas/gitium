'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowUpRight, Send } from 'lucide-react';

type Kind = 'user' | 'repo' | 'org';
type Post = { id: string; author_login: string; body: string; created_at: string };

export function PostsView({ initialKind, initialTarget }: { initialKind: Kind; initialTarget: string }) {
  const { data: session } = useSession();
  const [kind, setKind] = useState<Kind>(initialKind);
  const [target, setTarget] = useState(initialTarget);
  const [active, setActive] = useState({ kind: initialKind, target: initialTarget });
  const [posts, setPosts] = useState<Post[]>([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!active.target) return;
    try {
      const response = await fetch(`/api/posts?scope=${active.kind}&target=${encodeURIComponent(active.target)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load posts.');
      setPosts(data.posts || []); setError('');
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not load posts.'); }
  }, [active]);
  useEffect(() => { void load(); }, [load]);
  function open(event: FormEvent) { event.preventDefault(); const name = target.trim().toLowerCase(); if (!name) return; setPosts([]); setActive({ kind, target: name }); window.history.replaceState(null, '', `/posts?kind=${kind}&target=${encodeURIComponent(name)}`); }
  async function publish(event: FormEvent) {
    event.preventDefault(); if (!session) { signIn('github'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: active.kind, target: active.target, body }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not publish.');
      setBody(''); await load();
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not publish.'); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    const response = await fetch('/api/posts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (!response.ok) { const data = await response.json(); setError(data.error || 'Could not delete.'); return; }
    setPosts(previous => previous.filter(post => post.id !== id));
  }
  const canPost = active.kind !== 'user' || session?.user?.githubLogin.toLowerCase() === active.target;
  return <div className="wide-page posts-page"><div className="page-heading"><span className="eyebrow">PUBLIC POSTS</span><h1>Write where it belongs<span>.</span></h1><p>Post on your own profile or add a note about a public repository or organization.</p></div>
    <form className="space-picker" onSubmit={open}><label>Place<select value={kind} onChange={event => setKind(event.target.value as Kind)}><option value="user">Person</option><option value="repo">Repository</option><option value="org">Organization</option></select></label><label>GitHub {kind === 'repo' ? 'owner/repository' : 'name'}<input value={target} onChange={event => setTarget(event.target.value)} placeholder={kind === 'repo' ? 'owner/repository' : 'username or organization'} required/></label><button>Open posts <ArrowUpRight size={15}/></button></form>
    {active.target && <section className="space-board"><div className="space-head"><div><span>{active.kind.toUpperCase()} POSTS</span><h2>{active.target}</h2></div><a href={`https://github.com/${active.target}`} target="_blank" rel="noopener noreferrer">GitHub <ArrowUpRight size={15}/></a></div><p className="space-privacy">Posts are public and show the writer&apos;s GitHub username. Chats are <Link href="/spaces">private</Link>.</p>
      {error && <p className="status-banner" role="alert">{error}</p>}
      <div className="space-items">{posts.length ? posts.map(post => <article className="space-item" key={post.id}><img src={`https://github.com/${post.author_login}.png?size=80`} alt=""/><div><header><Link href={`/u/${post.author_login}`}>{post.author_login}</Link><time>{new Date(post.created_at.replace(' ', 'T') + 'Z').toLocaleString()}</time></header><p>{post.body}</p>{session?.user?.githubLogin.toLowerCase() === post.author_login.toLowerCase() && <button className="space-delete" onClick={() => void remove(post.id)}>Delete</button>}</div></article>) : <p className="space-empty">No posts yet.</p>}</div>
      {canPost ? <form className="space-compose" onSubmit={publish}><label htmlFor="post-body">Write a post</label><textarea id="post-body" value={body} onChange={event => setBody(event.target.value)} maxLength={1500} rows={4} placeholder="What are you working on?"/><div><span>{body.length}/1500</span><button disabled={!body.trim() || busy}>{session ? 'Publish post' : 'Sign in to write'} <Send size={14}/></button></div></form> : <p className="space-privacy">Only {active.target} can post on this profile.</p>}
    </section>}
  </div>;
}
