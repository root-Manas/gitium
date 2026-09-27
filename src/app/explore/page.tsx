import { authEnabled } from '@/lib/auth';
import { dbConfigured } from '@/lib/d1';
import { getFollowedLogins } from '@/lib/follows';
import { getFeed, getTrendingRepos } from '@/lib/github';
import { Shell } from '@/components/Shell';
import { EventCard } from '@/components/EventCard';
import { FollowButton } from '@/components/FollowButton';
import { ArrowUpRight, Search, Star } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Explore GitHub projects', description: 'Find open source projects and people through GitHub activity and your network.', alternates: { canonical: '/explore' } };
const people = [
  { login: 'sindresorhus', subtitle: 'Building and maintaining open source' },
  { login: 'jessfraz', subtitle: 'Systems and open source' },
  { login: 'tj', subtitle: 'Developer tools' },
  { login: 'shadcn', subtitle: 'Interfaces and tools' },
  { login: 'microsoft', subtitle: 'Open source at scale' },
  { login: 'github', subtitle: 'Where code happens' }
];

export default async function ExplorePage() {
  const [feed, repos, follows] = await Promise.all([getFeed(people.slice(0, 4).map(person => person.login)).catch(() => ({ events: [], failed: 4 })), getTrendingRepos().catch(() => []), getFollowedLogins()]);
  return <Shell authReady={authEnabled()} dataReady={dbConfigured()}><div className="wide-page"><div className="page-heading"><span className="eyebrow"><Search size={13} /> EXPLORE</span><h1>Find people and projects<span>.</span></h1><p>Follow someone here and your GitHub account follows them too.</p></div>
    <div className="section-bar"><h2>People to add</h2><span>PUBLIC GITHUB ACCOUNTS</span></div><div className="explore-people">{people.map(person => <article className="explore-person" key={person.login}><img src={`https://github.com/${person.login}.png?size=160`} alt="" /><div><Link href={`/u/${person.login}`}>{person.login} <ArrowUpRight size={14} /></Link><p>{person.subtitle}</p></div><FollowButton login={person.login} initial={follows.includes(person.login)} enabled={dbConfigured()} /></article>)}</div>
    <div className="section-bar"><h2>Repositories getting attention</h2><span>CREATED IN THE LAST 30 DAYS</span></div><div className="repo-grid">{repos.map(repo => <a className="repo-card" href={repo.html_url} key={repo.id} target="_blank" rel="noopener noreferrer"><div><img src={repo.owner.avatar_url} alt="" /><ArrowUpRight size={18} /></div><h3>{repo.full_name}</h3><p>{repo.description || 'No description provided.'}</p><footer><span>{repo.language || 'Repository'}</span><span><Star size={14} /> {repo.stargazers_count.toLocaleString()}</span></footer></a>)}</div>
    <div className="section-bar"><h2>Recent public activity</h2><span>DIRECTLY FROM GITHUB</span></div><div className="event-list explore-events">{feed.events.slice(0, 12).map(event => <EventCard key={event.id} event={event} />)}</div>
  </div></Shell>;
}
