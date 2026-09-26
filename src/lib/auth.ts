import type { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import { queryD1, dbConfigured } from './d1';

export const authEnabled = () => !!(process.env.GITHUB_ID && process.env.GITHUB_SECRET && process.env.NEXTAUTH_SECRET);

export const authOptions: NextAuthOptions = {
  providers: [GitHubProvider({ clientId: process.env.GITHUB_ID || 'not-configured', clientSecret: process.env.GITHUB_SECRET || 'not-configured', authorization: { params: { scope: 'read:user user:follow' } } })],
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'local-development-only-change-me' : undefined),
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === 'github' && profile && dbConfigured()) {
        const github = profile as { id?: number; login?: string; avatar_url?: string };
        if (github.id && github.login) {
          try {
            await queryD1(`INSERT INTO users(github_id,github_login,avatar_url) VALUES(?,?,?)
              ON CONFLICT(github_id) DO UPDATE SET github_login=excluded.github_login,avatar_url=excluded.avatar_url,last_seen_at=datetime('now')`,
              [String(github.id), github.login, github.avatar_url || '']);
          } catch (error) { console.error('Could not sync Gitium user:', error); }
        }
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === 'github' && profile) {
        const github = profile as { id?: number; login?: string; avatar_url?: string };
        token.githubId = String(github.id || token.sub || '');
        token.githubLogin = github.login || '';
        token.avatar = github.avatar_url || '';
        token.githubAccessToken = account.access_token || '';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.githubId || token.sub || '');
        session.user.githubLogin = String(token.githubLogin || '');
        session.user.image = String(token.avatar || session.user.image || '');
      }
      return session;
    }
  }
};
