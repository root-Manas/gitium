import { authEnabled } from '@/lib/auth';
import { dbConfigured } from '@/lib/d1';
import { Shell } from '@/components/Shell';
import { PostsView } from '@/components/PostsView';

export const metadata = { title: 'Public posts', description: 'Gitium posts about people, repositories, and organizations on GitHub.', alternates: { canonical: '/posts' } };
export default async function PostsPage({ searchParams }: { searchParams: Promise<{ kind?: string; target?: string }> }) {
  const params = await searchParams;
  const kind = ['user', 'repo', 'org'].includes(params.kind || '') ? params.kind as 'user' | 'repo' | 'org' : 'user';
  return <Shell authReady={authEnabled()} dataReady={dbConfigured()}><PostsView initialKind={kind} initialTarget={params.target || ''}/></Shell>;
}
