import { authEnabled } from '@/lib/auth';
import { dbConfigured } from '@/lib/d1';
import { Shell } from '@/components/Shell';
import Link from 'next/link';
import { ChatView } from '@/components/ChatView';

export const metadata = { title: 'Private chats', robots: { index: false, follow: false }, alternates: { canonical: '/spaces' } };
export default async function SpacesPage({ searchParams }: { searchParams: Promise<{ room?: string; dm?: string }> }) {
  const params = await searchParams;
  return <Shell authReady={authEnabled()} dataReady={dbConfigured()}>{process.env.GITIUM_E2EE_ENABLED === 'local-candidate' && <p className="status-banner"><Link href="/encrypted-chat">Open encrypted chat (local candidate)</Link>. Once enabled for a conversation, new plaintext messages are blocked.</p>}<ChatView initialRoom={params.room || ''} initialDm={params.dm || ''}/></Shell>;
}
