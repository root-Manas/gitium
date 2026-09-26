import { getGitHubFollowing } from './github';

// Button state is loaded from GitHub in the browser after sign-in.
export async function getFollowedLogins(): Promise<string[]> { return []; }

// GitHub is the source of truth. The former D1 follows table is retained only for legacy data.
export async function getNetworkLogins(_userId: string, login: string, token: string): Promise<{ logins: string[]; total: number }> {
  const names = await getGitHubFollowing(login, token);
  return { logins: names.slice(0, 12), total: names.length };
}
