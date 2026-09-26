import { authEnabled } from '@/lib/auth';
import { dbConfigured } from '@/lib/d1';
import { discoverFromPeople, getFeed } from '@/lib/github';
import { Shell } from '@/components/Shell';
import { FeedView } from '@/components/FeedView';
import { LoginButton } from '@/components/LoginButton';
import { DiscoveryPanel } from '@/components/DiscoveryPanel';

const featured = ['sindresorhus', 'jessfraz', 'tj', 'shadcn'];

export default async function Home() {
  const [feed, example] = await Promise.all([
    getFeed(featured).catch(() => ({ events: [], failed: featured.length })),
    discoverFromPeople(['sindresorhus', 'jessfraz', 'tj']).catch(() => ({ projects: [], sources: 0, failed: 3 }))
  ]);
  return <Shell authReady={authEnabled()} dataReady={dbConfigured()}><div className="content-grid discovery-layout"><div className="feed-column">
    <section className="hero"><div className="hero-top"><span className="hero-label"><span className="tiny-orbit">✳</span> GITIUM</span><span className="hero-no">DISCOVER THROUGH YOUR FOLLOWS</span></div><h1>Find projects through <em>people.</em></h1><p>Follow GitHub accounts you trust. See the projects they star, and who else in your list found the same project.</p><LoginButton authReady={authEnabled()} /></section>
    <DiscoveryPanel example={example.projects} />
    <FeedView discover={feed.events} authReady={authEnabled()} />
  </div></div></Shell>;
}
