# Deployment notes

Gitium runs as a Next.js app on Vercel and uses a Cloudflare Worker in front of D1 for Gitium identity, posts, and chat. GitHub OAuth supplies the signed-in account and GitHub API access. The GitHub OAuth app requests `read:user user:follow` so follows can sync in both directions.

The Worker expects a secret named `SERVICE_TOKEN`. The app expects `GITHUB_ID`, `GITHUB_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `CF_D1_WORKER_URL`, and `CF_D1_SERVICE_TOKEN` as server environment variables. The service token must match in both places. No secret should use a `NEXT_PUBLIC_` prefix.

Create or update D1 tables with `npm run db:setup`. Deploy the Worker with `npm run worker:deploy`. Gitium follows its connected GitHub repository on Vercel. The OAuth callback URL is `https://gitium.vercel.app/api/auth/callback/github` for the production app.

The app is sized for Vercel Hobby and Cloudflare Workers/D1 Free. Signed-in GitHub requests count against each user's GitHub API limits. Chat refreshes every 15 seconds while a room is open. Free plans can impose limits and availability restrictions; review the provider terms before broader use.
