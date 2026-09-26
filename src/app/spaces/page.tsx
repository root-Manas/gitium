import { authEnabled } from '@/lib/auth';
import { dbConfigured } from '@/lib/d1';
import { Shell } from '@/components/Shell';
import { SpaceView } from '@/components/SpaceView';

export const metadata = { title: 'Spaces' };
export default async function SpacesPage({ searchParams }: { searchParams: Promise<{ kind?: string; target?: string }> }) {
  const params = await searchParams;
  const kind = ['user', 'repo', 'org', 'dm'].includes(params.kind || '') ? params.kind as 'user' | 'repo' | 'org' | 'dm' : 'user';
  return <Shell authReady={authEnabled()} dataReady={dbConfigured()}><SpaceView initialKind={kind} initialTarget={params.target || ''}/></Shell>;
}
