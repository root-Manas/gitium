import { authEnabled } from '@/lib/auth';
import { dbConfigured } from '@/lib/d1';
import { Shell } from '@/components/Shell';
import { ContributeView } from '@/components/ContributeView';

export const metadata = {
  title: 'Find an issue to contribute to',
  description: 'Find open GitHub issues by language, good first issue and help wanted labels. Pick a project and make your next contribution.',
  alternates: { canonical: '/contribute' },
  keywords: ['good first issue', 'open source contributions', 'GitHub help wanted', 'beginner GitHub issues']
};
export default async function ContributePage({ searchParams }: { searchParams: Promise<{ repo?: string }> }) {
  const { repo } = await searchParams;
  return <Shell authReady={authEnabled()} dataReady={dbConfigured()}><ContributeView key={repo || ''} initialRepo={repo || ''}/></Shell>;
}
