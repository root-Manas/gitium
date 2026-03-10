import { Octokit } from "@octokit/rest";

export function getOctokit(token?: string) {
  return new Octokit({
    auth: token || process.env.GITHUB_TOKEN || undefined,
  });
}

export async function searchRepositories(query: string, page = 1, perPage = 30) {
  const octokit = getOctokit();
  const response = await octokit.rest.search.repos({
    q: query,
    sort: "stars",
    order: "desc",
    per_page: perPage,
    page,
  });
  return response.data;
}

export async function getRepository(owner: string, repo: string) {
  const octokit = getOctokit();
  const response = await octokit.rest.repos.get({ owner, repo });
  return response.data;
}

export async function getRepositoryLanguages(owner: string, repo: string) {
  const octokit = getOctokit();
  const response = await octokit.rest.repos.listLanguages({ owner, repo });
  return response.data;
}

export async function getRepositoryContributors(owner: string, repo: string) {
  const octokit = getOctokit();
  try {
    const response = await octokit.rest.repos.listContributors({
      owner,
      repo,
      per_page: 10,
    });
    return response.data;
  } catch {
    return [];
  }
}

export async function getRepositoryCommits(owner: string, repo: string) {
  const octokit = getOctokit();
  try {
    const response = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 10,
    });
    return response.data;
  } catch {
    return [];
  }
}

export async function getUserProfile(username: string) {
  const octokit = getOctokit();
  const response = await octokit.rest.users.getByUsername({ username });
  return response.data;
}

export async function getUserRepositories(username: string) {
  const octokit = getOctokit();
  const response = await octokit.rest.repos.listForUser({
    username,
    sort: "updated",
    per_page: 30,
  });
  return response.data;
}

export async function getRepositoryTopics(owner: string, repo: string) {
  const octokit = getOctokit();
  try {
    const response = await octokit.rest.repos.getAllTopics({ owner, repo });
    return response.data.names;
  } catch {
    return [];
  }
}
