# Deployment notes

Gitium runs as a Next.js app on Vercel and uses a Cloudflare Worker in front of D1 for Gitium identity, exploration history, and chat. GitHub OAuth supplies the signed-in account and GitHub API access. The GitHub OAuth app requests `read:user user:follow` so follows can sync in both directions.

The Worker expects a secret named `SERVICE_TOKEN`. The app expects `GITHUB_ID`, `GITHUB_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `CF_D1_WORKER_URL`, and `CF_D1_SERVICE_TOKEN` as server environment variables. The service token must match in both places. No secret should use a `NEXT_PUBLIC_` prefix.

Copy `wrangler.example.jsonc` to the ignored local file `wrangler.jsonc` and supply your own database binding. Actual deployment bindings, local databases and environment files are excluded from Git. Create or update D1 tables with `npm run db:setup`. Deploy the Worker with `npm run worker:deploy`. Gitium follows its connected GitHub repository on Vercel. The OAuth callback URL is `https://gitium.vercel.app/api/auth/callback/github` for the production app.

The public repository contains application code and schema, not access credentials. Database calls originate on the server and require the Worker service secret. A database identifier is not a password; removing local bindings from tracked files is repository hygiene and does not replace authorization. Existing public Git history is not rewritten by this change.

The app is sized for Vercel Hobby and Cloudflare Workers/D1 Free. Signed-in GitHub requests count against each user's GitHub API limits. Chat refreshes every 30 seconds while a room is open and the tab is visible. Public graphs and leaderboards use shared caching. Free plans can impose limits and availability restrictions; review the provider terms before broader use.

Private messages use stable GitHub account IDs. Legacy username-based messages and invitations are not served by the new chat API; never migrate those records by assuming the current username owner is the original participant. New messages use device-verified end-to-end encryption. Earlier plaintext history is read-only except for deletion.

For the encryption release, capture a D1 Time Travel bookmark, apply `npm run db:encryption`, deploy the Worker with the hourly cron from `wrangler.example.jsonc`, then set `GITIUM_E2EE_ENABLED=enabled` in Vercel production before deploying the application. These tables are additive. Keep the existing Worker service secret. The cron removes expired ciphertext in bounded batches after 30 days and delivery receipts after 90 days. The 96 MiB ciphertext budget excludes other tables and indexes; it is not a guarantee of unlimited free usage.

To pause encrypted chat, clear `GITIUM_E2EE_ENABLED` and redeploy the current application. Keep the schema and current plaintext-write rejection in place. Do not roll back to an older application that accepts plaintext messages. See [encryption architecture](ENCRYPTION-CANDIDATE.md) for verification and recovery limits.

After a production build, `npm run test:chat` tests real handlers with synthetic sessions and an in-memory SQLite bridge. It overrides provider settings and GitHub responses; it never connects to the production database.
