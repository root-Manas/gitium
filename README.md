# Gitium

Gitium helps you find projects through people you follow. It looks at their recent public stars, puts shared picks first, and shows who starred each one. You can also keep up with their recent work.

![Gitium feed](docs/preview.png)

## What it does

- **Find projects:** Gitium starts with the people you already follow on GitHub. You can add more people inside Gitium without changing your GitHub account. It shows their recent stars, puts shared picks first, and filters out projects in your most recent stars.
- **Know why a project appeared:** each card names the people in your list who starred it. There is no generated summary or opaque score.
- **Catch up:** read recent work from your GitHub timeline or the people you follow. Filter by update type or repository and mark items read.
- **Search and save:** find people to follow and keep useful links in your browser.
- **Open on GitHub:** go straight to a project or the original commit, issue, pull request, or release.

GitHub's Events API is not real time; GitHub says events can arrive **30 seconds to 6 hours** after they happen. Gitium fetches what GitHub currently exposes and does not run a background crawler.

## Your data

Gitium stores your GitHub user ID, login, avatar URL, last sign-in time, and people you add inside Gitium. It reads your existing GitHub follows, stars, profiles, and activity from GitHub when you use the site; it does not copy them into its database. Saved links and read status stay in your browser. Your GitHub access token stays in an encrypted, HTTP-only session cookie and is not included in the browser session response.

## Local setup

Requires Node.js 24 or newer.

1. Run `npm install`.
2. Create a **GitHub OAuth App** in GitHub Developer Settings. Set homepage to `http://localhost:3000` and callback to `http://localhost:3000/api/auth/callback/github`.
3. Sign in with `npx wrangler login`, then run `npx wrangler d1 create gitium --binding DB --update-config`. Wrangler adds the D1 binding and database ID to `wrangler.jsonc`.
4. Run `npm run db:setup` once to create `users` and `follows` in D1.
5. Generate a random 32-byte secret, set it as the Worker's `SERVICE_TOKEN` with `npx wrangler secret put SERVICE_TOKEN`, and run `npm run worker:deploy`. The Worker URL ends in `.workers.dev`; its `/health` route should report `database: true`.
6. Copy `.env.example` to `.env.local`. Enter the GitHub client ID and secret, a random `NEXTAUTH_SECRET`, the Worker URL as `CF_D1_WORKER_URL`, and the same secret as `CF_D1_SERVICE_TOKEN`. The OAuth app only asks users for `read:user`.
7. Run `npm run dev` and open `http://localhost:3000`.

The public preview works with no credentials. GitHub sign-in needs the OAuth values; following also needs D1. No database files are created locally.

## Vercel deployment

1. Import this GitHub repository into a **personal Vercel Hobby** account as a Next.js project.
2. Add `GITHUB_ID`, `GITHUB_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `CF_D1_WORKER_URL`, and `CF_D1_SERVICE_TOKEN` as server environment variables. `NEXTAUTH_URL` is the final Vercel URL, such as `https://gitium.vercel.app`.
3. Create a production GitHub OAuth App with that URL as homepage and `https://YOUR-DOMAIN/api/auth/callback/github` as callback. Use its client ID and secret in Vercel. A separate app for local development avoids changing callback URLs back and forth.
4. Deploy from Vercel after the Worker and D1 schema are ready. No paid plan or Cloudflare account API token is needed in Vercel.

Keep all secrets server-side. None should use a `NEXT_PUBLIC_` name. Do not commit `.env.local`.

## Free-tier limits

This project is sized for a personal, non-commercial project on [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Cloudflare Workers Free](https://developers.cloudflare.com/workers/platform/pricing/), and [Cloudflare D1 Free](https://developers.cloudflare.com/d1/platform/pricing/). Stay on these free plans: Vercel and Cloudflare limit or pause use at their free caps rather than adding usage charges. GitHub's unauthenticated API limit is 60 requests/hour per originating IP; signed-in requests use the user's OAuth token and are subject to GitHub's own limits. Public event requests are cached for ten minutes to reduce calls.

## Checks

Run `npm test`, `npm run lint`, and `npm run build`.

## License

MIT — see [LICENSE](LICENSE).
