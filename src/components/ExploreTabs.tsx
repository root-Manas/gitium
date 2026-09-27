"use client";
import Link from "next/link";
import { Blocks, Layers, Terminal, Users } from "lucide-react";

const tabs = [
  { key: "projects", label: "Projects", href: "/explore", icon: Blocks },
  {
    key: "orgs",
    label: "Organizations",
    href: "/explore?view=orgs",
    icon: Layers,
  },
  {
    key: "essentials",
    label: "Essentials",
    href: "/explore?view=essentials",
    icon: Terminal,
  },
  {
    key: "people",
    label: "People",
    href: "/search",
    icon: Users,
  },
  {
    key: "following",
    label: "Following",
    href: "/explore/following",
    icon: Users,
  },
];
export function ExploreTabs({
  view,
  onSelect,
}: {
  view: string;
  onSelect?: (view: string) => void;
}) {
  return (
    <nav className="explore-switch" aria-label="Explore categories">
      {tabs.map(({ key, label, href, icon: Icon }) =>
        onSelect && !["following", "people"].includes(key) ? (
          <button
            key={key}
            aria-current={view === key ? "page" : undefined}
            onClick={() => onSelect(key)}
          >
            <Icon size={16} />
            {label}
          </button>
        ) : (
          <Link
            key={key}
            href={href}
            aria-current={view === key ? "page" : undefined}
          >
            <Icon size={16} />
            {label}
          </Link>
        ),
      )}
    </nav>
  );
}
