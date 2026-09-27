"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { signIn, useSession } from "next-auth/react";
import { CheckCheck, Github, Radio, RefreshCw } from "lucide-react";
import type { FeedEvent } from "@/lib/github";
import { EventCard } from "./EventCard";

type Tab = "github" | "following" | "discover";
type Kind = "all" | "prs" | "releases" | "issues" | "commits" | "other";

const kinds: { id: Kind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "prs", label: "Pull requests" },
  { id: "releases", label: "Releases" },
  { id: "issues", label: "Issues" },
  { id: "commits", label: "Commits" },
  { id: "other", label: "Other" },
];

function eventKind(type: string): Exclude<Kind, "all"> {
  if (type === "PullRequestEvent") return "prs";
  if (type === "ReleaseEvent") return "releases";
  if (type === "IssuesEvent" || type === "IssueCommentEvent") return "issues";
  if (type === "PushEvent") return "commits";
  return "other";
}

export function FeedView(props: { discover: FeedEvent[]; authReady: boolean }) {
  const { data: session } = useSession();
  return <FeedViewSession key={session?.user?.id || "signed-out"} {...props} />;
}
function FeedViewSession({
  discover,
  authReady,
}: {
  discover: FeedEvent[];
  authReady: boolean;
}) {
  const { data: session, status } = useSession();
  const [selectedTab, setTab] = useState<Tab | null>(null);
  const tab = selectedTab || (session?.user ? "github" : "discover");
  const [personal, setPersonal] = useState<FeedEvent[] | null>(null);
  const [following, setFollowing] = useState<FeedEvent[] | null>(null);
  const [message, setMessage] = useState<{ tab: Tab; text: string } | null>(
    null,
  );
  const [kind, setKind] = useState<Kind>("all");
  const [repo, setRepo] = useState("");
  const [view, setView] = useState<"new" | "all">("new");
  const storageKey = `gitium-reviewed-${session?.user?.id || "public"}`;
  const reviewedRaw = useSyncExternalStore(
    (callback) => {
      window.addEventListener("gitium-reviewed-change", callback);
      window.addEventListener("storage", callback);
      return () => {
        window.removeEventListener("gitium-reviewed-change", callback);
        window.removeEventListener("storage", callback);
      };
    },
    () => localStorage.getItem(storageKey) || "[]",
    () => "[]",
  );
  const reviewed = useMemo(() => {
    try {
      const stored = JSON.parse(reviewedRaw);
      return new Set<string>(
        Array.isArray(stored)
          ? stored.filter((id): id is string => typeof id === "string")
          : [],
      );
    } catch {
      return new Set<string>();
    }
  }, [reviewedRaw]);

  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId || tab === "discover") return;
    let alive = true;
    fetch(`/api/feed?tab=${tab}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Could not load activity.");
        if (alive) {
          if (tab === "github") setPersonal(data.events);
          else setFollowing(data.events);
          if (data.failed)
            setMessage({
              tab,
              text: `${data.failed} account${data.failed > 1 ? "s" : ""} could not be loaded from GitHub.`,
            });
        }
      })
      .catch((problem) => {
        if (alive) {
          setMessage({
            tab,
            text:
              problem instanceof Error
                ? problem.message
                : "Could not load activity.",
          });
          if (tab === "github") setPersonal([]);
          else setFollowing([]);
        }
      });
    return () => {
      alive = false;
    };
  }, [userId, tab]);

  const current =
    tab === "github" ? personal : tab === "following" ? following : discover;
  const loading = current === null;
  const events = useMemo(() => current || [], [current]);
  const repos = useMemo(
    () => [...new Set(events.map((event) => event.repo))].sort(),
    [events],
  );
  const newCount = events.filter((event) => !reviewed.has(event.id)).length;
  const visible = events.filter(
    (event) =>
      (kind === "all" || eventKind(event.type) === kind) &&
      (!repo || event.repo === repo) &&
      (view === "all" || !reviewed.has(event.id)),
  );

  function saveReviewed(next: Set<string>) {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...next].slice(-500)));
      window.dispatchEvent(new Event("gitium-reviewed-change"));
    } catch {
      /* The queue remains usable when browser storage is blocked. */
    }
  }

  function review(id: string) {
    const next = new Set(reviewed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    saveReviewed(next);
  }

  function clearVisible() {
    saveReviewed(new Set([...reviewed, ...visible.map((event) => event.id)]));
  }

  function chooseTab(next: Tab) {
    setTab(next);
    setKind("all");
    setRepo("");
    setView("new");
  }

  return (
    <section className="feed-section" id="queue">
      <div className="feed-title-row">
        <div>
          <span className="eyebrow">
            <Radio size={12} /> ACTIVITY INBOX
          </span>
          <h2>Updates to review</h2>
        </div>
        <span className="feed-count">
          {newCount} new / {events.length} total
        </span>
      </div>
      <div className="feed-tabs" role="tablist" aria-label="Feed source">
        <button
          role="tab"
          aria-selected={tab === "github"}
          className={tab === "github" ? "active" : ""}
          onClick={() => (session ? chooseTab("github") : signIn("github"))}
          disabled={status === "loading" || (!session && !authReady)}
        >
          My GitHub
        </button>
        <button
          role="tab"
          aria-selected={tab === "following"}
          className={tab === "following" ? "active" : ""}
          onClick={() => (session ? chooseTab("following") : signIn("github"))}
          disabled={status === "loading" || (!session && !authReady)}
        >
          Following
        </button>
        <button
          role="tab"
          aria-selected={tab === "discover"}
          className={tab === "discover" ? "active" : ""}
          onClick={() => chooseTab("discover")}
        >
          Discover
        </button>
      </div>
      <div className="signal-board">
        <div className="signal-head">
          <div>
            <span>REVIEW QUEUE</span>
            <strong>
              {loading
                ? "Loading updates"
                : `${newCount} new update${newCount === 1 ? "" : "s"}`}
            </strong>
            <p>Filter what matters, then clear items as you read them.</p>
          </div>
          <button
            type="button"
            onClick={clearVisible}
            aria-label="Mark visible updates as read"
            title="Mark visible updates as read"
            disabled={
              loading ||
              visible.length === 0 ||
              visible.every((event) => reviewed.has(event.id))
            }
          >
            <CheckCheck size={16} /> Clear visible
          </button>
        </div>
        <div className="signal-kinds" aria-label="Filter by update type">
          {kinds.map((item) => (
            <button
              type="button"
              key={item.id}
              className={kind === item.id ? "active" : ""}
              aria-pressed={kind === item.id}
              onClick={() => setKind(item.id)}
            >
              <span>{item.label}</span>
              <b>
                {
                  events.filter(
                    (event) =>
                      (item.id === "all" ||
                        eventKind(event.type) === item.id) &&
                      !reviewed.has(event.id),
                  ).length
                }
              </b>
            </button>
          ))}
        </div>
        <div className="signal-controls">
          <label>
            Repository{" "}
            <select
              value={repo}
              onChange={(event) => setRepo(event.target.value)}
            >
              <option value="">All repositories</option>
              {repos.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <div className="queue-view" role="group" aria-label="Show updates">
            <button
              type="button"
              className={view === "new" ? "active" : ""}
              aria-pressed={view === "new"}
              onClick={() => setView("new")}
            >
              New
            </button>
            <button
              type="button"
              className={view === "all" ? "active" : ""}
              aria-pressed={view === "all"}
              onClick={() => setView("all")}
            >
              All
            </button>
          </div>
        </div>
      </div>
      {message?.tab === tab && (
        <div className="status-banner" role="status">
          {message.text}
        </div>
      )}
      {loading ? (
        <div className="loading-feed">
          <RefreshCw size={20} className="spin" /> Reading GitHub activity...
        </div>
      ) : visible.length ? (
        <div className="event-list">
          {visible.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              reviewed={reviewed.has(event.id)}
              onReview={() => review(event.id)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-feed">
          <span className="empty-symbol">✓</span>
          <h3>
            {events.length
              ? "Nothing left in this view"
              : tab === "following"
                ? "No updates from followed accounts yet"
                : "No updates from GitHub right now"}
          </h3>
          <p>
            {events.length
              ? "Try another category, repository, or switch to All to revisit read items."
              : tab === "following"
                ? "Follow people on GitHub or add them in Explore."
                : "GitHub may take a while to surface new events."}
          </p>
          {events.length ? (
            <button
              type="button"
              onClick={() => {
                setKind("all");
                setRepo("");
                setView("all");
              }}
            >
              Show all updates
            </button>
          ) : (
            <a href="/explore">Explore people</a>
          )}
        </div>
      )}
      {tab !== "discover" && !session && (
        <div className="feed-banner">
          <Github size={22} />
          <div>
            <strong>Log in to build your own queue.</strong>
            <p>Your timeline and follows are read directly from GitHub.</p>
          </div>
          <button onClick={() => signIn("github")}>Log in</button>
        </div>
      )}
    </section>
  );
}
