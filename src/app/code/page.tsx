import { authEnabled } from '@/lib/auth';
import { dbConfigured } from '@/lib/d1';
import { Shell } from '@/components/Shell';
import { CodeView } from '@/components/CodeView';

export const metadata = { title: 'Code graph' };
export default async function CodePage({ searchParams }: { searchParams: Promise<{ repo?: string }> }) {
  const params = await searchParams;
  return <Shell authReady={authEnabled()} dataReady={dbConfigured()}><CodeView initial={params.repo || ''}/></Shell>;
}
