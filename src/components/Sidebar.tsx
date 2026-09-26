import Link from 'next/link';
import { ArrowUpRight, GitFork, Star } from 'lucide-react';
import type { GitHubRepo } from '@/lib/github';
import { FollowButton } from './FollowButton';

const people = [
  { login: 'sindresorhus', detail: 'Open source maintainer' },
  { login: 'shadcn', detail: 'UI tools and components' },
  { login: 'vercel', detail: 'Web platform' },
  { login: 'cloudflare', detail: 'Internet infrastructure' }
];

export function Sidebar({ repos, follows, socialReady }: { repos: GitHubRepo[]; follows: string[]; socialReady: boolean }) {
  return <aside className="right-rail"><div className="right-sticky">
    <div className="side-card discover-card"><div className="side-card-head"><span>PEOPLE TO WATCH</span><Link href="/explore">See all <ArrowUpRight size={13} /></Link></div><div className="people-list">{people.map(person => <div className="person-row" key={person.login}><img src={`https://github.com/${person.login}.png?size=80`} alt="" /><div><Link href={`/u/${person.login}`}>{person.login}</Link><small>{person.detail}</small></div><FollowButton login={person.login} initial={follows.includes(person.login)} enabled={socialReady} /></div>)}</div></div>
    <div className="side-card trending-card"><div className="side-card-head"><span>NEW &amp; STARRED</span><span className="side-period">LAST 30 DAYS</span></div>{repos.length ? <div className="trending-list">{repos.slice(0, 4).map((repo, index) => <a href={repo.html_url} target="_blank" rel="noopener noreferrer" key={repo.id} className="trending-row"><span className="trend-index">0{index + 1}</span><div><strong>{repo.full_name}</strong><p>{repo.description || 'A new repository on GitHub.'}</p><span className="trend-stats"><Star size={13} /> {repo.stargazers_count.toLocaleString()} <GitFork size={13} /> {repo.forks_count.toLocaleString()}</span></div><ArrowUpRight size={15} /></a>)}</div> : <p className="side-empty">Trending repositories are unavailable right now.</p>}</div>
    <p className="side-disclaimer">Gitium reads activity from GitHub. Event delivery can lag behind the work itself.</p>
  </div></aside>;
}
