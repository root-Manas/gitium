import { notFound } from 'next/navigation';
import Link from 'next/link';
import { authEnabled } from '@/lib/auth';
import { dbConfigured } from '@/lib/d1';
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
  const events = await getPublicEvents(login).catch(() => []);
  return <Shell authReady={authEnabled()} dataReady={dbConfigured()}><div className="wide-page">
    <div className="profile-hero"><img src={profile.avatar_url} alt=""/><div><span className="eyebrow"><Github size={13}/> GITHUB PROFILE</span><h1>{profile.login}<span>.</span></h1><p>{profile.bio || 'Public work from this GitHub account.'}</p><div className="profile-stats"><span><strong>{profile.public_repos?.toLocaleString() || '0'}</strong> repositories</span><span><strong>{profile.followers?.toLocaleString() || '0'}</strong> followers</span></div></div><div className="profile-actions"><FollowButton login={profile.login} initial={false} enabled/><a href={profile.html_url} target="_blank" rel="noopener noreferrer">GitHub <ArrowUpRight size={15}/></a></div></div>
    <div className="profile-quicklinks"><Link href={`/insights?login=${encodeURIComponent(profile.login)}`}>Code graph and estimate <ArrowUpRight size={15}/></Link><Link href={`/spaces?kind=user&target=${encodeURIComponent(profile.login)}`}>Public posts <ArrowUpRight size={15}/></Link><Link href={`/spaces?kind=dm&target=${encodeURIComponent(profile.login)}`}>Direct chat <ArrowUpRight size={15}/></Link></div>
    <div className="section-bar"><h2>Public activity</h2><span>{events.length} UPDATES</span></div>{events.length ? <div className="event-list profile-events">{events.map(event => <EventCard key={event.id} event={event}/>)}</div> : <div className="empty-feed"><h3>Nothing public recently</h3><p>GitHub only returns recent public events for this account.</p></div>}
  </div></Shell>;
}
