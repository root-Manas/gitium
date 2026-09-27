import { githubGet, GitHubRepo, GitHubUser } from "./github";
import { exploreQuery } from "./explore";
export type ExploreResults = {
  repos: GitHubRepo[];
  orgs: GitHubUser[];
  total: number;
  incomplete: boolean;
  page: number;
};
export async function loadExplore(
  params: URLSearchParams,
): Promise<ExploreResults> {
  const search = exploreQuery(params);
  if (search.view === "essentials")
    return { repos: [], orgs: [], total: 0, incomplete: false, page: 1 };
  const result = await githubGet<{
    items: GitHubRepo[] | GitHubUser[];
    total_count: number;
    incomplete_results: boolean;
  }>(
    `/search/${search.view === "orgs" ? "users" : "repositories"}?q=${encodeURIComponent(search.query)}&sort=${search.sort}&order=desc&per_page=18&page=${search.page}`,
    900,
  );
  return {
    repos: search.view === "projects" ? (result.items as GitHubRepo[]) : [],
    orgs: search.view === "orgs" ? (result.items as GitHubUser[]) : [],
    total: result.total_count,
    incomplete: result.incomplete_results,
    page: search.page,
  };
}
