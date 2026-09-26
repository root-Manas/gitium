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
    <section className="hero"><div className="hero-top"><span className="hero-label"><span className="tiny-orbit">✳</span> PUBLIC GITHUB ACTIVITY</span><span className="hero-no">PULLS / RELEASES / COMMITS</span></div><h1>Follow what<br /><em>ships.</em></h1><p>Pull requests, releases, and commits from people you follow. Read the work where it happened.</p><LoginButton authReady={authEnabled()} /><div className="hero-line"><span className="hero-avatars"><img src="https://github.com/sindresorhus.png?size=80" alt="" /><img src="https://github.com/shadcn.png?size=80" alt="" /><img src="https://github.com/vercel.png?size=80" alt="" /></span><span>Direct links to GitHub</span><span className="hero-arrow">↗</span></div></section>
    <FeedView discover={feed.events} authReady={authEnabled()} />
  </div><Sidebar repos={trending} follows={follows} socialReady={dbConfigured()} /></div></Shell>;
}
