# Gitium launch plan

Live app: https://gitium.vercel.app/explore
Source: https://github.com/root-Manas/gitium
Maker: https://manasraj.vercel.app

## What to lead with

**Find useful GitHub projects and somewhere to contribute.** Show a real search, a useful result, and an issue someone could work on. Keep the account dollar score as an optional curiosity; it should not distract from the reason to return.

## A reason to share

- Each filtered Explore URL preserves the search. Share a specific list such as [self-hosted projects](https://gitium.vercel.app/explore?topic=self-hosted) or [Rust projects](https://gitium.vercel.app/explore?language=Rust), with one clear reason to open it.
- Publish a weekly selection of three projects you actually tried: the problem, what worked, and one limitation. Credit the maintainers. Link to the matching Gitium search and the original projects.
- Invite suggestions for the Essentials collection through the repository's issues. Review them before adding them. Avoid paid placements disguised as recommendations.
- Demonstrate the complete path: find a project, inspect its recent commits, then open an issue. A 30-second recording of that journey is more useful than a feature montage.

## X draft

I built Gitium to make it easier to find useful things on GitHub.

Browse projects by language and topic, find the organizations behind them, or pick an open issue to contribute to.

I also added an Essentials collection with a short explanation of what each tool does and its tradeoffs.

Try it: https://gitium.vercel.app/explore

What project belongs in the collection?

## Product Hunt draft

**Name:** Gitium

**Tagline:** Find useful GitHub projects and somewhere to contribute

**Description:** Browse top GitHub projects and organizations, filter by language and topic, and explore a curated collection of useful tools. Inspect commit graphs, import your stars, and find open issues to contribute to. Free to use, with light and dark themes.

**Maker comment:**

I wanted a quicker way to find projects I'd actually use. Gitium puts project search, organizations, a small Essentials collection and contribution issues in one place.

Rankings tell you what they measure. Stars are lifetime totals, not a claim that a project is the best. The curated tools include a reason to try them and a limitation to keep in mind.

You can also explore recent commits, bring in your GitHub stars and chat with other Gitium users. DMs require an accepted request; repository and organization rooms require an invitation. Chat is not yet end-to-end encrypted.

I'd like to hear what you found useful, what search didn't work, and which project I should try next.

## Launch sequence

1. Test the signed-out search journey and a complete signed-in journey on production. Check OAuth, stars, graphs, account scores, DM acceptance and room invitations. Review X and Product Hunt link previews in their actual composers.
2. Collect feedback from five people who already browse GitHub. Ask them to find a tool for a real problem. Fix places where they get stuck before setting a launch date.
3. Prepare three screenshots: filtered projects, Essentials and a populated code graph. Avoid screenshots of private conversations. Record the short search-to-contribution demo.
4. Use the maker's personal Product Hunt account, satisfy its eligibility requirements, and check whether a Gitium listing already exists before creating one. Include the live app and source link.
5. Publish one clear X demo and the Product Hunt listing. Share with people who asked to hear about it and communities whose posting rules allow it. Ask for feedback, not coordinated votes.
6. Spend launch day answering questions and fixing broken journeys. Post one useful project example the next day; follow up with the improvement most often requested.

## What to measure

- Searches that lead to a code graph or contribution page, not just page views.
- Repeat visits over the next week.
- Searches with no results or GitHub quota errors.
- Suggestions that improve the Essentials collection.

These conversion events are a proposed next measurement step, not currently collected analytics. Existing code and account leaderboards count their own runs. Do not attach prizes or money to those rankings: coordinated accounts can distort them. No launch plan can guarantee virality.

## Free usage and caching

Explore reuses public GitHub search responses for 15 minutes. Essentials is bundled editorial content and needs no GitHub or database request. Graphs and leaderboards advertise five-minute shared caches. Personal stars, chats and authenticated feeds are never shared-cached. Chat refreshes every 30 seconds while visible; requests and room sizes are bounded.

Anonymous GitHub search has a separate small rate allowance. A cache helps repeated searches, but many distinct queries can still exhaust it. Show a retry message; do not silently invent results. Inspect quota errors during launch before expanding traffic.

Free tiers have finite capacity. D1 can stop at daily limits; Vercel Hobby has usage and personal/non-commercial restrictions. The application does not automatically buy extra capacity. Watch the provider dashboards and reduce polling or disable writes if necessary. Zero cost does not mean unlimited concurrent users.

## Publication status

This is prepared copy. No X announcement or Product Hunt listing has been published by this work. The maker still needs to choose a launch date and publish from their account.

Sources: [GitHub search limits](https://docs.github.com/en/rest/search/search), [Product Hunt launch guide](https://www.producthunt.com/launch), [posting a product](https://help.producthunt.com/en/articles/479557-how-to-post-a-product), [launch rules](https://www.producthunt.com/launch/how-product-hunt-works), [Vercel Hobby](https://vercel.com/docs/plans/hobby), [D1 free-tier enforcement](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/).
