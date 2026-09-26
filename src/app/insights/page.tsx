import { authEnabled } from '@/lib/auth';
import { dbConfigured } from '@/lib/d1';
import { Shell } from '@/components/Shell';
import { InsightsView } from '@/components/InsightsView';

export const metadata = { title: 'Account insights' };
export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ login?: string }> }) {
  const params = await searchParams;
  return <Shell authReady={authEnabled()} dataReady={dbConfigured()}><InsightsView initial={params.login || ''}/></Shell>;
}
