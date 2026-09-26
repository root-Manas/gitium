import { authEnabled } from '@/lib/auth';
import { dbConfigured } from '@/lib/d1';
import { getFollowedLogins } from '@/lib/follows';
import { getFeed, getTrendingRepos } from '@/lib/github';
import { Shell } from '@/components/Shell';
import { Sidebar } from '@/components/Sidebar';
import { FeedView } from '@/components/FeedView';
import { LoginButton } from '@/components/LoginButton';

const featured = ['sindresorhus', 'shadcn', 'vercel', 'cloudflare'];

export default async function Home() {
  const [feed, trending, follows] = await Promise.all([
    getFeed(featured).catch(() => ({ events: [], failed: featured.length })),
    getTrendingRepos().catch(() => []),
    getFollowedLogins()
  ]);
  return <Shell authReady={authEnabled()} dataReady={dbConfigured()}><div className="content-grid"><div className="feed-column">
    <section className="hero"><div className="hero-top"><span className="hero-label"><span className="tiny-orbit">✳</span> GITHUB, SORTED</span><span className="hero-no">FOLLOW / FILTER / CLEAR</span></div><h1>See what <em>changed.</em></h1><p>Follow people, filter updates by kind or repository, and clear each item once you&apos;ve read it.</p><LoginButton authReady={authEnabled()} /></section>
    <FeedView discover={feed.events} authReady={authEnabled()} />
  </div><Sidebar repos={trending} follows={follows} socialReady={dbConfigured()} /></div></Shell>;
}
