'use client';
import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Bookmark, Compass, Github, Home, LogOut, Search, MessageCircle, ChartNoAxesCombined, Moon, Sun, GitCommitHorizontal, GitPullRequest } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export function Shell({ children, authReady, dataReady }: { children: React.ReactNode; authReady: boolean; dataReady: boolean }) {
  const { data: session } = useSession();
  const [search, setSearch] = useState('');
  function toggleTheme() { const next = document.documentElement.dataset.theme !== 'dark'; document.documentElement.dataset.theme = next ? 'dark' : 'light'; localStorage.setItem('gitium-theme', next ? 'dark' : 'light'); }
  const pathname = usePathname();
  const router = useRouter();
  function submit(event: FormEvent) { event.preventDefault(); if (search.trim()) router.push(`/search?q=${encodeURIComponent(search.trim())}`); }
  return <div className="site-shell">
    <header className="topbar"><div className="topbar-inner">
      <Link href="/" className="brand" aria-label="Gitium home"><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="13" stroke="currentColor" strokeWidth="1.6" opacity=".6"/><path d="M24 5v5M24 38v5M5 24h5M38 24h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="m19 29 4.2-10.2L33 15l-4 10-10 4Z" fill="#ee8b70"/><path d="m23.2 18.8 5.8 6.2L19 29l4.2-10.2Z" fill="white"/><circle cx="24" cy="24" r="2" fill="#202743"/></svg></span><span>gitium<span className="brand-period">.</span></span></Link>
      <form className="top-search" onSubmit={submit}><Search size={18} strokeWidth={2} /><input aria-label="Search people and repositories" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search people, repositories..." /><kbd>↵</kbd></form>
      <div className="top-actions"><button className="theme-toggle" type="button" onClick={toggleTheme} aria-label="Toggle color theme"><Moon className="theme-moon" size={17}/><Sun className="theme-sun" size={17}/></button>{session?.user ? <div className="account"><Link href={`/u/${session.user.githubLogin}`} aria-label="Your Gitium profile"><img src={session.user.image || ''} alt="" /><span>{session.user.githubLogin}</span></Link><button type="button" onClick={() => signOut()} title="Sign out" aria-label="Sign out"><LogOut size={16} /></button></div> : authReady ? <button className="signin" onClick={() => signIn('github')}><Github size={16} /><span className="signin-desktop">Sign in with GitHub</span><span className="signin-mobile">Log in</span></button> : <span className="config-pill">Preview mode</span>}</div>
    </div></header>
    <div className="layout">
      <aside className="left-rail"><div className="rail-sticky">
        <div className="rail-section-label">YOUR SPACE</div>
        <nav className="main-nav" aria-label="Main navigation"><Link className={pathname === '/' ? 'active' : ''} href="/"><Home size={19} /> Feed</Link><Link className={pathname === '/explore' || pathname === '/search' ? 'active' : ''} href="/explore"><Compass size={19} /> Explore</Link><Link className={pathname === '/code' ? 'active' : ''} href="/code"><GitCommitHorizontal size={19} /> Code graph</Link><Link className={pathname === '/insights' ? 'active' : ''} href="/insights"><ChartNoAxesCombined size={19} /> Accounts</Link><Link className={pathname === '/contribute' ? 'active' : ''} href="/contribute"><GitPullRequest size={19} /> Find an issue</Link><Link className={pathname === '/spaces' ? 'active' : ''} href="/spaces"><MessageCircle size={19} /> Private chat</Link><Link className={pathname === '/saved' ? 'active' : ''} href="/saved"><Bookmark size={19} /> Saved</Link></nav>
        <div className="rail-footer">{!dataReady && <p>Some account features are temporarily unavailable.</p>}<span>Gitium</span><a href="https://github.com/root-Manas/gitium" target="_blank" rel="noopener noreferrer">Source on GitHub ↗</a></div>
      </div></aside>
      <main className="main-column">{children}</main>
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation"><Link className={pathname === '/' ? 'active' : ''} href="/"><Home size={19} />Feed</Link><Link className={pathname === '/explore' || pathname === '/search' ? 'active' : ''} href="/explore"><Compass size={19} />Explore</Link><Link className={pathname === '/code' ? 'active' : ''} href="/code"><GitCommitHorizontal size={19} />Code</Link><Link className={pathname === '/insights' ? 'active' : ''} href="/insights"><ChartNoAxesCombined size={19} />Value</Link><Link className={pathname === '/contribute' ? 'active' : ''} href="/contribute"><GitPullRequest size={19} />Issues</Link><Link className={pathname === '/spaces' ? 'active' : ''} href="/spaces"><MessageCircle size={19} />Chat</Link><Link className={pathname === '/saved' ? 'active' : ''} href="/saved"><Bookmark size={19} />Saved</Link></nav>
  </div>;
}
