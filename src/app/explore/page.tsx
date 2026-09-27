import { authEnabled } from "@/lib/auth";
import { dbConfigured } from "@/lib/d1";
import { loadExplore } from "@/lib/explore-server";
import { Shell } from "@/components/Shell";
import { ExploreView } from "@/components/ExploreView";
export const metadata = {
  title: "Find useful GitHub projects and organizations",
  description:
    "Search top GitHub projects, discover organizations and browse more than 1,000 essential open source tools by category.",
  alternates: { canonical: "/explore" },
};
export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams(
    Object.entries(raw).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : [],
    ),
  );
  const initial = await loadExplore(params).catch(() => null);
  return (
    <Shell authReady={authEnabled()} dataReady={dbConfigured()}>
      <ExploreView
        key={params.toString()}
        initialParams={params.toString()}
        initial={initial}
      />
    </Shell>
  );
}
