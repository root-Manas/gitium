import { notFound } from "next/navigation";
import {
  getRepository,
  getRepositoryLanguages,
  getRepositoryContributors,
  getRepositoryCommits,
  getRepositoryTopics,
} from "@/lib/github";
import Link from "next/link";
import { Star, GitFork, Eye, AlertCircle, BookOpen, ExternalLink, Clock } from "lucide-react";
import CommentsSection from "@/components/CommentsSection";
import LanguageBar from "@/components/LanguageBar";

export default async function RepoPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;

  let repoData: any;
  let languages: any;
  let contributors: any[];
  let commits: any[];
  let topics: string[];

  try {
    [repoData, languages, contributors, commits, topics] = await Promise.all([
      getRepository(owner, repo),
      getRepositoryLanguages(owner, repo),
      getRepositoryContributors(owner, repo),
      getRepositoryCommits(owner, repo),
      getRepositoryTopics(owner, repo),
    ]);
  } catch {
    notFound();
  }

  const totalBytes = Object.values(languages as Record<string, number>).reduce(
    (sum: number, val: number) => sum + val,
    0
  );

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
    Shell: "#89e051",
    Dockerfile: "#384d54",
    MDX: "#083fa1",
  };

  const languageData = Object.entries(languages as Record<string, number>).map(
    ([name, bytes]) => ({
      name,
      percentage: totalBytes > 0 ? (bytes / totalBytes) * 100 : 0,
      color: languageColors[name] || "#8b949e",
    })
  );

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm mb-4">
        <Link href={`/${owner}`} className="text-[#58a6ff] hover:underline">
          {owner}
        </Link>
        <span className="text-[#8b949e]">/</span>
        <span className="text-white font-semibold">{repo}</span>
        {repoData.private && (
          <span className="ml-2 text-xs border border-[#8b949e] text-[#8b949e] px-1.5 py-0.5 rounded-full">
            Private
          </span>
        )}
        {repoData.fork && (
          <span className="ml-2 text-xs border border-[#8b949e] text-[#8b949e] px-1.5 py-0.5 rounded-full">
            Fork
          </span>
        )}
      </div>

      {/* Description */}
      {repoData.description && (
        <p className="text-[#8b949e] mb-4">{repoData.description}</p>
      )}

      {/* Stats */}
      <div className="flex flex-wrap gap-4 mb-6 text-sm text-[#8b949e]">
        <a href={repoData.html_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#58a6ff]">
          <ExternalLink className="h-4 w-4" /> View on GitHub
        </a>
        <span className="flex items-center gap-1">
          <Star className="h-4 w-4" />
          {repoData.stargazers_count.toLocaleString()} stars
        </span>
        <span className="flex items-center gap-1">
          <GitFork className="h-4 w-4" />
          {repoData.forks_count.toLocaleString()} forks
        </span>
        <span className="flex items-center gap-1">
          <Eye className="h-4 w-4" />
          {repoData.watchers_count.toLocaleString()} watching
        </span>
        <span className="flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {repoData.open_issues_count.toLocaleString()} issues
        </span>
        {repoData.license && (
          <span className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            {repoData.license.spdx_id}
          </span>
        )}
      </div>

      {/* Topics */}
      {topics && topics.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {topics.map((topic) => (
            <Link
              key={topic}
              href={`/search?q=topic:${topic}`}
              className="text-xs text-[#58a6ff] bg-[#388bfd1a] border border-[#58a6ff33] px-3 py-1 rounded-full hover:bg-[#388bfd33]"
            >
              {topic}
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Language Bar */}
          {languageData.length > 0 && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
              <h2 className="text-white font-semibold mb-4">Languages</h2>
              <LanguageBar languages={languageData} />
              <div className="flex flex-wrap gap-3 mt-3">
                {languageData.map((lang) => (
                  <span key={lang.name} className="flex items-center gap-1.5 text-sm text-[#8b949e]">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: lang.color }}
                    />
                    {lang.name}
                    <span className="text-[#6e7681]">{lang.percentage.toFixed(1)}%</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent Commits */}
          {commits && commits.length > 0 && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
              <h2 className="text-white font-semibold mb-4">Recent Commits</h2>
              <div className="space-y-3">
                {commits.slice(0, 7).map((commit: any) => (
                  <div key={commit.sha} className="flex items-start gap-3 py-2 border-b border-[#21262d] last:border-0">
                    {commit.author?.avatar_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={commit.author.avatar_url}
                        alt={commit.author.login}
                        className="w-6 h-6 rounded-full mt-0.5"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[#c9d1d9] text-sm truncate">
                        {commit.commit.message.split("\n")[0]}
                      </p>
                      <p className="text-[#8b949e] text-xs mt-0.5">
                        {commit.author?.login || commit.commit.author?.name} ·{" "}
                        {new Date(commit.commit.author?.date || "").toLocaleDateString()}
                      </p>
                    </div>
                    <a
                      href={commit.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#8b949e] font-mono text-xs hover:text-[#58a6ff] shrink-0"
                    >
                      {commit.sha.slice(0, 7)}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <CommentsSection owner={owner} repo={repo} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Repository Info */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3">About</h3>
            <div className="space-y-2 text-sm text-[#8b949e]">
              {repoData.homepage && (
                <a
                  href={repoData.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[#58a6ff] hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  {repoData.homepage}
                </a>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Created {new Date(repoData.created_at).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Updated {new Date(repoData.updated_at).toLocaleDateString()}
              </div>
              {repoData.default_branch && (
                <div>Default branch: <span className="text-[#c9d1d9]">{repoData.default_branch}</span></div>
              )}
              {repoData.size && (
                <div>Size: <span className="text-[#c9d1d9]">{(repoData.size / 1024).toFixed(1)} MB</span></div>
              )}
            </div>
          </div>

          {/* Contributors */}
          {contributors && contributors.length > 0 && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3">
                Contributors ({contributors.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {contributors.map((contributor: any) => (
                  <Link
                    key={contributor.id}
                    href={`/${contributor.login}`}
                    title={`${contributor.login} (${contributor.contributions} commits)`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={contributor.avatar_url}
                      alt={contributor.login}
                      className="w-8 h-8 rounded-full border border-[#30363d] hover:border-[#58a6ff]"
                    />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
