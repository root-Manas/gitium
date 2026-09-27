import type { Metadata } from 'next';
import { authEnabled } from '@/lib/auth';
import { dbConfigured } from '@/lib/d1';
import { Shell } from '@/components/Shell';
import { InsightsView } from '@/components/InsightsView';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ login?: string }> }): Promise<Metadata> {
  const login = (await searchParams).login?.slice(0, 39) || '';
  const title = login ? `${login}'s GitHub account score` : 'GitHub account scores';
  const description = 'Explore contributions, maintained repositories and an illustrative account score with a transparent breakdown.';
  const url = login ? `/insights?login=${encodeURIComponent(login)}` : '/insights';
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, images: ['/opengraph-image'] } };
}

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ login?: string }> }) {
  const params = await searchParams;
  return <Shell authReady={authEnabled()} dataReady={dbConfigured()}><InsightsView initial={params.login || ''}/></Shell>;
}
