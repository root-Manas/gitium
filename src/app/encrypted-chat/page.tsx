import { notFound } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { authEnabled } from '@/lib/auth';
import { dbConfigured } from '@/lib/d1';
import { EncryptedChat } from '@/components/EncryptedChat';
export const metadata = { title: 'Encrypted chat — local candidate', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export default function Page() {
  if (process.env.GITIUM_E2EE_ENABLED !== 'local-candidate') notFound();
  return <Shell authReady={authEnabled()} dataReady={dbConfigured()}><EncryptedChat/></Shell>;
}
