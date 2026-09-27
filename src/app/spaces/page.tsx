import { authEnabled } from '@/lib/auth';
import { dbConfigured } from '@/lib/d1';
import { Shell } from '@/components/Shell';
import { ChatView } from '@/components/ChatView';

export const metadata = { title: 'Private chats', robots: { index: false, follow: false } };
export default async function SpacesPage({ searchParams }: { searchParams: Promise<{ room?: string; dm?: string }> }) {
  const params = await searchParams;
  return <Shell authReady={authEnabled()} dataReady={dbConfigured()}><ChatView initialRoom={params.room || ''} initialDm={params.dm || ''}/></Shell>;
}
