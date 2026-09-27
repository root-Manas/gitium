"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { EncryptedChat } from "./EncryptedChat";
import {
  ArrowLeft,
  Check,
  MessageCircle,
  Plus,
  RefreshCw,
  Send,
  UserPlus,
  X,
} from "lucide-react";

type Room = {
  id: string;
  scope: "repo" | "org";
  target: string;
  owner_id: string;
  owner_login: string;
  latest?: string | null;
};
type Invite = {
  room_id: string;
  scope: string;
  target: string;
  owner_id: string;
  owner_login: string;
};
type Message = {
  id: string;
  author_id: string;
  author_login: string;
  body: string;
  created_at: string;
};
type Conversation = { scope: "room" | "dm"; target: string; label: string };
type RoomDetails = {
  room: Room;
  members: { user_id: string; login: string; role: string }[];
  invites: { login: string }[];
};

export function ChatView(props: {
  initialRoom: string;
  initialDm: string;
  encryptionEnabled?: boolean;
}) {
  const { data: session } = useSession();
  return <ChatViewSession key={session?.user?.id || "signed-out"} {...props} />;
}
function ChatViewSession({
  initialRoom,
  initialDm,
  encryptionEnabled = false,
}: {
  initialRoom: string;
  initialDm: string;
  encryptionEnabled?: boolean;
}) {
  const { data: session, status } = useSession();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [consent, setConsent] = useState<{
    status: string;
    incoming: boolean;
  } | null>(null);
  const [requests, setRequests] = useState<
    { id: string; login: string; status: string; recipient_id: string }[]
  >([]);
  const [blocked, setBlocked] = useState<{ id: string; login: string }[]>([]);
  const [dms, setDms] = useState<
    { id: string; login: string; latest: string }[]
  >([]);
  const [current, setCurrent] = useState<Conversation | null>(
    initialRoom
      ? { scope: "room", target: initialRoom, label: "Private room" }
      : initialDm
        ? { scope: "dm", target: initialDm, label: initialDm }
        : null,
  );
  const [details, setDetails] = useState<RoomDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<"repo" | "org">("repo");
  const [roomTarget, setRoomTarget] = useState("");
  const [inviteLogin, setInviteLogin] = useState("");
  const [dmLogin, setDmLogin] = useState(initialDm);
  const [showCreate, setShowCreate] = useState(false);
  const activeKey = useRef(
    initialRoom ? `room:${initialRoom}` : initialDm ? `dm:${initialDm}` : "",
  );

  const loadRooms = useCallback(async () => {
    if (!session) return;
    try {
      const response = await fetch("/api/rooms", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load chats.");
      const requestResponse = await fetch("/api/chat-requests", {
        cache: "no-store",
      });
      const requestData = await requestResponse.json();
      if (!requestResponse.ok)
        throw new Error(requestData.error || "Could not load requests.");
      setRequests(requestData.requests || []);
      setBlocked(requestData.blocked || []);
      setRooms(data.rooms || []);
      setInvites(data.invites || []);
      setDms(data.dms || []);
      setCurrent((previous) => {
        if (previous?.scope !== "room") return previous;
        const label =
          data.rooms?.find((room: Room) => room.id === previous.target)
            ?.target || previous.label;
        return label === previous.label ? previous : { ...previous, label };
      });
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : "Could not load chats.",
      );
    }
  }, [session]);

  const loadMessages = useCallback(async () => {
    if (!current || !session) return;
    try {
      const response = await fetch(
        `/api/messages?scope=${current.scope}&target=${encodeURIComponent(current.target)}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (activeKey.current !== `${current.scope}:${current.target}`) return;
      if (!response.ok)
        throw new Error(data.error || "Could not load messages.");
      if (
        current.scope === "dm" &&
        data.peer &&
        (current.target !== `id:${data.peer.id}` ||
          current.label !== data.peer.login)
      ) {
        const next = {
          scope: "dm" as const,
          target: `id:${data.peer.id}`,
          label: data.peer.login,
        };
        activeKey.current = `dm:${next.target}`;
        setCurrent(next);
        window.history.replaceState(
          null,
          "",
          `/spaces?dm=${encodeURIComponent(next.target)}`,
        );
      }
      setCanWrite(
        current.scope === "room" || data.consent?.status === "accepted",
      );
      setConsent(data.consent || null);
      setMessages(data.messages || []);
      setError("");
    } catch (problem) {
      if (activeKey.current !== `${current.scope}:${current.target}`) return;
      setCanWrite(false);
      setMessages([]);
      setError(
        problem instanceof Error ? problem.message : "Could not load messages.",
      );
    }
  }, [current, session]);

  const loadDetails = useCallback(async () => {
    if (current?.scope !== "room" || !session) {
      setDetails(null);
      return;
    }
    try {
      const response = await fetch(
        `/api/rooms?roomId=${encodeURIComponent(current.target)}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (activeKey.current !== `${current.scope}:${current.target}`) return;
      if (!response.ok) throw new Error(data.error || "Could not load room.");
      setDetails(data);
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : "Could not load room.",
      );
    }
  }, [current, session]);

  useEffect(() => {
    if (session) void loadRooms();
  }, [session, loadRooms]);
  useEffect(() => {
    setMessages([]);
    if (session && current) {
      void loadMessages();
      void loadDetails();
    }
  }, [session, current, loadMessages, loadDetails]);
  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadRooms();
        if (current) {
          void loadMessages();
          void loadDetails();
        }
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [session, current, loadMessages, loadRooms, loadDetails]);

  function select(next: Conversation | null) {
    activeKey.current = next ? `${next.scope}:${next.target}` : "";
    setCanWrite(false);
    setConsent(null);
    setCurrent(next);
    setMessages([]);
    setError("");
    setDetails(null);
    window.history.replaceState(
      null,
      "",
      next
        ? `/spaces?${next.scope === "room" ? "room" : "dm"}=${encodeURIComponent(next.target)}`
        : "/spaces",
    );
  }

  async function act(action: string, extra: Record<string, string> = {}) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update room.");
      await loadRooms();
      if (action === "create" || action === "accept")
        select({
          scope: "room",
          target: data.id || data.joined,
          label: extra.target || "Private room",
        });
      if (action === "leave") select(null);
      if (["invite", "remove"].includes(action)) {
        setInviteLogin("");
        await loadDetails();
      }
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : "Could not update room.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function requestAction(action: string, target = current?.target) {
    if (!target) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/chat-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, target }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not update request.");
      await loadRooms();
      await loadMessages();
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "Could not update request.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      const response = await fetch("/api/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Could not delete message.");
      }
      setMessages((previous) => previous.filter((item) => item.id !== id));
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "Could not delete message.",
      );
    }
  }

  if (status === "loading")
    return (
      <div className="wide-page">
        <p className="space-empty">Opening chats…</p>
      </div>
    );
  if (!session)
    return (
      <div className="wide-page chat-gate">
        <MessageCircle size={40} />
        <h1>Your private chats</h1>
        <p>
          Sign in with GitHub to see your rooms, invitations, and direct
          messages.
        </p>
        <button onClick={() => signIn("github")}>Sign in with GitHub</button>
        <p>
          <Link href="/contribute">Find an issue to work on →</Link>
        </p>
      </div>
    );

  return (
    <div className="wide-page chat-page">
      <div className="page-heading">
        <span className="eyebrow">PRIVATE CHATS</span>
        <h1>
          Your conversations<span>.</span>
        </h1>
        <p>
          Direct messages start with an accepted request. Repository and
          organization rooms are invitation only. New messages are end-to-end
          encrypted after device verification. Older messages remain in a
          separate, read-only history. Blocking stops DMs and new invitations;
          leave shared rooms to stop participating there.
        </p>
      </div>
      {error && (
        <p className="status-banner" role="alert">
          {error}
        </p>
      )}
      <div className="chat-layout">
        <aside className="chat-sidebar">
          <div className="chat-side-head">
            <strong>Chats</strong>
            <button
              type="button"
              onClick={() => setShowCreate(!showCreate)}
              aria-label="Create a private room"
            >
              <Plus size={18} />
            </button>
          </div>
          {showCreate && (
            <form
              className="chat-create"
              onSubmit={(event) => {
                event.preventDefault();
                void act("create", { scope: kind, target: roomTarget });
                setShowCreate(false);
              }}
            >
              <label>New private room</label>
              <select
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as "repo" | "org")
                }
              >
                <option value="repo">Repository</option>
                <option value="org">Organization</option>
              </select>
              <input
                value={roomTarget}
                onChange={(event) => setRoomTarget(event.target.value)}
                placeholder={
                  kind === "repo" ? "owner/repository" : "organization"
                }
                required
              />
              <button disabled={busy}>Create room</button>
            </form>
          )}
          <form
            className="chat-create"
            onSubmit={(event) => {
              event.preventDefault();
              if (dmLogin.trim())
                select({
                  scope: "dm",
                  target: dmLogin.trim().toLowerCase(),
                  label: dmLogin.trim(),
                });
            }}
          >
            <label>Direct message</label>
            <div>
              <input
                aria-label="GitHub username for direct message"
                value={dmLogin}
                onChange={(event) => setDmLogin(event.target.value)}
                placeholder="GitHub username"
                required
              />
              <button title="Open direct chat" aria-label="Open direct chat">
                <Send size={15} />
              </button>
            </div>
          </form>
          {invites.length > 0 && (
            <div className="chat-list">
              <h3>Invitations</h3>
              {invites.map((invite) => (
                <div className="chat-invite" key={invite.room_id}>
                  <strong>{invite.target}</strong>
                  <small>From {invite.owner_login}</small>
                  <div>
                    <button
                      onClick={() =>
                        void act("accept", { roomId: invite.room_id })
                      }
                      disabled={busy}
                    >
                      <Check size={13} /> Join
                    </button>
                    <button
                      onClick={() =>
                        void act("decline", { roomId: invite.room_id })
                      }
                      disabled={busy}
                    >
                      <X size={13} /> Decline
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        void requestAction("block", `id:${invite.owner_id}`)
                      }
                    >
                      Block inviter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="chat-list">
            <h3>Rooms</h3>
            {rooms.length ? (
              rooms.map((room) => (
                <button
                  className={
                    current?.scope === "room" && current.target === room.id
                      ? "active"
                      : ""
                  }
                  key={room.id}
                  onClick={() =>
                    select({
                      scope: "room",
                      target: room.id,
                      label: room.target,
                    })
                  }
                >
                  <span>{room.scope === "repo" ? "⌁" : "◈"}</span>
                  <strong>{room.target}</strong>
                  <small>Private</small>
                </button>
              ))
            ) : (
              <p>No rooms yet. Create one and invite people.</p>
            )}
          </div>
          <div className="chat-list">
            <h3>Message requests</h3>
            {requests
              .filter((item) => item.status === "pending")
              .map((item) => (
                <div className="chat-invite" key={item.id}>
                  <strong>{item.login}</strong>
                  <small>
                    {item.recipient_id === session.user.id
                      ? "Wants to chat with you"
                      : "Waiting for their reply"}
                  </small>
                  <div>
                    {item.recipient_id === session.user.id ? (
                      <>
                        <button
                          disabled={busy}
                          onClick={() =>
                            void requestAction("accept", `id:${item.id}`)
                          }
                        >
                          Accept
                        </button>
                        <button
                          disabled={busy}
                          onClick={() =>
                            void requestAction("decline", `id:${item.id}`)
                          }
                        >
                          Decline
                        </button>
                      </>
                    ) : (
                      <button
                        disabled={busy}
                        onClick={() =>
                          void requestAction("cancel", `id:${item.id}`)
                        }
                      >
                        Cancel request
                      </button>
                    )}
                    <button
                      disabled={busy}
                      onClick={() =>
                        void requestAction("block", `id:${item.id}`)
                      }
                    >
                      Block
                    </button>
                  </div>
                </div>
              ))}
          </div>
          <div className="chat-list">
            <h3>Direct messages</h3>
            {[
              ...new Map(
                [
                  ...requests.filter((item) => item.status === "accepted"),
                  ...dms.filter((item) =>
                    requests.some(
                      (request) =>
                        request.id === item.id && request.status === "accepted",
                    ),
                  ),
                ].map((item) => [item.id, item]),
              ).values(),
            ].map((dm) => (
              <button
                className={
                  current?.scope === "dm" && current.target === `id:${dm.id}`
                    ? "active"
                    : ""
                }
                key={dm.id}
                onClick={() =>
                  select({
                    scope: "dm",
                    target: `id:${dm.id}`,
                    label: dm.login,
                  })
                }
              >
                <img
                  src={`https://github.com/${dm.login}.png?size=80`}
                  alt=""
                />
                <strong>{dm.login}</strong>
              </button>
            ))}
          </div>
          {blocked.length > 0 && (
            <div className="chat-list">
              <h3>Blocked people</h3>
              {blocked.map((item) => (
                <div className="chat-invite" key={item.id}>
                  <strong>{item.login}</strong>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void requestAction("unblock", `id:${item.id}`)
                    }
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>
        <section className="chat-main">
          {current ? (
            <>
              <header className="chat-header">
                <button
                  className="chat-back"
                  type="button"
                  onClick={() => select(null)}
                  aria-label="Back to chats"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <span>
                    {current.scope === "room"
                      ? "INVITE ONLY ROOM"
                      : "DIRECT MESSAGE"}
                  </span>
                  <h2>{details?.room.target || current.label}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => void loadMessages()}
                  aria-label="Refresh messages"
                >
                  <RefreshCw size={17} />
                </button>
              </header>
              {current.scope === "dm" && (
                <div className="chat-consent">
                  <p>
                    {!consent
                      ? "Checking chat access…"
                      : consent.status === "accepted"
                        ? "Request accepted. This conversation is limited to its two participants. Verify devices below before sending encrypted messages."
                        : consent.status === "none"
                          ? "Send a request first. Messages stay locked until they accept."
                          : consent.status === "pending"
                            ? consent.incoming
                              ? "This person wants to chat. Accept or decline their request."
                              : "Request sent. Waiting for them to accept."
                            : consent.status === "blocked"
                              ? "You blocked this person."
                              : consent.status === "unavailable"
                                ? "This conversation is unavailable."
                                : "This request is closed. The original recipient can choose to start a new request."}
                  </p>
                  <div>
                    {consent?.status === "none" && (
                      <button
                        disabled={busy}
                        onClick={() => void requestAction("request")}
                      >
                        Send chat request
                      </button>
                    )}
                    {consent?.status === "pending" &&
                      (consent.incoming ? (
                        <>
                          <button
                            disabled={busy}
                            onClick={() => void requestAction("accept")}
                          >
                            Accept request
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => void requestAction("decline")}
                          >
                            Decline request
                          </button>
                        </>
                      ) : (
                        <button
                          disabled={busy}
                          onClick={() => void requestAction("cancel")}
                        >
                          Cancel request
                        </button>
                      ))}
                    {consent?.incoming &&
                      ["declined", "cancelled"].includes(consent.status) && (
                        <button
                          disabled={busy}
                          onClick={() => void requestAction("reopen")}
                        >
                          Start a new request
                        </button>
                      )}
                    {consent &&
                      !["blocked", "unavailable"].includes(consent.status) && (
                        <button
                          disabled={busy}
                          onClick={() => void requestAction("block")}
                        >
                          Block person
                        </button>
                      )}
                    {consent?.status === "blocked" && (
                      <button
                        disabled={busy}
                        onClick={() => void requestAction("unblock")}
                      >
                        Unblock person
                      </button>
                    )}
                  </div>
                </div>
              )}
              {details && (
                <div className="chat-members">
                  <span>
                    {details.members.length} members:{" "}
                    {details.members.map((item) => item.login).join(", ")}
                  </span>
                  {details.room.owner_id !== session.user.id && (
                    <button
                      type="button"
                      onClick={() =>
                        void act("leave", { roomId: details.room.id })
                      }
                    >
                      Leave
                    </button>
                  )}
                </div>
              )}
              {details?.room.owner_id === session.user.id && (
                <div className="chat-invite-form">
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void act("invite", {
                        roomId: details.room.id,
                        login: inviteLogin,
                      });
                    }}
                  >
                    <UserPlus size={16} />
                    <input
                      aria-label="Invite GitHub user"
                      value={inviteLogin}
                      onChange={(event) => setInviteLogin(event.target.value)}
                      placeholder="Invite a GitHub username"
                      required
                    />
                    <button disabled={busy}>Invite</button>
                  </form>
                  {details.invites.length > 0 && (
                    <small>
                      Pending:{" "}
                      {details.invites.map((item) => item.login).join(", ")}
                    </small>
                  )}
                  {details.members
                    .filter((item) => item.role !== "owner")
                    .map((item) => (
                      <button
                        className="chat-member-remove"
                        key={item.login}
                        onClick={() =>
                          void act("remove", {
                            roomId: details.room.id,
                            userId: item.user_id,
                          })
                        }
                      >
                        Remove {item.login}
                      </button>
                    ))}
                </div>
              )}
              <details className="legacy-history">
                <summary>Older messages · not end-to-end encrypted</summary>
                <p>
                  These were sent before encrypted chat. They remain on the
                  server until deleted.
                </p>
                <div className="chat-messages" aria-live="polite">
                  {messages.length ? (
                    messages.map((message) => (
                      <article
                        className={`chat-bubble ${message.author_id === session.user.id ? "mine" : ""}`}
                        key={message.id}
                      >
                        <img
                          src={`https://github.com/${message.author_login}.png?size=80`}
                          alt=""
                        />
                        <div>
                          <header>
                            <Link href={`/u/${message.author_login}`}>
                              {message.author_login}
                            </Link>
                            <time>
                              {new Date(
                                message.created_at.replace(" ", "T") + "Z",
                              ).toLocaleString()}
                            </time>
                          </header>
                          <p>{message.body}</p>
                          {message.author_id === session.user.id && (
                            <footer>
                              <button onClick={() => void remove(message.id)}>
                                Delete
                              </button>
                            </footer>
                          )}
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="space-empty">
                      {current.scope === "dm" && consent?.status !== "accepted"
                        ? "Messages are locked until a request is accepted."
                        : "No messages yet. Say hello."}
                    </p>
                  )}
                </div>
              </details>
              {encryptionEnabled &&
              canWrite &&
              (current.scope === "room" || current.target.startsWith("id:")) ? (
                <EncryptedChat
                  key={current.scope + ":" + current.target}
                  conversation={
                    current.scope === "room"
                      ? { scope: "room", target: current.target }
                      : {
                          scope: "dm_v2",
                          target: [session.user.id, current.target.slice(3)]
                            .sort()
                            .join(":"),
                        }
                  }
                />
              ) : (
                <p className="chat-consent">
                  {!canWrite
                    ? "Accept the request or join the room to unlock encrypted chat."
                    : "Encrypted chat is temporarily unavailable. Sending is disabled; messages will not fall back to plaintext."}
                </p>
              )}
            </>
          ) : (
            <div className="chat-welcome">
              <MessageCircle size={35} />
              <h2>Pick a conversation</h2>
              <p>
                Start a direct message or make a private room for a repository
                or organization.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
