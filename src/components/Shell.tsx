'use client';
import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Bookmark, Compass, Github, Home, LogOut, Search, Sparkles } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export function Shell({ children, authReady, dataReady }: { children: React.ReactNode; authReady: boolean; dataReady: boolean }) {
  const { data: session } = useSession();
  const [search, setSearch] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  function submit(event: FormEvent) { event.preventDefault(); if (search.trim()) router.push(`/search?q=${encodeURIComponent(search.trim())}`); }
  return <div className="site-shell">
    <header className="topbar"><div className="topbar-inner">
      <Link href="/" className="brand" aria-label="Gitium home"><span className="brand-mark"><span>g</span><i /></span><span>gitium<span className="brand-period">.</span></span></Link>
      <form className="top-search" onSubmit={submit}><Search size={18} strokeWidth={2} /><input aria-label="Search people and repositories" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search people, repositories..." /><kbd>↵</kbd></form>
      <div className="top-actions"><span className="live-pill"><span className="live-dot" /> PUBLIC ACTIVITY</span>{session?.user ? <div className="account"><img src={session.user.image || ''} alt="" /><span>{session.user.githubLogin}</span><button type="button" onClick={() => signOut()} title="Sign out" aria-label="Sign out"><LogOut size={16} /></button></div> : authReady ? <button className="signin" onClick={() => signIn('github')}><Github size={16} /> Sign in with GitHub</button> : <span className="config-pill">Preview mode</span>}</div>
    </div></header>
    <div className="layout">
      <aside className="left-rail"><div className="rail-sticky">
        <div className="rail-section-label">YOUR SPACE</div>
        <nav className="main-nav" aria-label="Main navigation"><Link className={pathname === '/' ? 'active' : ''} href="/"><Home size={19} /> Feed</Link><Link className={pathname === '/explore' || pathname === '/search' ? 'active' : ''} href="/explore"><Compass size={19} /> Explore</Link><Link className={pathname === '/saved' ? 'active' : ''} href="/saved"><Bookmark size={19} /> Saved</Link></nav>
        <div className="rail-rule" />
        <div className="rail-note"><span className="note-spark"><Sparkles size={18} /></span><strong>GitHub updates in one feed.</strong><p>Pull requests, releases, and commits from accounts you follow.</p></div>
        <div className="rail-footer">{!dataReady && <p>Social features are waiting for Cloudflare D1 setup.</p>}<span>Gitium · built around GitHub</span><a href="https://github.com/root-Manas/gitium" target="_blank" rel="noopener noreferrer">Source on GitHub ↗</a></div>
      </div></aside>
      <main className="main-column">{children}</main>
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation"><Link className={pathname === '/' ? 'active' : ''} href="/"><Home size={20} />Feed</Link><Link className={pathname === '/explore' || pathname === '/search' ? 'active' : ''} href="/explore"><Compass size={20} />Explore</Link><Link className={pathname === '/saved' ? 'active' : ''} href="/saved"><Bookmark size={20} />Saved</Link></nav>
  </div>;
}
