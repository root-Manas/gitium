'use client';
import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Plus, Check } from 'lucide-react';

const followCache = new Map<string, Promise<string[]>>();
function followedBy(userId: string) {
  if (!followCache.has(userId)) followCache.set(userId, fetch('/api/follows').then(async response => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load follows.');
    return Array.isArray(data.logins) ? data.logins : [];
  }).catch(error => { followCache.delete(userId); throw error; }));
  return followCache.get(userId)!;
}

export function FollowButton({ login, initial }: { login: string; initial: boolean; enabled: boolean }) {
  const { data: session } = useSession();
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!session) return;
    let active = true;
    followedBy(session.user.id).then(logins => { if (active) setFollowing(logins.some((name: string) => name.toLowerCase() === login.toLowerCase())); }).catch(() => {});
    return () => { active = false; };
  }, [session, login]);
  async function toggle() {
    if (!session) { signIn('github'); return; }
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/follows', { method: following ? 'DELETE' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login }) });
      const data = await response.json();
      if (data.reconnect) { signIn('github'); return; }
      if (!response.ok) throw new Error(data.error || 'Could not update follow.');
      setFollowing(!following);
      followCache.delete(session.user.id);
      window.dispatchEvent(new Event('gitium-follow-change'));
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Try again.'); }
    finally { setBusy(false); }
  }
  if (session?.user?.githubLogin?.toLowerCase() === login.toLowerCase()) return null;
  return <span className="follow-wrap"><button type="button" className={`follow-btn ${following ? 'is-following' : ''}`} disabled={busy} onClick={toggle} title={following ? 'Unfollow on GitHub' : 'Follow on GitHub'}>{following ? <Check size={15} /> : <Plus size={15} />}{following ? 'Following' : 'Follow'}</button>{error && <span className="inline-error" role="alert">{error}</span>}</span>;
}
