import { getUserProfile, getUserRepositories } from "@/lib/github";
import Link from "next/link";
import { Star, GitFork, MapPin, Link2, Twitter, Building2 } from "lucide-react";
import { notFound } from "next/navigation";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ owner: string }>;
}) {
  const { owner } = await params;

  let user: any;
  let repos: any[];

  try {
    [user, repos] = await Promise.all([
      getUserProfile(owner),
      getUserRepositories(owner),
    ]);
  } catch {
    notFound();
  }

  const languageColors: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f1e05a",
    Python: "#3572A5",
    Java: "#b07219",
    Go: "#00ADD8",
    Rust: "#dea584",
    "C++": "#f34b7d",
    C: "#555555",
    Ruby: "#701516",
    PHP: "#4F5D95",
    Swift: "#F05138",
    Kotlin: "#A97BFF",
    HTML: "#e34c26",
    CSS: "#563d7c",
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Profile sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user.avatar_url}
              alt={user.login}
              className="w-full max-w-[260px] rounded-full border-2 border-[#30363d] mb-4"
            />
            <h1 className="text-2xl font-bold text-white">{user.name || user.login}</h1>
            <p className="text-xl text-[#8b949e] mb-3">@{user.login}</p>
            {user.bio && <p className="text-[#c9d1d9] text-sm mb-4">{user.bio}</p>}

            <div className="flex items-center gap-4 text-sm text-[#8b949e] mb-4">
              <span>
                <span className="text-white font-semibold">{user.followers.toLocaleString()}</span>{" "}
                followers
              </span>
              <span>
                <span className="text-white font-semibold">{user.following.toLocaleString()}</span>{" "}
                following
              </span>
            </div>

            <div className="space-y-2 text-sm text-[#8b949e]">
              {user.company && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {user.company}
                </div>
              )}
              {user.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {user.location}
                </div>
              )}
              {user.blog && (
                <a
                  href={user.blog.startsWith("http") ? user.blog : `https://${user.blog}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[#58a6ff] hover:underline"
                >
                  <Link2 className="h-4 w-4" />
                  {user.blog}
                </a>
              )}
              {user.twitter_username && (
                <a
                  href={`https://twitter.com/${user.twitter_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[#58a6ff] hover:underline"
                >
                  <Twitter className="h-4 w-4" />
                  @{user.twitter_username}
                </a>
              )}
            </div>

            <a
              href={`https://github.com/${user.login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-white py-2 rounded-md text-sm font-medium transition-colors"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              View on GitHub
            </a>
          </div>
        </div>

        {/* Repositories */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Repositories <span className="text-[#8b949e] font-normal">{user.public_repos}</span>
            </h2>
          </div>
          <div className="space-y-3">
            {repos.map((repo: any) => (
              <div
                key={repo.id}
                className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 hover:border-[#58a6ff] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/${repo.owner.login}/${repo.name}`}
                      className="text-[#58a6ff] font-medium hover:underline"
                    >
                      {repo.name}
                    </Link>
                    {repo.fork && (
                      <span className="ml-2 text-xs text-[#8b949e] border border-[#30363d] px-1.5 py-0.5 rounded-full">
                        Fork
                      </span>
                    )}
                    {repo.description && (
                      <p className="text-[#8b949e] text-sm mt-1">{repo.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-[#8b949e]">
                  {repo.language && (
                    <span className="flex items-center gap-1">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: languageColors[repo.language] || "#8b949e" }}
                      />
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
                  {repo.updated_at && (
                    <span className="text-xs">
                      Updated {new Date(repo.updated_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
