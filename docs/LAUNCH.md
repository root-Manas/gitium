# Gitium launch kit

Live app: https://gitium.vercel.app
Source: https://github.com/root-Manas/gitium
Maker: https://manasraj.vercel.app

## Product Hunt draft

**Name:** Gitium

**Tagline:** Discover GitHub projects through people you follow

**Description:** Find repositories your GitHub network has starred, import your own stars, explore commit graphs, and compare account scores with a visible formula. Publish posts or invite people into private chats. Free to use, with light and dark themes.

**Maker comment:**

I built Gitium because my next useful GitHub repo usually comes from someone I follow. I wanted a quick way to see what those people were finding, especially when several of them starred the same project.

You can bring your stars over, inspect a repo's recent commits, or try the account score. The dollar figure is a game: inactive projects and forks can bring it down, and the formula is visible. There are also public posts and invitation-only chats.

I'd like to know which project you found useful, and what you couldn't find. Chat has access controls, but end-to-end encryption is still being developed locally.

## X draft

I made Gitium to find repos through people I follow on GitHub.

See their stars overlap, explore a repo's commits, import your own stars, or try the account score (yes, neglected repos lose points).

Free to try: https://gitium.vercel.app

What repo should I explore next?

## Before posting

1. Use your personal Product Hunt maker account. Complete the account eligibility period if it is new. Add the live app and GitHub source link; claim an existing Gitium product page if one already exists.
2. Upload the app logo, the link-preview image at `/opengraph-image`, and real screenshots of discovery, a populated graph, account score, and stars. Avoid screenshots with private messages or personal account data.
3. Record a 30–45 second demo: find a recommended repo, explain who starred it, open its graph, then show the transparent score. Focus on the result rather than reading a feature list.
4. Run one signed-in journey on the live app: OAuth, follows, stars, graph, score, invite, send, remove. Check the link preview on the actual draft composer.
5. Publish the X post yourself from your account; add one follow-up showing a specific useful discovery. Share the Product Hunt launch with people who asked to hear about it. Ask for feedback; do not buy votes or spam communities.

## Measure the first week

- Day 1: respond to questions and fix broken journeys. Track completed explorations and scores, not just visits.
- Days 2–3: share an interesting repo discovered through Gitium, credit its maintainer, and explain why it was useful.
- Days 4–7: ship the most common usability fix and post the before/after. Compare returning explorers with first-day traffic.
- Treat leaderboards as community activity, not a growth guarantee. Rankings are vulnerable to coordinated accounts; do not attach rewards or money to them.

## Free usage and limits

Public code responses and leaderboards advertise five-minute shared caches with stale responses permitted for a further ten minutes. GitHub's anonymous public fetches use server caching. Personal stars, chats and authenticated feeds are never shared-cached. Chat polls once every thirty seconds only while visible. Writes, room sizes and imports are bounded.

Free tiers have finite capacity. D1 may stop queries at daily free limits; Vercel Hobby also has usage and personal/non-commercial restrictions. No automatic paid upgrade is part of this app. Watch the provider dashboards during launch and reduce polling or temporarily disable writes if quotas approach their limits. More concurrent users cannot be guaranteed at zero cost.

## Status

Draft copy and assets are prepared in the repository. No Product Hunt product has been registered and no X or Product Hunt announcement has been posted by this work. Those actions require the maker's signed-in account and a chosen launch date.

Sources: [Product Hunt launch guide](https://www.producthunt.com/launch), [posting a product](https://help.producthunt.com/en/articles/479557-how-to-post-a-product), [launch rules](https://www.producthunt.com/launch/how-product-hunt-works), [Vercel Hobby](https://vercel.com/docs/plans/hobby), [D1 free-tier enforcement](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/).
