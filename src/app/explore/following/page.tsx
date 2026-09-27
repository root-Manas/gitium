import { authEnabled } from "@/lib/auth";
import { dbConfigured } from "@/lib/d1";
import { discoverFromPeople, getFeed } from "@/lib/github";
import { Shell } from "@/components/Shell";
import { FeedView } from "@/components/FeedView";
import { DiscoveryPanel } from "@/components/DiscoveryPanel";
import { ExploreTabs } from "@/components/ExploreTabs";

export const metadata = {
  title: "Following",
  alternates: { canonical: "/explore/following" },
};
const featured = ["sindresorhus", "jessfraz", "tj", "shadcn"];
export default async function FollowingPage() {
  const [feed, example] = await Promise.all([
    getFeed(featured).catch(() => ({ events: [], failed: featured.length })),
    discoverFromPeople(featured.slice(0, 3)).catch(() => ({
      projects: [],
      sources: 0,
      failed: 3,
    })),
  ]);
  return (
    <Shell authReady={authEnabled()} dataReady={dbConfigured()}>
      <div className="wide-page explore-v2 following-page">
        <header className="explore-heading">
          <div>
            <h1>
              Your corner of GitHub<span>.</span>
            </h1>
            <p>Projects and updates from the people you follow.</p>
          </div>
        </header>
        <div className="explore-workbench">
          <ExploreTabs view="following" />
        </div>
        <DiscoveryPanel example={example.projects} />
        <FeedView discover={feed.events} authReady={authEnabled()} />
      </div>
    </Shell>
  );
}
