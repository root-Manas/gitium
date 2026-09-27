import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { json } from '@/lib/api';
import { githubGet } from '@/lib/github';
import { contributionQuery } from '@/lib/contribute';

type Issue = { id: number; number: number; title: string; body: string | null; html_url: string; repository_url: string; comments: number; updated_at: string; labels: { name: string }[]; assignees?: unknown[]; pull_request?: unknown };
export async function GET(request: NextRequest) {
  let search;
  try { search = contributionQuery(new URL(request.url).searchParams); }
  catch (error) { return json({ error: error instanceof Error ? error.message : 'Invalid filters.' }, 400); }
  try {
    const jwt = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const token = typeof jwt?.githubAccessToken === 'string' ? jwt.githubAccessToken : undefined;
    const data = await githubGet<{ total_count: number; incomplete_results: boolean; items: Issue[] }>(`/search/issues?q=${encodeURIComponent(search.query)}&sort=updated&order=desc&per_page=20&page=${search.page}`, 300, token);
    const issues = data.items.filter(item => !item.pull_request && /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/\d+$/.test(item.html_url)).map(item => ({
      id: item.id, number: item.number, title: item.title, url: item.html_url,
      repo: item.html_url.split('/').slice(3, 5).join('/'),
      summary: (item.body || '').replace(/<!--[\s\S]*?-->/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#*`>\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220),
      comments: item.comments, updated: item.updated_at, labels: item.labels.slice(0, 5).map(label => label.name), assigned: !!item.assignees?.length
    }));
    return NextResponse.json({ issues, total: data.total_count, incomplete: data.incomplete_results, page: search.page, hasMore: search.page < 5 && search.page * 20 < Math.min(data.total_count, 100), githubUrl: `https://github.com/issues?q=${encodeURIComponent(search.query)}` }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
  } catch (error) {
    const limited = error instanceof Error && error.message.includes('rate limit');
    return json({ error: limited ? 'GitHub search is busy. Sign in for your account’s search allowance, or try again in a minute.' : 'Could not load issues from GitHub. Please try again.' }, limited ? 429 : 502);
  }
}
