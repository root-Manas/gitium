'use client';
import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Plus, Check } from 'lucide-react';

export function FollowButton({ login, initial, enabled }: { login: string; initial: boolean; enabled: boolean }) {
  const { data: session } = useSession();
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function toggle() {
    if (!enabled) return;
    if (!session) { signIn('github'); return; }
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/follows', { method: following ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update follow.');
      setFollowing(!following);
      window.dispatchEvent(new Event('gitium-follow-change'));
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Try again.'); }
    finally { setBusy(false); }
  }
  return <span className="follow-wrap"><button type="button" className={`follow-btn ${following ? 'is-following' : ''}`} disabled={busy || !enabled} onClick={toggle} title={!enabled ? 'Following is temporarily unavailable' : undefined}>{following ? <Check size={15} /> : <Plus size={15} />}{following ? 'Following' : 'Follow'}</button>{error && <span className="inline-error" role="alert">{error}</span>}</span>;
}
