'use client';
import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Check, MessageCircle, Plus, RefreshCw, Send, UserPlus, X } from 'lucide-react';

type Room = { id: string; scope: 'repo' | 'org'; target: string; owner_id: string; owner_login: string; latest?: string | null };
type Invite = { room_id: string; scope: string; target: string; owner_login: string };
type Message = { id: string; author_id: string; author_login: string; body: string; created_at: string };
type Conversation = { scope: 'room' | 'dm'; target: string; label: string };
type RoomDetails = { room: Room; members: { user_id: string; login: string; role: string }[]; invites: { login: string }[] };

export function ChatView({ initialRoom, initialDm }: { initialRoom: string; initialDm: string }) {
  const { data: session, status } = useSession();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [dms, setDms] = useState<{ id: string; login: string; latest: string }[]>([]);
  const [current, setCurrent] = useState<Conversation | null>(initialRoom ? { scope: 'room', target: initialRoom, label: 'Private room' } : initialDm ? { scope: 'dm', target: initialDm, label: initialDm } : null);
  const [details, setDetails] = useState<RoomDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<'repo' | 'org'>('repo');
  const [roomTarget, setRoomTarget] = useState('');
  const [inviteLogin, setInviteLogin] = useState('');
  const [dmLogin, setDmLogin] = useState(initialDm);
  const [showCreate, setShowCreate] = useState(false);
  const activeKey = useRef(initialRoom ? `room:${initialRoom}` : initialDm ? `dm:${initialDm}` : '');
  const messageEnd = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    if (!session) return;
    try {
      const response = await fetch('/api/rooms', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load chats.');
      setRooms(data.rooms || []); setInvites(data.invites || []); setDms(data.dms || []);
      setCurrent(previous => {
        if (previous?.scope !== 'room') return previous;
        const label = data.rooms?.find((room: Room) => room.id === previous.target)?.target || previous.label;
        return label === previous.label ? previous : { ...previous, label };
      });
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not load chats.'); }
  }, [session]);

  const loadMessages = useCallback(async () => {
    if (!current || !session) return;
    try {
      const response = await fetch(`/api/messages?scope=${current.scope}&target=${encodeURIComponent(current.target)}`, { cache: 'no-store' });
      const data = await response.json();
      if (activeKey.current !== `${current.scope}:${current.target}`) return;
      if (!response.ok) throw new Error(data.error || 'Could not load messages.');
      if (current.scope === 'dm' && data.peer && (current.target !== `id:${data.peer.id}` || current.label !== data.peer.login)) {
        const next = { scope: 'dm' as const, target: `id:${data.peer.id}`, label: data.peer.login };
        activeKey.current = `dm:${next.target}`;
        setCurrent(next);
        window.history.replaceState(null, '', `/spaces?dm=${encodeURIComponent(next.target)}`);
      }
      setMessages(data.messages || []); setError('');
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not load messages.'); }
  }, [current, session]);

  const loadDetails = useCallback(async () => {
    if (current?.scope !== 'room' || !session) { setDetails(null); return; }
    try {
      const response = await fetch(`/api/rooms?roomId=${encodeURIComponent(current.target)}`, { cache: 'no-store' });
      const data = await response.json();
      if (activeKey.current !== `${current.scope}:${current.target}`) return;
      if (!response.ok) throw new Error(data.error || 'Could not load room.');
      setDetails(data);
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not load room.'); }
  }, [current, session]);

  useEffect(() => { if (session) void loadRooms(); }, [session, loadRooms]);
  useEffect(() => { setMessages([]); if (session && current) { void loadMessages(); void loadDetails(); } }, [session, current, loadMessages, loadDetails]);
  useEffect(() => {
    if (!session || !current) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void loadMessages(); }, 30000);
    return () => clearInterval(timer);
  }, [session, current, loadMessages]);

  function select(next: Conversation | null) {
    activeKey.current = next ? `${next.scope}:${next.target}` : '';
    setCurrent(next); setMessages([]); setError(''); setBody(''); setDetails(null); setEditing(null);
    window.history.replaceState(null, '', next ? `/spaces?${next.scope === 'room' ? 'room' : 'dm'}=${encodeURIComponent(next.target)}` : '/spaces');
  }

  async function act(action: string, extra: Record<string, string> = {}) {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update room.');
      await loadRooms();
      if (action === 'create' || action === 'accept') select({ scope: 'room', target: data.id || data.joined, label: extra.target || 'Private room' });
      if (action === 'leave') select(null);
      if (['invite', 'remove'].includes(action)) { setInviteLogin(''); await loadDetails(); }
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not update room.'); }
    finally { setBusy(false); }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!current || !body.trim() || busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/messages', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing ? { id: editing, body } : { scope: current.scope, target: current.target, body }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not send message.');
      setBody(''); setEditing(null); await loadMessages(); await loadRooms();
      messageEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not send message.'); }
    finally { setBusy(false); }
  }

  function edit(message: Message) { setEditing(message.id); setBody(message.body); }

  async function remove(id: string) {
    try {
      const response = await fetch('/api/messages', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Could not delete message.'); }
      setMessages(previous => previous.filter(item => item.id !== id));
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not delete message.'); }
  }

  function onKey(event: KeyboardEvent<HTMLTextAreaElement>) { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }

  if (status === 'loading') return <div className="wide-page"><p className="space-empty">Opening chats…</p></div>;
  if (!session) return <div className="wide-page chat-gate"><MessageCircle size={40}/><h1>Your private chats</h1><p>Sign in with GitHub to see your rooms, invitations, and direct messages.</p><button onClick={() => signIn('github')}>Sign in with GitHub</button><p><Link href="/posts">Public posts are here →</Link></p></div>;

  return <div className="wide-page chat-page"><div className="page-heading"><span className="eyebrow">PRIVATE CHATS</span><h1>Your conversations<span>.</span></h1><p>Direct messages are between two people. Repository and organization rooms are invitation only. Messages are not yet end-to-end encrypted.</p></div>
    {error && <p className="status-banner" role="alert">{error}</p>}
    <div className="chat-layout"><aside className="chat-sidebar"><div className="chat-side-head"><strong>Chats</strong><button type="button" onClick={() => setShowCreate(!showCreate)} aria-label="Create a private room"><Plus size={18}/></button></div>
      {showCreate && <form className="chat-create" onSubmit={event => { event.preventDefault(); void act('create', { scope: kind, target: roomTarget }); setShowCreate(false); }}><label>New private room</label><select value={kind} onChange={event => setKind(event.target.value as 'repo' | 'org')}><option value="repo">Repository</option><option value="org">Organization</option></select><input value={roomTarget} onChange={event => setRoomTarget(event.target.value)} placeholder={kind === 'repo' ? 'owner/repository' : 'organization'} required/><button disabled={busy}>Create room</button></form>}
      <form className="chat-create" onSubmit={event => { event.preventDefault(); if (dmLogin.trim()) select({ scope: 'dm', target: dmLogin.trim().toLowerCase(), label: dmLogin.trim() }); }}><label>Direct message</label><div><input aria-label="GitHub username for direct message" value={dmLogin} onChange={event => setDmLogin(event.target.value)} placeholder="GitHub username" required/><button title="Open direct chat" aria-label="Open direct chat"><Send size={15}/></button></div></form>
      {invites.length > 0 && <div className="chat-list"><h3>Invitations</h3>{invites.map(invite => <div className="chat-invite" key={invite.room_id}><strong>{invite.target}</strong><small>From {invite.owner_login}</small><div><button onClick={() => void act('accept', { roomId: invite.room_id })} disabled={busy}><Check size={13}/> Join</button><button onClick={() => void act('decline', { roomId: invite.room_id })} disabled={busy}><X size={13}/> Decline</button></div></div>)}</div>}
      <div className="chat-list"><h3>Rooms</h3>{rooms.length ? rooms.map(room => <button className={current?.scope === 'room' && current.target === room.id ? 'active' : ''} key={room.id} onClick={() => select({ scope: 'room', target: room.id, label: room.target })}><span>{room.scope === 'repo' ? '⌁' : '◈'}</span><strong>{room.target}</strong><small>Private</small></button>) : <p>No rooms yet. Create one and invite people.</p>}</div>
      <div className="chat-list"><h3>Direct messages</h3>{dms.map(dm => <button className={current?.scope === 'dm' && current.target === `id:${dm.id}` ? 'active' : ''} key={dm.id} onClick={() => select({ scope: 'dm', target: `id:${dm.id}`, label: dm.login })}><img src={`https://github.com/${dm.login}.png?size=80`} alt=""/><strong>{dm.login}</strong></button>)}</div></aside>
      <section className="chat-main">{current ? <><header className="chat-header"><button className="chat-back" type="button" onClick={() => select(null)} aria-label="Back to chats"><ArrowLeft size={18}/></button><div><span>{current.scope === 'room' ? 'INVITE ONLY ROOM' : 'DIRECT MESSAGE'}</span><h2>{details?.room.target || current.label}</h2></div><button type="button" onClick={() => void loadMessages()} aria-label="Refresh messages"><RefreshCw size={17}/></button></header>
        {details && <div className="chat-members"><span>{details.members.length} members: {details.members.map(item => item.login).join(', ')}</span>{details.room.owner_id !== session.user.id && <button type="button" onClick={() => void act('leave', { roomId: details.room.id })}>Leave</button>}</div>}
        {details?.room.owner_id === session.user.id && <div className="chat-invite-form"><form onSubmit={event => { event.preventDefault(); void act('invite', { roomId: details.room.id, login: inviteLogin }); }}><UserPlus size={16}/><input aria-label="Invite GitHub user" value={inviteLogin} onChange={event => setInviteLogin(event.target.value)} placeholder="Invite a GitHub username" required/><button disabled={busy}>Invite</button></form>{details.invites.length > 0 && <small>Pending: {details.invites.map(item => item.login).join(', ')}</small>}{details.members.filter(item => item.role !== 'owner').map(item => <button className="chat-member-remove" key={item.login} onClick={() => void act('remove', { roomId: details.room.id, userId: item.user_id })}>Remove {item.login}</button>)}</div>}
        <div className="chat-messages" aria-live="polite">{messages.length ? messages.map(message => <article className={`chat-bubble ${message.author_id === session.user.id ? 'mine' : ''}`} key={message.id}><img src={`https://github.com/${message.author_login}.png?size=80`} alt=""/><div><header><Link href={`/u/${message.author_login}`}>{message.author_login}</Link><time>{new Date(message.created_at.replace(' ', 'T') + 'Z').toLocaleString()}</time></header><p>{message.body}</p>{message.author_id === session.user.id && <footer><button onClick={() => void edit(message)}>Edit</button><button onClick={() => void remove(message.id)}>Delete</button></footer>}</div></article>) : <p className="space-empty">No messages yet. Say hello.</p>}</div>
        <div ref={messageEnd}/><form className="chat-composer" onSubmit={send}>{editing && <div><span>Editing your message</span><button type="button" onClick={() => { setEditing(null); setBody(''); }}>Cancel</button></div>}<textarea value={body} onChange={event => setBody(event.target.value)} onKeyDown={onKey} maxLength={500} rows={2} placeholder="Write a message…" aria-label="Message"/><div><span>Enter to send · Shift+Enter for a new line · {body.length}/500</span><button disabled={!body.trim() || busy}><Send size={15}/> {editing ? 'Save edit' : 'Send'}</button></div></form>
      </> : <div className="chat-welcome"><MessageCircle size={35}/><h2>Pick a conversation</h2><p>Start a direct message or make a private room for a repository or organization.</p></div>}</section></div>
  </div>;
}
