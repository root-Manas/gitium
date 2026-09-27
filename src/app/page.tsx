import { authEnabled } from '@/lib/auth';
import { dbConfigured } from '@/lib/d1';
import { discoverFromPeople, getFeed } from '@/lib/github';
import { Shell } from '@/components/Shell';
import { FeedView } from '@/components/FeedView';
import { LoginButton } from '@/components/LoginButton';
import { DiscoveryPanel } from '@/components/DiscoveryPanel';
import Link from 'next/link';

const featured = ['sindresorhus', 'jessfraz', 'tj', 'shadcn'];

export default async function Home() {
  const [feed, example] = await Promise.all([
    getFeed(featured).catch(() => ({ events: [], failed: featured.length })),
    discoverFromPeople(['sindresorhus', 'jessfraz', 'tj']).catch(() => ({ projects: [], sources: 0, failed: 3 }))
  ]);
  return <Shell authReady={authEnabled()} dataReady={dbConfigured()}><div className="content-grid discovery-layout"><div className="feed-column">
    <section className="hero"><div className="hero-top"><span className="hero-label"><span className="tiny-orbit">✳</span> GITIUM</span><span className="hero-no">PROJECTS, TOOLS & PEOPLE</span></div><h1>Find your next <em>useful project.</em></h1><p>Browse GitHub projects by language and topic. Find the people behind them, explore the code, and pick something to contribute to.</p><LoginButton authReady={authEnabled()} /></section>
    <nav className="discovery-tabs" aria-label="Find projects"><Link href="/explore">Top projects</Link><Link href="/explore?view=orgs">Organizations</Link><Link href="/explore?view=essentials">Essentials</Link><Link href="/contribute">Find an issue</Link></nav>
    <DiscoveryPanel example={example.projects} />
    <FeedView discover={feed.events} authReady={authEnabled()} />
  </div></div></Shell>;
}
