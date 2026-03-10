import Link from "next/link";
import { Star, GitFork, TrendingUp, Users, MessageSquare, Search } from "lucide-react";
import { searchRepositories } from "@/lib/github";

export const revalidate = 3600;

const TRENDING_QUERY = "stars:>1000 pushed:>2024-01-01";

export default async function Home() {
  let trendingRepos: any[] = [];

  try {
    const result = await searchRepositories(TRENDING_QUERY + " language:typescript", 1, 6);
    trendingRepos = result.items;
  } catch (error) {
    console.error("Failed to fetch trending repos:", error);
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center py-16 mb-12">
        <h1 className="text-5xl font-bold text-white mb-4">
          Discover GitHub like never before
        </h1>
        <p className="text-xl text-[#8b949e] mb-8 max-w-2xl mx-auto">
          Gitium brings premium analytics, community discussions, and social features to your GitHub experience.
        </p>
        <Link
          href="/search?q=stars:>1000"
          className="inline-flex items-center gap-2 bg-[#238636] hover:bg-[#2ea043] text-white px-6 py-3 rounded-md font-medium transition-colors"
        >
          <Search className="h-5 w-5" />
          Explore Repositories
        </Link>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
          <TrendingUp className="h-8 w-8 text-[#58a6ff] mb-3" />
          <h3 className="text-white font-semibold text-lg mb-2">Premium Analytics</h3>
          <p className="text-[#8b949e] text-sm">Deep insights into repository activity, contributors, languages, and commit history.</p>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
          <MessageSquare className="h-8 w-8 text-[#58a6ff] mb-3" />
          <h3 className="text-white font-semibold text-lg mb-2">Community Discussions</h3>
          <p className="text-[#8b949e] text-sm">Join conversations about any GitHub repository. Comment, discuss, and connect with other developers.</p>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
          <Users className="h-8 w-8 text-[#58a6ff] mb-3" />
          <h3 className="text-white font-semibold text-lg mb-2">Developer Profiles</h3>
          <p className="text-[#8b949e] text-sm">Rich developer profiles with activity graphs, repository showcases, and contribution history.</p>
        </div>
      </div>

      {/* Trending Repositories */}
      {trendingRepos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Trending TypeScript Repositories</h2>
            <Link href="/search?q=stars:>1000 language:typescript" className="text-[#58a6ff] hover:underline text-sm">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingRepos.map((repo: any) => (
              <Link
                key={repo.id}
                href={`/${repo.owner.login}/${repo.name}`}
                className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 hover:border-[#58a6ff] transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <p className="text-[#58a6ff] font-medium truncate">{repo.owner.login}/{repo.name}</p>
                  </div>
                </div>
                <p className="text-[#8b949e] text-sm mb-3 line-clamp-2">{repo.description || "No description"}</p>
                <div className="flex items-center gap-4 text-sm text-[#8b949e]">
                  {repo.language && (
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-[#3178c6]" />
                      {repo.language}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5" />
                    {repo.stargazers_count.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="h-3.5 w-3.5" />
                    {repo.forks_count.toLocaleString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
