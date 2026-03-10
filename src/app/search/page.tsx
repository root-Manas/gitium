import { searchRepositories } from "@/lib/github";
import Link from "next/link";
import { Star, GitFork, Eye, Clock } from "lucide-react";
import SearchForm from "./SearchForm";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const page = parseInt(params.page || "1");

  let results: any = null;
  let error: string | null = null;

  if (query) {
    try {
      results = await searchRepositories(query, page, 20);
    } catch (err: any) {
      error = err?.message || "Failed to search repositories";
    }
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
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <div className="mb-6">
        <SearchForm initialQuery={query} />
      </div>

      {error && (
        <div className="bg-[#161b22] border border-[#f85149] rounded-lg p-4 text-[#f85149] mb-6">
          {error}
        </div>
      )}

      {results && (
        <>
          <p className="text-[#8b949e] text-sm mb-4">
            {results.total_count.toLocaleString()} repository results for &quot;{query}&quot;
          </p>

          <div className="space-y-3">
            {results.items.map((repo: any) => (
              <div
                key={repo.id}
                className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 hover:border-[#58a6ff] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/${repo.owner.login}/${repo.name}`}
                      className="text-[#58a6ff] font-semibold text-lg hover:underline"
                    >
                      {repo.owner.login}/{repo.name}
                    </Link>
                    {repo.description && (
                      <p className="text-[#8b949e] mt-1 text-sm">{repo.description}</p>
                    )}
                    {repo.topics && repo.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {repo.topics.slice(0, 5).map((topic: string) => (
                          <span
                            key={topic}
                            className="text-xs text-[#58a6ff] bg-[#388bfd1a] border border-[#58a6ff33] px-2 py-0.5 rounded-full"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {repo.owner?.avatar_url && (
                    <Link href={`/${repo.owner.login}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={repo.owner.avatar_url}
                        alt={repo.owner.login}
                        className="w-8 h-8 rounded-full border border-[#30363d] ml-4"
                      />
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-3 text-sm text-[#8b949e]">
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
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {repo.watchers_count.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Updated {new Date(repo.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {page > 1 && (
              <Link
                href={`/search?q=${encodeURIComponent(query)}&page=${page - 1}`}
                className="px-4 py-2 bg-[#21262d] border border-[#30363d] rounded-md text-sm text-[#c9d1d9] hover:border-[#58a6ff]"
              >
                ← Previous
              </Link>
            )}
            <span className="text-[#8b949e] text-sm">Page {page}</span>
            {results.items.length === 20 && (
              <Link
                href={`/search?q=${encodeURIComponent(query)}&page=${page + 1}`}
                className="px-4 py-2 bg-[#21262d] border border-[#30363d] rounded-md text-sm text-[#c9d1d9] hover:border-[#58a6ff]"
              >
                Next →
              </Link>
            )}
          </div>
        </>
      )}

      {!query && (
        <div className="text-center py-16 text-[#8b949e]">
          <p className="text-lg">Enter a search query to find repositories</p>
          <p className="text-sm mt-2">Try searching for &quot;react&quot; or &quot;machine learning&quot;</p>
        </div>
      )}
    </div>
  );
}
