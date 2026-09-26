import { authEnabled } from '@/lib/auth';
import { dbConfigured } from '@/lib/d1';
import { Shell } from '@/components/Shell';
import { SavedView } from '@/components/SavedView';

export const metadata = { title: 'Saved activity' };
export default function SavedPage() { return <Shell authReady={authEnabled()} dataReady={dbConfigured()}><SavedView /></Shell>; }
