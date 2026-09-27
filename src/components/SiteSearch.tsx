"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, X } from "lucide-react";

export const SearchHost = createContext<HTMLDivElement | null>(null);
const scopes = { projects: "Projects", orgs: "Organizations", essentials: "Essentials", people: "People", code: "Code graph", accounts: "Accounts", issues: "Issues", saved: "Saved" };
type Scope = keyof typeof scopes;
function destination(scope: Scope, value = "") {
  const q = encodeURIComponent(value.trim());
  if (scope === "code") return `/code?repo=${q}`;
  if (scope === "accounts") return `/insights?login=${q}`;
  if (scope === "people") return `/search?q=${q}`;
  if (scope === "issues") return `/contribute?q=${q}`;
  if (scope === "saved") return "/saved";
  return `/explore?view=${scope}&q=${q}`;
}
type Props = { scope?: Scope; value: string; onChange: (value: string) => void; onSubmit: () => void; placeholder?: string; busy?: boolean };
export function SiteSearch({ scope = "projects", value, onChange, onSubmit, placeholder = "Search GitHub…", busy = false }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const focus = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !target.isContentEditable && !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) { event.preventDefault(); input.current?.focus(); }
    };
    window.addEventListener("keydown", focus);
    return () => window.removeEventListener("keydown", focus);
  }, []);
  return <form className="site-search" role="search" onSubmit={event => { event.preventDefault(); onSubmit(); }}>
    <Search size={17} aria-hidden="true" />
    <select aria-label="Search in" value={scope} onChange={event => router.push(destination(event.target.value as Scope))}>{Object.entries(scopes).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
    <input ref={input} aria-label="Search Gitium" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} maxLength={140} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
    {value && <button type="button" aria-label="Clear search" onClick={() => { onChange(""); input.current?.focus(); }}><X size={15} /></button>}
    <button type="submit" aria-label="Search" disabled={busy}><ArrowRight size={17} /></button>
  </form>;
}
export function PageSearch(props: Props) {
  const host = useContext(SearchHost);
  return host ? createPortal(<SiteSearch {...props} />, host) : null;
}
export function DefaultSearch({ initial = "", scope = "projects" }: { initial?: string; scope?: Scope }) {
  const [value, setValue] = useState(initial);
  const router = useRouter();
  return <SiteSearch scope={scope} value={value} onChange={setValue} onSubmit={() => router.push(destination(scope, value))} />;
}
