type RepoSignal = { stargazers_count: number; fork?: boolean; archived?: boolean; pushed_at?: string | null };

export function estimateAccount(contributions: number, followers: number, repos: RepoSignal[], now = new Date()) {
  const owned = repos.filter(repo => !repo.fork);
  const stars = owned.reduce((sum, repo) => sum + Math.max(0, repo.stargazers_count || 0), 0);
  const active = owned.filter(repo => !repo.archived && repo.pushed_at && now.getTime() - new Date(repo.pushed_at).getTime() <= 180 * 86400000).length;
  const stale = owned.filter(repo => !repo.archived && (!repo.pushed_at || now.getTime() - new Date(repo.pushed_at).getTime() > 730 * 86400000)).length;
  const archived = owned.filter(repo => repo.archived).length;
  const forks = repos.length - owned.length;
  const concentrated = stars >= 100 && Math.max(0, ...owned.map(repo => repo.stargazers_count || 0)) / stars >= 0.75;
  const gains = {
    yearlyWork: Math.round(Math.min(Math.max(contributions, 0), 2500) * 2),
    audience: Math.round(Math.min(Math.max(followers, 0), 5000) * 8),
    stars: Math.round(Math.min(stars, 10000) * 3),
    maintainedRepos: Math.min(active, 40) * 80
  };
  const deductions = {
    staleRepos: Math.min(stale, 50) * 45,
    archivedRepos: Math.min(archived, 30) * 30,
    forks: Math.min(forks, 50) * 10,
    oneHitWonder: concentrated ? Math.round(gains.stars * 0.25) : 0,
    noRecentWork: active === 0 ? 300 : 0
  };
  const value = Math.max(0, 100 + Object.values(gains).reduce((a, b) => a + b, 0) - Object.values(deductions).reduce((a, b) => a + b, 0));
  let remark = 'A few commits in the bank. The portfolio is still finding its voice.';
  if (active === 0) remark = 'The repos have gone quiet. Even the README is checking its watch.';
  else if (concentrated) remark = 'One repo is paying the rent for the whole account.';
  else if (value >= 50000) remark = 'Okay, this account has pull. Please remember us when you buy the internet.';
  else if (value >= 10000) remark = 'Recruiters might start pretending they discovered you first.';
  else if (value >= 2500) remark = 'There is work here. The stars have started to notice.';
  return { value, stars, active, stale, archived, forks, concentrated, gains, deductions, remark };
}
