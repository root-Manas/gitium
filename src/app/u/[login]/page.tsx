import { notFound } from 'next/navigation';
import { authEnabled } from '@/lib/auth';
import { dbConfigured } from '@/lib/d1';
import { getFollowedLogins } from '@/lib/follows';
import { getPublicEvents, getUser, validLogin } from '@/lib/github';
import { Shell } from '@/components/Shell';
import { EventCard } from '@/components/EventCard';
import { FollowButton } from '@/components/FollowButton';
import { ArrowUpRight, Github } from 'lucide-react';

export default async function UserPage({ params }: { params: Promise<{ login: string }> }) {
  const { login } = await params;
  if (!validLogin(login)) notFound();
  const profile = await getUser(login).catch(() => null);
  if (!profile) notFound();
  const [events, follows] = await Promise.all([getPublicEvents(login).catch(() => []), getFollowedLogins()]);
  return <Shell authReady={authEnabled()} dataReady={dbConfigured()}><div className="wide-page"><div className="profile-hero"><img src={profile.avatar_url} alt="" /><div><span className="eyebrow"><Github size={13} /> GITHUB PROFILE</span><h1>{profile.login}<span>.</span></h1><p>{profile.bio || 'See the public work from this GitHub account.'}</p><div className="profile-stats"><span><strong>{profile.public_repos?.toLocaleString() || '0'}</strong> repositories</span><span><strong>{profile.followers?.toLocaleString() || '0'}</strong> followers</span></div></div><div className="profile-actions"><FollowButton login={profile.login} initial={follows.includes(profile.login.toLowerCase())} enabled={dbConfigured()} /><a href={profile.html_url} target="_blank" rel="noopener noreferrer">GitHub <ArrowUpRight size={15} /></a></div></div>
    <div className="section-bar"><h2>Public activity</h2><span>{events.length} UPDATES</span></div>{events.length ? <div className="event-list profile-events">{events.map(event => <EventCard key={event.id} event={event} />)}</div> : <div className="empty-feed"><h3>Nothing public recently</h3><p>GitHub only returns recent public events for this account.</p></div>}
  </div></Shell>;
}
