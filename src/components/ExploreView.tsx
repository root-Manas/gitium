"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Copy,
  GitFork,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { exploreLanguages, exploreTopics, essentials } from "@/lib/explore";
import type { ExploreResults } from "@/lib/explore-server";
import { ExploreTabs } from "./ExploreTabs";

type Project = {
  repo: string;
  name: string;
  category: string;
  description: string;
  source: string;
};
type Catalog = { updated: string; projects: Project[] };
const cache = new Map<string, { time: number; data: ExploreResults }>();
export function ExploreView({
  initialParams,
  initial,
}: {
  initialParams: string;
  initial: ExploreResults | null;
}) {
  const [params, setParams] = useState(initialParams);
  const filters = useMemo(() => new URLSearchParams(params), [params]);
  const view = filters.get("view") || "projects";
  const [draft, setDraft] = useState(filters.get("q") || "");
  const [results, setResults] = useState(initial);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [limit, setLimit] = useState(24);
  const [copied, setCopied] = useState(false);
  const first = useRef(true);
  const searchRef = useRef<HTMLInputElement>(null);
  function change(patch: Record<string, string>, replace = false) {
    const next = replace ? new URLSearchParams() : new URLSearchParams(params);
    next.delete("page");
    if (view === "essentials" && draft.trim() && !replace)
      next.set("q", draft.trim());
    if ("view" in patch && patch.view !== view) setResults(null);
    for (const [key, value] of Object.entries(patch))
      if (value) next.set(key, value);
      else next.delete(key);
    const value = next.toString();
    setParams(value);
    setError("");
    setLimit(24);
    if ("q" in patch) setDraft(patch.q);
    window.history.pushState(null, "", `/explore${value ? "?" + value : ""}`);
  }
  useEffect(() => {
    const onPop = () => {
      const value = window.location.search.slice(1);
      setParams(value);
      setDraft(new URLSearchParams(value).get("q") || "");
      setLimit(24);
    };
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (event.target as HTMLElement)?.tagName,
        )
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  useEffect(() => {
    if (draft === (filters.get("q") || "") || view === "essentials") return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params);
      next.delete("page");
      if (draft.trim()) next.set("q", draft.trim());
      else next.delete("q");
      setParams(next.toString());
      window.history.replaceState(null, "", "/explore?" + next);
      setError("");
    }, 700);
    return () => clearTimeout(timer);
  }, [draft, filters, params, view]);
  useEffect(() => {
    if (view !== "essentials" || catalog) return;
    const controller = new AbortController();
    fetch("/catalog/essentials.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then(setCatalog)
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Could not load the catalog. Reload to try again.");
      });
    return () => controller.abort();
  }, [view, catalog]);
  useEffect(() => {
    if (view === "essentials") {
      first.current = false;
      return;
    }
    if (first.current && initial && params === initialParams) {
      first.current = false;
      cache.set(params, { time: Date.now(), data: initial });
      return;
    }
    first.current = false;
    const controller = new AbortController();
    Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setBusy(true);
      setError("");
      try {
        const saved = cache.get(params);
        if (saved && Date.now() - saved.time < 900000) {
          setResults(saved.data);
          return;
        }
        const response = await fetch("/api/explore?" + params, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!controller.signal.aborted) {
          cache.set(params, { time: Date.now(), data });
          if (cache.size > 30) cache.delete(cache.keys().next().value!);
          setResults(data);
        }
      } catch (problem) {
        if (!controller.signal.aborted) {
          setResults(null);
          setError(
            problem instanceof Error ? problem.message : "Search unavailable.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    });
    return () => controller.abort();
  }, [params, view, initial, initialParams]);
  const allProjects = useMemo(() => {
    const picks = essentials.map((item) => ({
      repo: item.repo,
      name: item.repo.split("/")[1],
      category: item.category,
      description: item.text,
      source: "Gitium starter picks",
    }));
    const all = new Map(picks.map((item) => [item.repo.toLowerCase(), item]));
    for (const item of catalog?.projects || [])
      if (!all.has(item.repo.toLowerCase()))
        all.set(item.repo.toLowerCase(), item);
    return [...all.values()];
  }, [catalog]);
  const categories = useMemo(
    () => [...new Set(allProjects.map((item) => item.category))].sort(),
    [allProjects],
  );
  const filtered = useMemo(() => {
    const words = draft.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const category = filters.get("category");
    return allProjects.filter(
      (item) =>
        (!category || item.category === category) &&
        words.every((word) =>
          `${item.name} ${item.repo} ${item.description} ${item.category}`
            .toLowerCase()
            .includes(word),
        ),
    );
  }, [allProjects, draft, filters]);
  const activeFilters = [...filters.entries()].filter(
    ([key, value]) => !["view", "page", "sort", "q"].includes(key) && value,
  );
  async function share() {
    try {
      const url = new URL(window.location.href);
      if (view === "essentials") {
        if (draft.trim()) url.searchParams.set("q", draft.trim());
        else url.searchParams.delete("q");
      }
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy this page’s address to share your search.");
    }
  }
  return (
    <div className="wide-page explore-v2">
      <header className="explore-heading">
        <div>
          <h1>
            Find your next project<span>.</span>
          </h1>
          <p>
            Browse open-source tools, projects, and the people building them.
          </p>
        </div>
        <button className="share-search" onClick={share}>
          {copied ? <Check size={15} /> : <Copy size={15} />}{" "}
          {copied ? "Copied" : "Share search"}
        </button>
      </header>
      <div className="explore-workbench">
        <ExploreTabs
          view={view}
          onSelect={(key) => {
            setDraft("");
            change({ view: key }, true);
          }}
        />
        <div className="explore-searchbox">
          <Search size={22} />
          <input
            ref={searchRef}
            aria-label="Search Explore"
            value={draft}
            maxLength={140}
            placeholder={
              view === "essentials"
                ? "Search 1,000+ tools — backups, notes, media…"
                : view === "orgs"
                  ? "Find an organization…"
                  : "Search GitHub projects…"
            }
            onChange={(event) => {
              setDraft(event.target.value);
              setLimit(24);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") change({ q: draft });
            }}
          />
          {draft ? (
            <button aria-label="Clear search" onClick={() => change({ q: "" })}>
              <X size={18} />
            </button>
          ) : (
            <kbd>/</kbd>
          )}
        </div>
        {view === "essentials" ? (
          <div className="explore-controls">
            <label>
              Category
              <select
                aria-label="Essential category"
                value={filters.get("category") || ""}
                onChange={(event) => change({ category: event.target.value })}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <span className="explore-small">
              Instant search · no sign-in needed
            </span>
          </div>
        ) : (
          <>
            <div className="explore-controls">
              {view === "projects" && (
                <label>
                  Language
                  <select
                    aria-label="Project language"
                    value={filters.get("language") || ""}
                    onChange={(event) =>
                      change({ language: event.target.value })
                    }
                  >
                    <option value="">Any language</option>
                    {exploreLanguages.map((language) => (
                      <option key={language}>{language}</option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Sort
                <select
                  aria-label="Rank projects"
                  value={
                    filters.get("sort") ||
                    (view === "orgs" ? "followers" : "stars")
                  }
                  onChange={(event) => change({ sort: event.target.value })}
                >
                  {(view === "orgs"
                    ? [
                        ["followers", "Most followers"],
                        ["repositories", "Most repositories"],
                      ]
                    : [
                        ["stars", "Most stars"],
                        ["forks", "Most forks"],
                        ["updated", "Recently updated"],
                      ]
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {view === "projects" && (
                <button
                  aria-expanded={advanced}
                  onClick={() => setAdvanced(!advanced)}
                >
                  <SlidersHorizontal size={15} /> More filters
                </button>
              )}
            </div>
            {view === "projects" && (
              <div className="explore-chips" aria-label="Quick topics">
                {exploreTopics.map((topic) => (
                  <button
                    key={topic}
                    aria-pressed={filters.get("topic") === topic}
                    onClick={() =>
                      change({
                        topic: filters.get("topic") === topic ? "" : topic,
                      })
                    }
                  >
                    {topic.replaceAll("-", " ")}
                  </button>
                ))}
              </div>
            )}
            {advanced && view === "projects" && (
              <div className="explore-advanced">
                <label>
                  Owner
                  <input
                    aria-label="Project owner"
                    placeholder="e.g. microsoft"
                    defaultValue={filters.get("owner") || ""}
                    onKeyDown={(event) => {
                      if (event.key === "Enter")
                        change({ owner: event.currentTarget.value.trim() });
                    }}
                    onBlur={(event) => {
                      if (
                        event.target.value.trim() !==
                        (filters.get("owner") || "")
                      )
                        change({ owner: event.target.value.trim() });
                    }}
                  />
                </label>
                <label>
                  Created
                  <select
                    value={filters.get("period") || "all"}
                    onChange={(event) => change({ period: event.target.value })}
                  >
                    <option value="all">Any time</option>
                    <option value="30">Last 30 days</option>
                    <option value="365">Last year</option>
                  </select>
                </label>
              </div>
            )}
          </>
        )}
        {activeFilters.length > 0 && (
          <div className="active-filters">
            {activeFilters.map(([key, value]) => (
              <button key={key} onClick={() => change({ [key]: "" })}>
                {value} <X size={12} />
              </button>
            ))}
            <button onClick={() => change({ view, q: draft }, true)}>
              Reset filters
            </button>
          </div>
        )}
      </div>
      {error && (
        <div className="status-banner" role="alert">
          {error}{" "}
          {view !== "essentials" && (
            <button onClick={() => change({ view: "essentials" }, true)}>
              Browse Essentials
            </button>
          )}
        </div>
      )}
      {view === "essentials" ? (
        <>
          <div className="explore-results-head">
            <h2>
              {catalog
                ? `${filtered.length.toLocaleString("en-US")} useful projects`
                : "Loading the catalog…"}
            </h2>
            <span>{categories.length} categories</span>
          </div>
          <details className="catalog-attribution">
            <summary>About this collection</summary>
            <p>
              A searchable community catalog from{" "}
              <a
                href="https://github.com/awesome-selfhosted/awesome-selfhosted"
                target="_blank"
                rel="noopener noreferrer"
              >
                Awesome Selfhosted
              </a>
              , with Gitium starter picks. Project descriptions come from the
              source list; inclusion is not a security review.{" "}
              <a href="/catalog/LICENSE.txt">CC BY-SA 3.0</a>
              {catalog && ` · Snapshot ${catalog.updated}`}
            </p>
          </details>
          <div className="project-grid">
            {filtered.slice(0, limit).map((item) => (
              <article className="project-tile" key={item.repo}>
                <div className="essential-icon" aria-hidden="true">
                  <img
                    src={`https://github.com/${item.repo.split("/")[0]}.png?size=80`}
                    alt=""
                    loading="lazy"
                  />
                </div>
                <span className="tile-category">{item.category}</span>
                <h2>
                  <a
                    href={`https://github.com/${item.repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.name} <ArrowUpRight size={15} />
                  </a>
                </h2>
                <span className="tile-owner">{item.repo}</span>
                <p>{item.description}</p>
                <footer>
                  <Link href={`/code?repo=${encodeURIComponent(item.repo)}`}>
                    Explore code
                  </Link>
                  <Link
                    href={`/contribute?repo=${encodeURIComponent(item.repo)}`}
                  >
                    Find an issue <ArrowUpRight size={13} />
                  </Link>
                </footer>
              </article>
            ))}
          </div>
          {catalog && !filtered.length && (
            <div className="empty-feed">
              <h3>No tools found</h3>
              <p>Try a broader term or choose another category.</p>
            </div>
          )}
          {filtered.length > limit && (
            <button
              className="load-projects"
              onClick={() => setLimit((value) => value + 24)}
            >
              Show 24 more · {filtered.length - limit} remaining
            </button>
          )}
        </>
      ) : (
        <section aria-live="polite" aria-busy={busy}>
          <div className="explore-results-head">
            <h2>
              {busy
                ? "Searching GitHub…"
                : results
                  ? `${results.total.toLocaleString("en-US")} matches`
                  : "Results"}
            </h2>
            <span>
              {results?.incomplete
                ? "GitHub returned partial results"
                : "Public GitHub data"}
            </span>
          </div>
          <div className={`project-grid ${busy ? "is-loading" : ""}`}>
            {results?.repos.map((repo) => (
              <article className="project-tile" key={repo.id}>
                <div className="tile-top">
                  <img src={repo.owner.avatar_url} alt="" loading="lazy" />
                  <span>{repo.language || "Project"}</span>
                </div>
                <h2>
                  <a
                    href={`https://github.com/${repo.full_name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {repo.full_name.split("/")[1]} <ArrowUpRight size={15} />
                  </a>
                </h2>
                <button
                  className="tile-owner"
                  onClick={() => change({ owner: repo.owner.login })}
                >
                  {repo.owner.login}
                </button>
                <p>{repo.description || "No description provided."}</p>
                <div className="tile-stats">
                  <span>
                    <Star size={13} />{" "}
                    {repo.stargazers_count.toLocaleString("en-US")}
                  </span>
                  <span>
                    <GitFork size={13} />{" "}
                    {repo.forks_count.toLocaleString("en-US")}
                  </span>
                </div>
                <footer>
                  <Link
                    href={`/code?repo=${encodeURIComponent(repo.full_name)}`}
                  >
                    Explore code
                  </Link>
                  <Link
                    href={`/contribute?repo=${encodeURIComponent(repo.full_name)}`}
                  >
                    Find an issue <ArrowUpRight size={13} />
                  </Link>
                </footer>
              </article>
            ))}
            {results?.orgs.map((org) => (
              <article className="project-tile" key={org.id}>
                <div className="tile-top">
                  <img src={org.avatar_url} alt="" loading="lazy" />
                  <span>Organization</span>
                </div>
                <h2>{org.login}</h2>
                <p>See public projects from {org.login}.</p>
                <footer>
                  <button
                    onClick={() =>
                      change({ view: "projects", owner: org.login }, true)
                    }
                  >
                    Browse projects
                  </button>
                  <a
                    href={`https://github.com/${org.login}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub <ArrowUpRight size={13} />
                  </a>
                </footer>
              </article>
            ))}
          </div>
          {!busy && results?.total === 0 && (
            <div className="empty-feed">
              <h3>No matches yet</h3>
              <p>Try a shorter search or remove a filter.</p>
            </div>
          )}
          <div className="issue-pagination">
            <button
              disabled={busy || !results || results.page <= 1}
              onClick={() => change({ page: String((results?.page || 1) - 1) })}
            >
              Previous
            </button>
            <span>Page {results?.page || 1}</span>
            <button
              disabled={
                busy ||
                !results ||
                results.page >= 5 ||
                results.page * 18 >= results.total
              }
              onClick={() => change({ page: String((results?.page || 1) + 1) })}
            >
              Next
            </button>
          </div>
          <p className="explore-small">
            {view === "orgs"
              ? "Ranked by followers or repository count."
              : "Non-archived projects, excluding forks. Stars and forks are lifetime totals; creation filters do not measure recent growth."}{" "}
            Search results refresh about every 15 minutes.
          </p>
        </section>
      )}
    </div>
  );
}
