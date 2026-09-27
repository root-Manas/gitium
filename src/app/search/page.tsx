import { authEnabled } from '@/lib/auth';
import { dbConfigured } from '@/lib/d1';
import { getFollowedLogins } from '@/lib/follows';
import { searchGitHub } from '@/lib/github';
import { Shell } from '@/components/Shell';
import { FollowButton } from '@/components/FollowButton';
import { ArrowUpRight, Search, Star } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Search', robots: { index: false, follow: true }, alternates: { canonical: '/search' } };
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = String((await searchParams).q || '').trim().slice(0, 80);
  const [results, follows] = await Promise.all([searchGitHub(query).then(data => ({ ...data, unavailable: false })).catch(() => ({ users: [], repos: [], unavailable: true })), getFollowedLogins()]);
  return <Shell authReady={authEnabled()} dataReady={dbConfigured()}><div className="wide-page"><div className="page-heading"><span className="eyebrow"><Search size={13} /> SEARCH GITHUB</span><h1>{query ? <>Results for <em>{query}</em><span>.</span></> : <>Find something good<span>.</span></>}</h1><p>People and public repositories from GitHub.</p></div>{results.unavailable && <p className="status-banner" role="status">GitHub search is unavailable right now. Try again later.</p>}
    <div className="section-bar"><h2>People</h2><span>{results.users.length} RESULTS</span></div>{results.users.length ? <div className="explore-people">{results.users.map(person => <article className="explore-person" key={person.login}><img src={person.avatar_url} alt="" /><div><Link href={`/u/${person.login}`}>{person.login} <ArrowUpRight size={14} /></Link><p>GitHub profile</p></div><FollowButton login={person.login} initial={follows.includes(person.login.toLowerCase())} enabled={dbConfigured()} /></article>)}</div> : <p className="empty-row">No people found.</p>}
    <div className="section-bar"><h2>Repositories</h2><span>{results.repos.length} RESULTS</span></div>{results.repos.length ? <div className="repo-grid">{results.repos.map(repo => <a className="repo-card" href={repo.html_url} key={repo.id} target="_blank" rel="noopener noreferrer"><div><img src={repo.owner.avatar_url} alt="" /><ArrowUpRight size={18} /></div><h3>{repo.full_name}</h3><p>{repo.description || 'No description provided.'}</p><footer><span>{repo.language || 'Repository'}</span><span><Star size={14} /> {repo.stargazers_count.toLocaleString()}</span></footer></a>)}</div> : <p className="empty-row">No repositories found.</p>}
  </div></Shell>;
}
