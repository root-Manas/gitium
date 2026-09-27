import { authEnabled } from '@/lib/auth';
import { dbConfigured } from '@/lib/d1';
import { searchPeople } from '@/lib/github';
import { Shell } from '@/components/Shell';
import { FollowButton } from '@/components/FollowButton';
import { DefaultSearch } from '@/components/SiteSearch';
import { ExploreTabs } from '@/components/ExploreTabs';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'People on GitHub', robots: { index: false, follow: true }, alternates: { canonical: '/search' } };
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = String((await searchParams).q || '').trim().slice(0, 80);
  const result = await searchPeople(query).catch(() => null);
  return <Shell pageSearch authReady={authEnabled()} dataReady={dbConfigured()}>
    <div className="wide-page explore-v2 people-page">
      <header className="explore-heading"><h1>People<span>.</span></h1></header>
      <div className="explore-workbench"><div className="explore-toolbar"><ExploreTabs view="people"/><DefaultSearch key={query} scope="people" initial={query}/></div></div>
      <div className="section-bar"><h2>{query ? `Matches for “${query}”` : 'Popular on GitHub'}</h2>{result && <span>{result.users.length} profiles{result.incomplete ? ' · partial results' : ''}</span>}</div>
      {!result ? <div className="empty-feed" role="status"><h3>GitHub search is unavailable</h3><p>Please try again shortly.</p><a href={`/search${query ? `?q=${encodeURIComponent(query)}` : ''}`}>Retry</a></div> : result.users.length ?
        <div className="explore-people">{result.users.map(person => <article className="explore-person" key={person.id}>
          <img src={person.avatar_url} alt="" width={48} height={48}/><div><Link href={`/u/${person.login}`}>{person.login}<ArrowUpRight size={14}/></Link><a className="person-github" href={person.html_url} target="_blank" rel="noopener noreferrer">GitHub profile</a></div><FollowButton login={person.login} initial={false} enabled={authEnabled()}/>
        </article>)}</div> : <div className="empty-feed"><h3>No matching people</h3><p>Try a GitHub username or a shorter name.</p><Link href="/search">Browse people</Link></div>}
    </div>
  </Shell>;
}
