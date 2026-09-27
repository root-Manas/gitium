import type { Metadata } from 'next';
import { authEnabled } from '@/lib/auth';
import { dbConfigured } from '@/lib/d1';
import { Shell } from '@/components/Shell';
import { CodeView } from '@/components/CodeView';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ repo?: string }> }): Promise<Metadata> {
  const repo = (await searchParams).repo?.slice(0, 120) || '';
  const title = repo ? `Code graph for ${repo}` : 'GitHub repository code graphs';
  const description = repo ? `Explore recent commits and contributors in ${repo} on Gitium.` : 'Explore GitHub repository commit timelines and contributors.';
  return { title, description, alternates: { canonical: repo ? `/code?repo=${encodeURIComponent(repo)}` : '/code' }, openGraph: { title, description, images: ['/opengraph-image'], url: repo ? `/code?repo=${encodeURIComponent(repo)}` : '/code' }, keywords: ['GitHub commit graph', 'repository activity', 'open source contributors'] };
}
export default async function CodePage({ searchParams }: { searchParams: Promise<{ repo?: string }> }) {
  const params = await searchParams;
  return <Shell pageSearch authReady={authEnabled()} dataReady={dbConfigured()}><CodeView initial={params.repo || ''}/></Shell>;
}
