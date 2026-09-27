"use client";
import Link from "next/link";
import { DefaultSearch } from "./SiteSearch";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  Bookmark,
  Compass,
  Github,
  LogOut,
  MessageCircle,
  ChartNoAxesCombined,
  Moon,
  Sun,
  GitCommitHorizontal,
  GitPullRequest,
  MoreHorizontal,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/contribute", label: "Contribute", icon: GitPullRequest },
  { href: "/code", label: "Code graph", icon: GitCommitHorizontal },
  { href: "/insights", label: "Accounts", icon: ChartNoAxesCombined },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/spaces", label: "Messages", icon: MessageCircle },
];
export function Shell({
  children,
  authReady,
  dataReady,
  pageSearch = false,
  searchInitial = "",
  searchPeople = false,
}: {
  children: React.ReactNode;
  authReady: boolean;
  dataReady: boolean;
  pageSearch?: boolean;
  searchInitial?: string;
  searchPeople?: boolean;
}) {
  const { data: session } = useSession();
  const [more, setMore] = useState(false);
  const pathname = usePathname();
  useEffect(()=>{
    if(!more)return;
    const outside=(event:PointerEvent)=>{if(!(event.target as Element).closest('#more-navigation, [aria-controls="more-navigation"]'))setMore(false)};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setMore(false);const trigger=[...document.querySelectorAll<HTMLButtonElement>('[aria-controls="more-navigation"]')].find(el=>el.offsetParent!==null);trigger?.focus()}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)};
  },[more]);
  const active = (href: string) =>
    pathname === href ||
    (href === "/explore" &&
      (pathname.startsWith("/explore/") || pathname === "/search"));
  function toggleTheme() {
    const theme =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("gitium-theme", theme);
    } catch {}
  }
  function navLink(item: (typeof links)[number]) {
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={active(item.href) ? "active" : ""}
        aria-current={active(item.href) ? "page" : undefined}
        onClick={() => setMore(false)}
      >
        <Icon size={19} />
        <span>{item.label}</span>
      </Link>
    );
  }
  return (
    <div className="site-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/explore" className="brand" aria-label="Gitium home">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none">
                <path
                  d="M27 11H16a7 7 0 0 0-7 7v4a7 7 0 0 0 7 7h8a7 7 0 0 0 7-7v-3H20"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="28" cy="10" r="4" fill="var(--brand-accent)" />
              </svg>
            </span>
            <span>gitium</span>
          </Link>
          <div className="top-actions">
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
            >
              <Moon className="theme-moon" size={18} />
              <Sun className="theme-sun" size={18} />
            </button>
            {session?.user ? (
              <div className="account">
                <Link
                  href={`/u/${session.user.githubLogin}`}
                  aria-label="Your Gitium profile"
                >
                  <img src={session.user.image || ""} alt="" />
                  <span>{session.user.githubLogin}</span>
                </Link>
                <button onClick={() => signOut()} aria-label="Sign out">
                  <LogOut size={16} />
                </button>
              </div>
            ) : authReady ? (
              <button className="signin" onClick={() => signIn("github")}>
                <Github size={16} />
                <span className="signin-desktop">Continue with GitHub</span>
                <span className="signin-mobile">Sign in</span>
              </button>
            ) : (
              <span className="config-pill">Preview mode</span>
            )}
          </div>
        </div>
      </header>
      <div className="layout">
        <aside className="left-rail">
          <div className="rail-sticky">
            <div className="rail-section-label">Discover</div>
            <nav className="main-nav" aria-label="Main navigation">
              {links.filter((l) => l.href !== "/saved").map(navLink)}
              <button
                className={`desktop-more-trigger ${more || pathname === "/saved" ? "active" : ""}`}
                aria-expanded={more}
                aria-controls="more-navigation"
                onClick={() => setMore(!more)}
              >
                <MoreHorizontal size={19} />
                <span>More</span>
              </button>
            </nav>
            <div className="rail-footer">
              {!dataReady && (
                <p>Some account features are temporarily unavailable.</p>
              )}
              <a
                href="https://github.com/root-Manas/gitium"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github size={15} /> Gitium on GitHub ↗
              </a>
            </div>
          </div>
        </aside>
        <main className="main-column">{!pageSearch && <DefaultSearch key={searchInitial} initial={searchInitial} scope={searchPeople ? "people" : "projects"} />}{children}</main>
      </div>
      {more && (
        <div className="mobile-more" id="more-navigation">
          <div>
            <strong>More in Gitium</strong>
            <button
              onClick={() => setMore(false)}
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          </div>
          {links
            .filter((l) => ["/contribute", "/saved"].includes(l.href))
            .map(navLink)}
        </div>
      )}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {links
          .filter((l) =>
            ["/explore", "/code", "/insights", "/spaces"].includes(l.href),
          )
          .map(navLink)}
        <button
          className={more || ["/saved", "/contribute"].includes(pathname) ? "active" : ""}
          aria-expanded={more}
          aria-controls="more-navigation"
          onClick={() => setMore(!more)}
        >
          <MoreHorizontal size={19} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
